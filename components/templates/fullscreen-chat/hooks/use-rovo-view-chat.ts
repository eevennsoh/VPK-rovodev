"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRovoChatAsk } from "@/app/contexts/context-rovo-chat-ask";
import { useSystemPrompt } from "@/app/contexts/context-system-prompt";
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
	} = useRovoChatAsk();
	const { customPrompt } = useSystemPrompt();
	const { name: userName } = useUrlParams();
	const hasProcessedPendingPrompt = useRef(false);

	const { isListening, interimText, toggleDictation } = useSpeechRecognition({
		onFinalTranscript: (transcript) => setPrompt((prev) => prev + transcript),
	});

	useEffect(() => {
		return () => stopStreaming();
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
			customSystemPrompt: customPrompt || undefined,
		});
	}, [prompt, isChatMode, userName, customPrompt, sendPrompt]);

	const handleSuggestedQuestionClick = useCallback(
		async (question: string) => {
			if (!question.trim()) return;

			if (!isChatMode) {
				setIsChatMode(true);
			}

			await sendPrompt(question, {
				userName: userName || undefined,
				customSystemPrompt: customPrompt || undefined,
			});
		},
		[isChatMode, userName, customPrompt, sendPrompt]
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
					customSystemPrompt: customPrompt || undefined,
				});
			};

			submitPendingPrompt();
		}
	}, [pendingPrompt, userName, customPrompt, setPendingPrompt, sendPrompt]);

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
		handleSubmit,
		handleSuggestedQuestionClick,
		handleBackToStart,
		isStreaming,
	};
}
