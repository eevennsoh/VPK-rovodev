"use client";

import { useCallback, useRef, useState } from "react";
import { useSystemPrompt } from "@/app/contexts/context-system-prompt";
import { useRovoChatAsk } from "@/app/contexts/context-rovo-chat-ask";
import type { RovoUIMessage } from "@/lib/rovo-ui-messages";

interface UseChatSubmitReturn {
	prompt: string;
	setPrompt: (prompt: string) => void;
	handleSubmit: () => Promise<void>;
	submitPrompt: (prompt: string) => Promise<void>;
	abort: () => void;
	uiMessages: RovoUIMessage[];
	isStreaming: boolean;
}

export function useChatSubmit(): UseChatSubmitReturn {
	const [prompt, setPrompt] = useState("");
	const isSubmittingRef = useRef(false);
	const { customPrompt } = useSystemPrompt();
	const {
		uiMessages,
		sendPrompt,
		stopStreaming,
		isStreaming,
	} = useRovoChatAsk();

	const submitPrompt = useCallback(
		async (nextPrompt: string) => {
			const promptText = nextPrompt.trim();
			if (!promptText || isSubmittingRef.current || isStreaming) {
				return;
			}

			isSubmittingRef.current = true;
			setPrompt("");

			try {
				await sendPrompt(promptText, {
					customSystemPrompt: customPrompt || undefined,
				});
			} finally {
				isSubmittingRef.current = false;
			}
		},
		[customPrompt, isStreaming, sendPrompt]
	);

	const handleSubmit = useCallback(async () => {
		await submitPrompt(prompt);
	}, [prompt, submitPrompt]);

	const abort = useCallback(() => {
		stopStreaming();
	}, [stopStreaming]);

	return {
		prompt,
		setPrompt,
		handleSubmit,
		submitPrompt,
		abort,
		uiMessages,
		isStreaming,
	};
}
