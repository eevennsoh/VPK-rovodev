"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRovoChat } from "@/app/contexts";
import { useSpeechRecognition } from "./use-speech-recognition";
import { useUrlParams } from "./use-url-params";

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
		queuedPrompts,
		removeQueuedPrompt,
	} = useRovoChat();
	const { name: userName } = useUrlParams();
	const hasProcessedPendingPrompt = useRef(false);

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

		await sendPrompt(currentPrompt, {
			userName: userName || undefined,
		});
	}, [prompt, isChatMode, userName, sendPrompt]);

	const handleSuggestedQuestionClick = useCallback(
		async (question: string) => {
			if (!question.trim()) return;

			if (!isChatMode) {
				setIsChatMode(true);
			}

			await sendPrompt(question, {
				userName: userName || undefined,
				
			});
		},
		[isChatMode, userName, sendPrompt]
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

				await sendPrompt(promptToSubmit, {
					userName: userName || undefined,
					
				});
			};

			submitPendingPrompt();
		}
	}, [pendingPrompt, userName, setPendingPrompt, sendPrompt]);

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
		handleSubmit,
		handleSuggestedQuestionClick,
		handleBackToStart,
		isStreaming,
		stopStreaming,
	};
}
