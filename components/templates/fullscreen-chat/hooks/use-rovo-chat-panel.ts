"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useRovoChat } from "@/app/contexts";
import { useSpeechRecognition } from "./use-speech-recognition";
import { useUrlParams } from "./use-url-params";
import { useScrollAnchoring } from "@/components/templates/shared/hooks/use-scroll-anchoring";
import type { PanelVariant, Product } from "../types";
import {
	buildClarificationSummaryDisplayLabel,
	buildClarificationDismissPrompt,
	buildClarificationSummaryPrompt,
	buildClarificationSummaryRows,
	createClarificationSubmission,
	getLatestQuestionCardPayload,
	type ClarificationAnswers,
	type ParsedQuestionCardPayload,
} from "@/components/templates/shared/lib/question-card-widget";
import {
	buildGenerativeWidgetSubmitPrompt,
	type GenerativeWidgetPrimaryActionPayload,
} from "@/components/templates/shared/lib/generative-widget";

interface UseRovoChatPanelOptions {
	product: Product;
}

export function useRovoChatPanel({ product }: Readonly<UseRovoChatPanelOptions>) {
	const router = useRouter();
	const [prompt, setPrompt] = useState("");
	const [variant, setVariant] = useState<PanelVariant>("sidepanel");
	const [webResultsEnabled, setWebResultsEnabled] = useState(false);
	const [companyKnowledgeEnabled, setCompanyKnowledgeEnabled] = useState(true);
	const [selectedReasoning, setSelectedReasoning] = useState("deep-research");
	const {
		uiMessages,
		sendPrompt,
		stopStreaming,
		resetChat,
		isStreaming,
		isSubmitPending,
		queuedPrompts,
		removeQueuedPrompt,
	} = useRovoChat();
	const { name: userName } = useUrlParams();

	const [contextEnabled, setContextEnabled] = useState(
		product === "confluence" || product === "jira"
	);

	const { isListening, interimText, toggleDictation } = useSpeechRecognition({
		onFinalTranscript: (transcript) => setPrompt((prev) => prev + transcript),
	});

	const { conversationContextRef, scrollSpacerRef } = useScrollAnchoring({ uiMessages });

	useEffect(() => {
		return () => {
			void stopStreaming();
		};
	}, [stopStreaming]);

	const buildSendOptions = useCallback(() => {
		const contextDescriptions: Record<string, string> = {
			confluence: "You have context from the current Confluence page.",
			jira: "You have context from the current Jira board.",
		};
		const contextDescription = contextEnabled ? contextDescriptions[product] : undefined;

		return {
			contextDescription,
			userName: userName || undefined,
			smartGeneration: {
				enabled: true,
				surface: "fullscreen" as const,
			},
		};
	}, [contextEnabled, product, userName]);

	const handleSuggestedQuestionClick = useCallback(
		async (question: string) => {
			if (!question.trim()) return;
			await sendPrompt(question, buildSendOptions());
		},
		[sendPrompt, buildSendOptions]
	);

	const handleSubmit = useCallback(async () => {
		if (!prompt.trim()) return;

		const currentPrompt = prompt;
		setPrompt("");

		await sendPrompt(currentPrompt, buildSendOptions());
	}, [prompt, sendPrompt, buildSendOptions]);

	const handleWidgetPrimaryAction = useCallback(
		async (payload: GenerativeWidgetPrimaryActionPayload) => {
			const submitPrompt = buildGenerativeWidgetSubmitPrompt(payload);
			await sendPrompt(submitPrompt, buildSendOptions());
		},
		[buildSendOptions, sendPrompt]
	);

	const handleFullScreen = useCallback(() => {
		resetChat();
		router.push("/fullscreen-chat");
	}, [resetChat, router]);

	const activeQuestionCard = useMemo(
		() => getLatestQuestionCardPayload(uiMessages),
		[uiMessages]
	);

	const handleClarificationSubmit = useCallback(
		async (answers: ClarificationAnswers) => {
			if (!activeQuestionCard) {
				return;
			}

			const clarificationSubmission = createClarificationSubmission(
				activeQuestionCard,
				answers
			);
			const clarificationPrompt = buildClarificationSummaryPrompt(
				activeQuestionCard,
				answers
			);
			const clarificationSummary = buildClarificationSummaryRows(
				activeQuestionCard,
				answers
			);
			const displayLabel = buildClarificationSummaryDisplayLabel(
				activeQuestionCard,
				answers
			);

			await sendPrompt(clarificationPrompt, {
				...buildSendOptions(),
				messageMetadata: {
					source: "clarification-submit",
					displayLabel,
					clarificationSummary,
				},
				clarification: clarificationSubmission,
			});
		},
		[activeQuestionCard, buildSendOptions, sendPrompt]
	);

	const handleClarificationDismiss = useCallback(
		(questionCard: ParsedQuestionCardPayload) => {
			const dismissPrompt = buildClarificationDismissPrompt(questionCard);
			void sendPrompt(dismissPrompt, {
				...buildSendOptions(),
				messageMetadata: {
					source: "clarification-submit",
					visibility: "hidden",
				},
			});
		},
		[buildSendOptions, sendPrompt]
	);

	const hasChatStarted = uiMessages.some(
		(message) => message.role === "assistant" || message.role === "user"
	);

	return {
		prompt,
		setPrompt,
		variant,
		setVariant,
		uiMessages,
		userName,
		isStreaming,
		isSubmitPending,
		queuedPrompts,
		removeQueuedPrompt,
		isListening,
		interimText,
		toggleDictation,
		contextEnabled,
		setContextEnabled,
		selectedReasoning,
		setSelectedReasoning,
		webResultsEnabled,
		setWebResultsEnabled,
		companyKnowledgeEnabled,
		setCompanyKnowledgeEnabled,
		conversationContextRef,
		scrollSpacerRef,
		handleSubmit,
		handleSuggestedQuestionClick,
		handleWidgetPrimaryAction,
		handleFullScreen,
		hasChatStarted,
		activeQuestionCard,
		handleClarificationSubmit,
		handleClarificationDismiss,
		stopStreaming,
	};
}
