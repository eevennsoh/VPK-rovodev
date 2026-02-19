"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { useRovoChat } from "@/app/contexts";
import { useSpeechRecognition } from "./use-speech-recognition";
import { useUrlParams } from "./use-url-params";
import {
	buildClarificationSummaryPrompt,
	createClarificationSubmission,
	getLatestQuestionCardPayload,
	type ClarificationAnswers,
} from "@/components/templates/shared/lib/question-card-widget";

export function useRovoViewChat() {
	const [prompt, setPrompt] = useState("");
	const [isChatMode, setIsChatMode] = useState(false);
	const [webResultsEnabled, setWebResultsEnabled] = useState(false);
	const [companyKnowledgeEnabled, setCompanyKnowledgeEnabled] = useState(true);
	const [selectedReasoning, setSelectedReasoning] = useState("deep-research");
	const [contextEnabled, setContextEnabled] = useState(false);

	const {
		uiMessages,
		pendingPrompt,
		setPendingPrompt,
		sendPrompt,
		stopStreaming,
		resetChat,
		isStreaming,
		isSubmitPending,
		queuedPrompts,
		removeQueuedPrompt,
	} = useRovoChat();
	const { name: userName } = useUrlParams();
	const hasProcessedPendingPrompt = useRef(false);

	const buildSendOptions = useCallback(
		() => ({
			userName: userName || undefined,
			smartGeneration: {
				enabled: true,
				surface: "fullscreen" as const,
			},
		}),
		[userName]
	);

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

			await sendPrompt(clarificationPrompt, {
				...buildSendOptions(),
				messageMetadata: {
					source: "clarification-submit",
					visibility: "hidden",
				},
				clarification: clarificationSubmission,
			});
		},
		[activeQuestionCard, buildSendOptions, sendPrompt]
	);

	const { isListening, interimText, toggleDictation } = useSpeechRecognition({
		onFinalTranscript: (transcript) => setPrompt((prev) => prev + transcript),
	});

	useEffect(() => {
		return () => {
			void stopStreaming();
		};
	}, [stopStreaming]);

	const handleSubmit = useCallback(async () => {
		if (!prompt.trim()) return;

		if (!isChatMode) {
			setIsChatMode(true);
		}

		const currentPrompt = prompt;
		setPrompt("");

		await sendPrompt(currentPrompt, buildSendOptions());
	}, [prompt, isChatMode, sendPrompt, buildSendOptions]);

	const handleSuggestedQuestionClick = useCallback(
		async (question: string) => {
			if (!question.trim()) return;

			if (!isChatMode) {
				setIsChatMode(true);
			}

			await sendPrompt(question, buildSendOptions());
		},
		[isChatMode, sendPrompt, buildSendOptions]
	);

	const handleBackToStart = useCallback(() => {
		resetChat();
		setPrompt("");
		setIsChatMode(false);
	}, [resetChat]);

	// Handle pending prompt from external navigation
	useEffect(() => {
		if (pendingPrompt && !hasProcessedPendingPrompt.current) {
			hasProcessedPendingPrompt.current = true;

			const submitPendingPrompt = async () => {
				if (!pendingPrompt.trim()) return;

				setIsChatMode(true);

				const promptToSubmit = pendingPrompt;
				setPendingPrompt(null);

				await sendPrompt(promptToSubmit, buildSendOptions());
			};

			submitPendingPrompt();
		}
	}, [pendingPrompt, setPendingPrompt, sendPrompt, buildSendOptions]);

	return {
		prompt,
		setPrompt,
		isChatMode,
		uiMessages,
		userName,
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
		queuedPrompts,
		removeQueuedPrompt,
		activeQuestionCard,
		handleSubmit,
		handleSuggestedQuestionClick,
		handleBackToStart,
		isStreaming,
		isSubmitPending,
		handleClarificationSubmit,
		stopStreaming,
	};
}
