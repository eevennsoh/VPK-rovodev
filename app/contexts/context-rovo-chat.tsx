"use client";

import {
	createContext,
	use,
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
	type ReactNode,
} from "react";
import { useChat } from "@ai-sdk/react";
import { API_ENDPOINTS } from "@/lib/api-config";
import {
	createAssistantTextMessage,
	type RovoMessageMetadata,
	type RovoUIMessage,
} from "@/lib/rovo-ui-messages";
import {
	isRateLimitError,
	getRateLimitRetryCountdownMessage,
	getRateLimitUserMessage,
	RATE_LIMIT_MAX_RETRIES,
	RATE_LIMIT_RETRY_DELAY_MS,
} from "@/lib/chat-error-utils";
import { DefaultChatTransport } from "ai";

interface SendPromptOptions {
	contextDescription?: string;
	userName?: string;
	messageMetadata?: RovoMessageMetadata;
}

type RovoUIMessagePart = RovoUIMessage["parts"][number];

function isValidRovoUiMessagePart(part: unknown): part is RovoUIMessagePart {
	return (
		typeof part === "object" &&
		part !== null &&
		typeof (part as { type?: unknown }).type === "string"
	);
}

function sanitizeRovoUiMessages(
	messages: ReadonlyArray<RovoUIMessage>
): RovoUIMessage[] {
	let hasChanged = false;

	const nextMessages = messages.map((message) => {
		const nextParts = Array.isArray(message.parts)
			? message.parts.filter(isValidRovoUiMessagePart)
			: [];

		if (nextParts.length !== message.parts.length) {
			hasChanged = true;
			return { ...message, parts: nextParts };
		}

		return message;
	});

	return hasChanged ? nextMessages : (messages as RovoUIMessage[]);
}

function isInvalidPartStateError(error: unknown): boolean {
	return (
		error instanceof TypeError &&
		typeof error.message === "string" &&
		error.message.includes("reading 'state'")
	);
}

interface RovoChatContextType {
	isOpen: boolean;
	toggleChat: () => void;
	closeChat: () => void;
	uiMessages: RovoUIMessage[];
	sendPrompt: (prompt: string, options?: SendPromptOptions) => Promise<void>;
	stopStreaming: () => void;
	clearSuggestedQuestions: () => void;
	resetChat: () => void;
	isStreaming: boolean;
	pendingPrompt: string | null;
	setPendingPrompt: (prompt: string | null) => void;
}

const RovoChatContext = createContext<RovoChatContextType | undefined>(undefined);

function extractErrorMessageFromValue(value: unknown): string | null {
	if (typeof value === "string") {
		const trimmed = value.trim();
		return trimmed.length > 0 ? trimmed : null;
	}

	if (!value || typeof value !== "object") {
		return null;
	}

	const record = value as {
		error?: unknown;
		message?: unknown;
		details?: unknown;
	};

	return (
		extractErrorMessageFromValue(record.error) ??
		extractErrorMessageFromValue(record.message) ??
		extractErrorMessageFromValue(record.details)
	);
}

function toUserFacingChatErrorMessage(rawMessage?: string): string {
	const fallback = "Sorry, I hit an error. Please try again.";
	const directMessage = extractErrorMessageFromValue(rawMessage);
	if (!directMessage) {
		return fallback;
	}

	try {
		const parsed = JSON.parse(directMessage) as unknown;
		return extractErrorMessageFromValue(parsed) ?? directMessage;
	} catch {
		return directMessage;
	}
}

