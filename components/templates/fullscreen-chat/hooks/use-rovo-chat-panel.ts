"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useRovoChatAsk } from "@/app/contexts/context-rovo-chat-ask";
import { useSystemPrompt } from "@/app/contexts/context-system-prompt";
import { useSpeechRecognition } from "./use-speech-recognition";
import { useUrlParams } from "./use-url-params";
import { useScrollAnchoring } from "@/components/templates/shared/hooks/use-scroll-anchoring";
import type { PanelVariant, Product } from "../types";

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
	const { uiMessages, sendPrompt, stopStreaming, resetChat, isStreaming } = useRovoChatAsk();
	const { customPrompt } = useSystemPrompt();
	const { name: userName } = useUrlParams();

	const [contextEnabled, setContextEnabled] = useState(
		product === "confluence" || product === "jira"
	);

	const { isListening, interimText, toggleDictation } = useSpeechRecognition({
		onFinalTranscript: (transcript) => setPrompt((prev) => prev + transcript),
	});

	const { conversationContextRef, scrollSpacerRef } = useScrollAnchoring({ uiMessages });

	useEffect(() => {
		return () => stopStreaming();
	}, [stopStreaming]);

	const buildSendOptions = useCallback(() => {
		const contextDescription = (() => {
			if (!contextEnabled) return undefined;
			if (product === "confluence") return "You have context from the current Confluence page.";
			if (product === "jira") return "You have context from the current Jira board.";
			return undefined;
		})();

		return {
			contextDescription,
			userName: userName || undefined,
			customSystemPrompt: customPrompt || undefined,
		};
	}, [contextEnabled, product, userName, customPrompt]);

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

	const handleFullScreen = useCallback(() => {
		resetChat();
		router.push("/fullscreen-chat");
	}, [resetChat, router]);

	const hasChatStarted = useMemo(
		() => uiMessages.some((message) => message.role === "assistant" || message.role === "user"),
		[uiMessages]
	);

	return {
		prompt,
		setPrompt,
		variant,
		setVariant,
		uiMessages,
		userName,
		isStreaming,
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
		handleFullScreen,
		hasChatStarted,
	};
}
