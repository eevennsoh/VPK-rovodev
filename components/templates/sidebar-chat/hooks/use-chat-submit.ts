"use client";

import { useCallback, useRef, useState } from "react";
import { useRovoChat } from "@/app/contexts";
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
	const {
		uiMessages,
		sendPrompt,
		stopStreaming,
		isStreaming,
	} = useRovoChat();

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
					
				});
			} finally {
				isSubmittingRef.current = false;
			}
		},
		[isStreaming, sendPrompt]
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