export function RovoChatProvider({ children }: { children: ReactNode }) {
	const [isOpen, setIsOpen] = useState(false);
	const [pendingPrompt, setPendingPrompt] = useState<string | null>(null);
	const [submissionErrorMessage, setSubmissionErrorMessage] =
		useState<RovoUIMessage | null>(null);
	const errorCounterRef = useRef(0);
	const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const retryCountdownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(
		null
	);
	const retryCountRef = useRef(0);
	const lastPromptRef = useRef<{
		text: string;
		options?: SendPromptOptions;
	} | null>(null);

	const clearRetryCountdownInterval = useCallback(() => {
		if (retryCountdownIntervalRef.current !== null) {
			clearInterval(retryCountdownIntervalRef.current);
			retryCountdownIntervalRef.current = null;
		}
	}, []);

	const cancelRetryTimer = useCallback(() => {
		if (retryTimerRef.current !== null) {
			clearTimeout(retryTimerRef.current);
			retryTimerRef.current = null;
		}
		clearRetryCountdownInterval();
	}, [clearRetryCountdownInterval]);

	const startRetryCountdown = useCallback(
		(errorMessageId: string) => {
			clearRetryCountdownInterval();
			let secondsRemaining = Math.ceil(RATE_LIMIT_RETRY_DELAY_MS / 1000);

			setSubmissionErrorMessage(
				createAssistantTextMessage(
					errorMessageId,
					getRateLimitRetryCountdownMessage(secondsRemaining)
				)
			);

			retryCountdownIntervalRef.current = setInterval(() => {
				secondsRemaining -= 1;
				if (secondsRemaining <= 0) {
					clearRetryCountdownInterval();
					return;
				}

				setSubmissionErrorMessage(
					createAssistantTextMessage(
						errorMessageId,
						getRateLimitRetryCountdownMessage(secondsRemaining)
					)
				);
			}, 1000);
		},
		[clearRetryCountdownInterval]
	);

	useEffect(() => cancelRetryTimer, [cancelRetryTimer]);

	const transport = useMemo(
		() =>
			new DefaultChatTransport<RovoUIMessage>({
				api: API_ENDPOINTS.CHAT_SDK,
			}),
		[]
	);
	const {
		messages: rawUiMessages,
		sendMessage,
		setMessages,
		stop,
		status,
	} = useChat<RovoUIMessage>({
		transport,
		onError: (error) => {
			errorCounterRef.current += 1;
			const errorMessageId = `error-${errorCounterRef.current}`;

			if (isRateLimitError(error.message)) {
				const currentRetry = retryCountRef.current;

				if (currentRetry < RATE_LIMIT_MAX_RETRIES && lastPromptRef.current) {
					startRetryCountdown(errorMessageId);

					const saved = lastPromptRef.current;
					retryTimerRef.current = setTimeout(async () => {
						retryTimerRef.current = null;
						clearRetryCountdownInterval();
						setSubmissionErrorMessage(null);
						setMessages((prev) => {
							const lastUserIndex = prev.findLastIndex(
								(m) => m.role === "user"
							);
							if (lastUserIndex === -1) {
								return prev;
							}
							return prev.filter((_, i) => i !== lastUserIndex);
						});
						retryCountRef.current += 1;
						await stop();
						try {
							await sendMessage(
								{
									text: saved.text,
									metadata: saved.options?.messageMetadata,
								},
								{
									body: {
										contextDescription: saved.options?.contextDescription,
										userName: saved.options?.userName,
									},
								}
							);
						} catch (error) {
							if (!isInvalidPartStateError(error)) {
								throw error;
							}

							setMessages((prev) => sanitizeRovoUiMessages(prev));
							await Promise.resolve();
							await sendMessage(
								{
									text: saved.text,
									metadata: saved.options?.messageMetadata,
								},
								{
									body: {
										contextDescription: saved.options?.contextDescription,
										userName: saved.options?.userName,
									},
								}
							);
						}
					}, RATE_LIMIT_RETRY_DELAY_MS);
				} else {
					retryCountRef.current = 0;
					clearRetryCountdownInterval();
					setSubmissionErrorMessage(
						createAssistantTextMessage(
							errorMessageId,
							getRateLimitUserMessage(RATE_LIMIT_MAX_RETRIES)
						)
					);
				}
				return;
			}

			clearRetryCountdownInterval();
			setSubmissionErrorMessage(
				createAssistantTextMessage(
					errorMessageId,
					toUserFacingChatErrorMessage(error.message)
				)
			);
		},
	});
	const uiMessages = useMemo(() => {
		if (!submissionErrorMessage) {
			return rawUiMessages;
		}

		const hasErrorMessage = rawUiMessages.some(
			(message) => message.id === submissionErrorMessage.id
		);
		if (hasErrorMessage) {
			return rawUiMessages;
		}

		return [...rawUiMessages, submissionErrorMessage];
	}, [rawUiMessages, submissionErrorMessage]);

	const toggleChat = useCallback(() => setIsOpen((prev) => !prev), []);
	const closeChat = useCallback(() => setIsOpen(false), []);
	const resetChat = useCallback(() => {
		cancelRetryTimer();
		retryCountRef.current = 0;
		lastPromptRef.current = null;
		setMessages([]);
		setSubmissionErrorMessage(null);
	}, [cancelRetryTimer, setMessages]);
	const clearSuggestedQuestions = useCallback(() => {
		setMessages((prev) =>
			sanitizeRovoUiMessages(prev).map((message) => {
				if (message.role !== "assistant") {
					return message;
				}

				return {
					...message,
					parts: message.parts.filter(
						(part) => part.type !== "data-suggested-questions"
					),
				};
			})
		);
	}, [setMessages]);
	const sendPrompt = useCallback(
		async (prompt: string, options?: SendPromptOptions) => {
			const trimmedPrompt = prompt.trim();
			if (!trimmedPrompt) {
				return;
			}

			cancelRetryTimer();
			retryCountRef.current = 0;
			lastPromptRef.current = { text: trimmedPrompt, options };

			await stop();
			clearSuggestedQuestions();
			setSubmissionErrorMessage(null);
			try {
				await sendMessage(
					{
						text: trimmedPrompt,
						metadata: options?.messageMetadata,
					},
					{
						body: {
							contextDescription: options?.contextDescription,
							userName: options?.userName,
						},
					}
				);
			} catch (error) {
				if (!isInvalidPartStateError(error)) {
					throw error;
				}

				setMessages((prev) => sanitizeRovoUiMessages(prev));
				await Promise.resolve();
				await sendMessage(
					{
						text: trimmedPrompt,
						metadata: options?.messageMetadata,
					},
					{
						body: {
							contextDescription: options?.contextDescription,
							userName: options?.userName,
						},
					}
				);
			}
		},
		[cancelRetryTimer, clearSuggestedQuestions, sendMessage, setMessages, stop]
	);

	const setPendingPromptValue = useCallback((prompt: string | null) => {
		setPendingPrompt(prompt);
	}, []);

	return (
		<RovoChatContext
			value={{
				isOpen,
				toggleChat,
				closeChat,
				uiMessages,
				sendPrompt,
				stopStreaming: stop,
				clearSuggestedQuestions,
				resetChat,
				isStreaming: status === "submitted" || status === "streaming",
				pendingPrompt,
				setPendingPrompt: setPendingPromptValue,
			}}
		>
			{children}
		</RovoChatContext>
	);
}

export function useRovoChat() {
	const context = use(RovoChatContext);
	if (context === undefined) {
		throw new Error("useRovoChat must be used within a RovoChatProvider");
	}
	return context;
}
