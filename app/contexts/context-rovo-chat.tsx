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

export interface SendPromptOptions {
	contextDescription?: string;
	userName?: string;
	messageMetadata?: RovoMessageMetadata;
	clarification?: unknown;
	approval?: unknown;
}

export interface QueuedPromptItem {
	id: string;
	text: string;
	options?: SendPromptOptions;
	createdAt: number;
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
	queuedPrompts: ReadonlyArray<QueuedPromptItem>;
	activePrompt: QueuedPromptItem | null;
	removeQueuedPrompt: (id: string) => void;
	clearQueuedPrompts: () => void;
	queueCount: number;
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

function createQueueItemId(fallbackCounter: number): string {
	if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
		return crypto.randomUUID();
	}

	return `queue-${Date.now()}-${fallbackCounter}`;
}

export function RovoChatProvider({ children }: { children: ReactNode }) {
	const [isOpen, setIsOpen] = useState(false);
	const [pendingPrompt, setPendingPrompt] = useState<string | null>(null);
	const [submissionErrorMessage, setSubmissionErrorMessage] =
		useState<RovoUIMessage | null>(null);
	const [queuedPrompts, setQueuedPrompts] = useState<QueuedPromptItem[]>([]);
	const [activePrompt, setActivePrompt] = useState<QueuedPromptItem | null>(null);

	const errorCounterRef = useRef(0);
	const queueIdRef = useRef(0);
	const queuedPromptsRef = useRef<QueuedPromptItem[]>([]);
	const activePromptRef = useRef<QueuedPromptItem | null>(null);
	const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const retryCountdownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(
		null
	);
	const retryCountRef = useRef(0);
	const lastPromptRef = useRef<{
		text: string;
		options?: SendPromptOptions;
	} | null>(null);
	const isStreamingRef = useRef(false);
	const isDispatchingPromptRef = useRef(false);
	const hasActivePromptStreamedRef = useRef(false);
	const shouldFinalizeActivePromptRef = useRef(false);
	const maybeFinalizeAndProcessRef = useRef<() => void>(() => {});
	const processNextPromptRef = useRef<() => Promise<void>>(async () => {});

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

	const queueTick = useCallback(() => {
		Promise.resolve().then(() => {
			maybeFinalizeAndProcessRef.current();
		});
	}, []);

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
				const activeQueuedPrompt = activePromptRef.current;

				if (currentRetry < RATE_LIMIT_MAX_RETRIES && activeQueuedPrompt) {
					startRetryCountdown(errorMessageId);

					const saved = {
						text: activeQueuedPrompt.text,
						options: activeQueuedPrompt.options,
					};
					lastPromptRef.current = saved;

					retryTimerRef.current = setTimeout(async () => {
						retryTimerRef.current = null;
						clearRetryCountdownInterval();
						setSubmissionErrorMessage(null);
						setMessages((prev) => {
							const lastUserIndex = prev.findLastIndex((m) => m.role === "user");
							if (lastUserIndex === -1) {
								return prev;
							}
							return prev.filter((_, i) => i !== lastUserIndex);
						});
						retryCountRef.current += 1;
						shouldFinalizeActivePromptRef.current = false;
						isDispatchingPromptRef.current = true;

						try {
							if (isStreamingRef.current) {
								await stop();
							}
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
											hasQueuedPrompts: queuedPromptsRef.current.length > 0,
										},
									}
								);
							} catch (sendError) {
								if (!isInvalidPartStateError(sendError)) {
									throw sendError;
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
											hasQueuedPrompts: queuedPromptsRef.current.length > 0,
										},
									}
								);
							}
						} catch (retryError) {
							shouldFinalizeActivePromptRef.current = true;
							console.error("[RovoChatProvider] Retry send failed:", retryError);
						} finally {
							isDispatchingPromptRef.current = false;
							queueTick();
						}
					}, RATE_LIMIT_RETRY_DELAY_MS);
					return;
				}

				retryCountRef.current = 0;
				clearRetryCountdownInterval();
				setSubmissionErrorMessage(
					createAssistantTextMessage(
						errorMessageId,
						getRateLimitUserMessage(RATE_LIMIT_MAX_RETRIES)
					)
				);
				shouldFinalizeActivePromptRef.current = true;
				queueTick();
				return;
			}

			clearRetryCountdownInterval();
			setSubmissionErrorMessage(
				createAssistantTextMessage(
					errorMessageId,
					toUserFacingChatErrorMessage(error.message)
				)
			);
			shouldFinalizeActivePromptRef.current = true;
			queueTick();
		},
	});

	const isStreaming = status === "submitted" || status === "streaming";

	useEffect(() => {
		isStreamingRef.current = isStreaming;
		if (isStreaming && activePromptRef.current) {
			hasActivePromptStreamedRef.current = true;
		}
		if (!isStreaming) {
			queueTick();
		}
	}, [isStreaming, queueTick]);

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

	const sendChatMessage = useCallback(
		async (promptItem: QueuedPromptItem) => {
			lastPromptRef.current = {
				text: promptItem.text,
				options: promptItem.options,
			};
			retryCountRef.current = 0;
			setSubmissionErrorMessage(null);
			clearSuggestedQuestions();

			if (isStreamingRef.current) {
				await stop();
			}
			try {
				await sendMessage(
					{
						text: promptItem.text,
						metadata: promptItem.options?.messageMetadata,
					},
					{
						body: {
							contextDescription: promptItem.options?.contextDescription,
							userName: promptItem.options?.userName,
							hasQueuedPrompts: queuedPromptsRef.current.length > 0,
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
						text: promptItem.text,
						metadata: promptItem.options?.messageMetadata,
					},
					{
						body: {
							contextDescription: promptItem.options?.contextDescription,
							userName: promptItem.options?.userName,
							hasQueuedPrompts: queuedPromptsRef.current.length > 0,
						},
					}
				);
			}
		},
		[clearSuggestedQuestions, sendMessage, setMessages, stop]
	);

	const finalizeActivePrompt = useCallback(() => {
		if (!activePromptRef.current) {
			return;
		}

		activePromptRef.current = null;
		setActivePrompt(null);
		hasActivePromptStreamedRef.current = false;
		shouldFinalizeActivePromptRef.current = false;
		retryCountRef.current = 0;
		lastPromptRef.current = null;
	}, []);

	const maybeFinalizeAndProcess = useCallback(() => {
		const hasActivePrompt = activePromptRef.current !== null;

		if (hasActivePrompt) {
			const canFinalizeFromStreamEnd =
				hasActivePromptStreamedRef.current && !isStreamingRef.current;
			const canFinalizeFromError =
				shouldFinalizeActivePromptRef.current && !isStreamingRef.current;

			if (
				(canFinalizeFromStreamEnd || canFinalizeFromError) &&
				retryTimerRef.current === null &&
				!isDispatchingPromptRef.current
			) {
				finalizeActivePrompt();
			}
		}

		if (!activePromptRef.current) {
			void processNextPromptRef.current();
		}
	}, [finalizeActivePrompt]);

	useEffect(() => {
		maybeFinalizeAndProcessRef.current = maybeFinalizeAndProcess;
	}, [maybeFinalizeAndProcess]);

	const processNextPrompt = useCallback(async () => {
		if (
			activePromptRef.current ||
			isDispatchingPromptRef.current ||
			isStreamingRef.current ||
			retryTimerRef.current !== null
		) {
			return;
		}

		const nextPrompt = queuedPromptsRef.current[0];
		if (!nextPrompt) {
			return;
		}

		queuedPromptsRef.current = queuedPromptsRef.current.slice(1);
		setQueuedPrompts((prev) => prev.slice(1));
		activePromptRef.current = nextPrompt;
		setActivePrompt(nextPrompt);
		hasActivePromptStreamedRef.current = false;
		shouldFinalizeActivePromptRef.current = false;

		isDispatchingPromptRef.current = true;
		try {
			await sendChatMessage(nextPrompt);
		} catch (error) {
			shouldFinalizeActivePromptRef.current = true;
			console.error("[RovoChatProvider] Failed to send queued prompt:", error);
		} finally {
			isDispatchingPromptRef.current = false;
			if (!isStreamingRef.current && retryTimerRef.current === null) {
				queueTick();
			}
		}
	}, [queueTick, sendChatMessage]);

	useEffect(() => {
		processNextPromptRef.current = processNextPrompt;
	}, [processNextPrompt]);

	useEffect(() => {
		queuedPromptsRef.current = queuedPrompts;
		queueTick();
	}, [queuedPrompts, queueTick]);

	useEffect(() => {
		activePromptRef.current = activePrompt;
	}, [activePrompt]);

	const sendPrompt = useCallback(
		async (prompt: string, options?: SendPromptOptions) => {
			const trimmedPrompt = prompt.trim();
			if (!trimmedPrompt) {
				return;
			}

			const id = createQueueItemId(queueIdRef.current);
			queueIdRef.current += 1;

			setQueuedPrompts((prev) => [
				...prev,
				{
					id,
					text: trimmedPrompt,
					options,
					createdAt: Date.now(),
				},
			]);
		},
		[]
	);

	const removeQueuedPrompt = useCallback((id: string) => {
		setQueuedPrompts((prev) => prev.filter((prompt) => prompt.id !== id));
	}, []);

	const clearQueuedPrompts = useCallback(() => {
		setQueuedPrompts([]);
	}, []);

	const stopStreaming = useCallback(() => {
		if (activePromptRef.current) {
			shouldFinalizeActivePromptRef.current = true;
		}
		void stop();
		// Belt-and-suspenders: explicitly tell the backend to cancel the RovoDev
		// stream. The primary cancellation path is req.on("close") → AbortSignal,
		// but this handles edge cases where the SSE close event is delayed.
		fetch(API_ENDPOINTS.CHAT_CANCEL, { method: "POST" }).catch(() => {});
		queueTick();
	}, [queueTick, stop]);

	const resetChat = useCallback(() => {
		cancelRetryTimer();
		retryCountRef.current = 0;
		lastPromptRef.current = null;
		queuedPromptsRef.current = [];
		activePromptRef.current = null;
		hasActivePromptStreamedRef.current = false;
		shouldFinalizeActivePromptRef.current = false;
		isDispatchingPromptRef.current = false;
		setQueuedPrompts([]);
		setActivePrompt(null);
		setMessages([]);
		setSubmissionErrorMessage(null);
	}, [cancelRetryTimer, setMessages]);

	const setPendingPromptValue = useCallback((prompt: string | null) => {
		setPendingPrompt(prompt);
	}, []);

	const queueCount = queuedPrompts.length;

	return (
		<RovoChatContext
			value={{
				isOpen,
				toggleChat,
				closeChat,
				uiMessages,
				sendPrompt,
				stopStreaming,
				clearSuggestedQuestions,
				resetChat,
				isStreaming,
				pendingPrompt,
				setPendingPrompt: setPendingPromptValue,
				queuedPrompts,
				activePrompt,
				removeQueuedPrompt,
				clearQueuedPrompts,
				queueCount,
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
