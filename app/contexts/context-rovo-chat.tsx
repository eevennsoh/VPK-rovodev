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
	planMode?: boolean;
	planRequestId?: string;
	creationMode?: "skill" | "agent";
	smartGeneration?: {
		enabled?: boolean;
		surface?: string;
		containerWidthPx?: number;
		viewportWidthPx?: number;
		widthClass?: "compact" | "regular" | "wide";
	};
}

export interface QueuedPromptItem {
	id: string;
	text: string;
	options?: SendPromptOptions;
	createdAt: number;
}

type RovoUIMessagePart = RovoUIMessage["parts"][number];
const INLINE_DATA_PLACEHOLDER = "[inline data omitted]";
const CHAT_REQUEST_MAX_BYTES = 4 * 1024 * 1024;
const CHAT_REQUEST_MIN_MESSAGES = 8;

function isValidRovoUiMessagePart(part: unknown): part is RovoUIMessagePart {
	return (
		typeof part === "object" &&
		part !== null &&
		typeof (part as { type?: unknown }).type === "string"
	);
}

function isDataUrl(value: string): boolean {
	return /^data:[^,]+,/i.test(value);
}

function sanitizeValueForTransport(value: unknown): unknown {
	if (typeof value === "string") {
		return isDataUrl(value) ? INLINE_DATA_PLACEHOLDER : value;
	}

	if (Array.isArray(value)) {
		let hasChanged = false;
		const next = value.map((item) => {
			const sanitized = sanitizeValueForTransport(item);
			if (sanitized !== item) {
				hasChanged = true;
			}
			return sanitized;
		});
		return hasChanged ? next : value;
	}

	if (!value || typeof value !== "object") {
		return value;
	}

	let hasChanged = false;
	const record = value as Record<string, unknown>;
	const nextRecord: Record<string, unknown> = {};
	for (const [key, item] of Object.entries(record)) {
		const sanitized = sanitizeValueForTransport(item);
		nextRecord[key] = sanitized;
		if (sanitized !== item) {
			hasChanged = true;
		}
	}

	return hasChanged ? nextRecord : value;
}

function sanitizeMessagePartForTransport(part: RovoUIMessagePart): RovoUIMessagePart | null {
	if (part.type === "file" && isDataUrl(part.url)) {
		return null;
	}

	return sanitizeValueForTransport(part) as RovoUIMessagePart;
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

function sanitizeMessagesForTransport(
	messages: ReadonlyArray<RovoUIMessage>
): RovoUIMessage[] {
	let hasChanged = false;

	const nextMessages = messages.map((message) => {
		const nextParts: RovoUIMessagePart[] = [];
		let messageChanged = false;
		const messageParts = Array.isArray(message.parts) ? message.parts : [];

		for (const part of messageParts) {
			const sanitizedPart = sanitizeMessagePartForTransport(part);
			if (!sanitizedPart) {
				hasChanged = true;
				messageChanged = true;
				continue;
			}
			if (sanitizedPart !== part) {
				hasChanged = true;
				messageChanged = true;
			}
			nextParts.push(sanitizedPart);
		}

		if (!messageChanged) {
			return message;
		}

		return { ...message, parts: nextParts };
	});

	return hasChanged ? nextMessages : (messages as RovoUIMessage[]);
}

function estimateChatRequestBytes(
	messages: ReadonlyArray<RovoUIMessage>,
	body: Record<string, unknown>
): number {
	try {
		const json = JSON.stringify({
			...body,
			messages,
		});
		return new TextEncoder().encode(json).byteLength;
	} catch {
		return Number.POSITIVE_INFINITY;
	}
}

function trimMessagesForRequestSize(
	messages: ReadonlyArray<RovoUIMessage>,
	body: Record<string, unknown>
): { messages: RovoUIMessage[]; trimmed: boolean } {
	if (messages.length <= CHAT_REQUEST_MIN_MESSAGES) {
		return {
			messages: [...messages],
			trimmed: false,
		};
	}

	const nextMessages = [...messages];
	let trimmed = false;
	while (
		nextMessages.length > CHAT_REQUEST_MIN_MESSAGES &&
		estimateChatRequestBytes(nextMessages, body) > CHAT_REQUEST_MAX_BYTES
	) {
		nextMessages.shift();
		trimmed = true;
	}

	return {
		messages: nextMessages,
		trimmed,
	};
}

function isInvalidPartStateError(error: unknown): boolean {
	return (
		error instanceof TypeError &&
		typeof error.message === "string" &&
		error.message.includes("reading 'state'")
	);
}

function isPayloadTooLargeError(rawMessage?: string): boolean {
	const extractedMessage = extractErrorMessageFromValue(rawMessage);
	if (!extractedMessage) {
		return false;
	}

	const normalized = extractedMessage.toLowerCase();
	return (
		normalized.includes("payloadtoolargeerror") ||
		normalized.includes("payload too large") ||
		normalized.includes("entity too large") ||
		normalized.includes("request entity too large") ||
		normalized.includes("request payload too large")
	);
}

function getPayloadTooLargeUserMessage(): string {
	return "I couldn't process that request because the chat payload is too large (usually from inline image/file history). I trimmed oversized history data, so you can continue chatting.";
}

interface RovoChatContextType {
	isOpen: boolean;
	toggleChat: () => void;
	closeChat: () => void;
	uiMessages: RovoUIMessage[];
	sendPrompt: (prompt: string, options?: SendPromptOptions) => Promise<void>;
	stopStreaming: () => Promise<void>;
	clearSuggestedQuestions: () => void;
	resetChat: () => void;
	replaceMessages: (messages: ReadonlyArray<RovoUIMessage>) => void;
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
	const isCancellingRef = useRef(false);
	const cancelStreamPromiseRef = useRef<Promise<void> | null>(null);
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
				prepareSendMessagesRequest: ({ messages, body }) => {
					const normalizedMessages = sanitizeRovoUiMessages(messages);
					const sanitizedMessages = sanitizeMessagesForTransport(normalizedMessages);
					const sanitizedBody = sanitizeValueForTransport(
						(body ?? {}) as Record<string, unknown>
					) as Record<string, unknown>;
					const { messages: trimmedMessages, trimmed } = trimMessagesForRequestSize(
						sanitizedMessages,
						sanitizedBody
					);

					return {
						body: {
							...sanitizedBody,
							messages: trimmedMessages,
							payloadTrimmed: trimmed,
						},
					};
				},
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
											clarification: saved.options?.clarification,
											approval: saved.options?.approval,
											planMode: saved.options?.planMode,
											planRequestId: saved.options?.planRequestId,
											creationMode: saved.options?.creationMode,
											smartGeneration: saved.options?.smartGeneration,
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
											clarification: saved.options?.clarification,
											approval: saved.options?.approval,
											planMode: saved.options?.planMode,
											planRequestId: saved.options?.planRequestId,
											creationMode: saved.options?.creationMode,
											smartGeneration: saved.options?.smartGeneration,
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
			const userFacingErrorMessage = toUserFacingChatErrorMessage(error.message);
			if (
				isPayloadTooLargeError(error.message) ||
				isPayloadTooLargeError(userFacingErrorMessage)
			) {
				setMessages((prev) =>
					sanitizeMessagesForTransport(sanitizeRovoUiMessages(prev))
				);
				setSubmissionErrorMessage(
					createAssistantTextMessage(
						errorMessageId,
						getPayloadTooLargeUserMessage()
					)
				);
				shouldFinalizeActivePromptRef.current = true;
				queueTick();
				return;
			}

			setSubmissionErrorMessage(
				createAssistantTextMessage(
					errorMessageId,
					userFacingErrorMessage
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
							clarification: promptItem.options?.clarification,
							approval: promptItem.options?.approval,
							planMode: promptItem.options?.planMode,
							planRequestId: promptItem.options?.planRequestId,
							creationMode: promptItem.options?.creationMode,
							smartGeneration: promptItem.options?.smartGeneration,
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
							clarification: promptItem.options?.clarification,
							approval: promptItem.options?.approval,
							planMode: promptItem.options?.planMode,
							planRequestId: promptItem.options?.planRequestId,
							creationMode: promptItem.options?.creationMode,
							smartGeneration: promptItem.options?.smartGeneration,
							hasQueuedPrompts: queuedPromptsRef.current.length > 0,
						},
					}
				);
			}
		},
		[sendMessage, setMessages, stop]
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
				!isDispatchingPromptRef.current &&
				!isCancellingRef.current
			) {
				finalizeActivePrompt();
			}
		}

		if (!activePromptRef.current && !isCancellingRef.current) {
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
			isCancellingRef.current ||
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

	const cancelCurrentStream = useCallback(async () => {
		if (cancelStreamPromiseRef.current) {
			await cancelStreamPromiseRef.current;
			return;
		}

		const cancelPromise = (async () => {
			try {
				await stop();
			} catch (error) {
				console.error("[RovoChatProvider] Failed to stop chat stream:", error);
			}

			// Belt-and-suspenders: explicitly tell the backend to cancel the RovoDev
			// stream. The primary cancellation path is req.on("close") → AbortSignal,
			// but this handles edge cases where the SSE close event is delayed.
			try {
				await fetch(API_ENDPOINTS.CHAT_CANCEL, { method: "POST" });
			} catch {
				// Ignore cancel endpoint errors — the stream may have already ended.
			}
		})();

		cancelStreamPromiseRef.current = cancelPromise;
		try {
			await cancelPromise;
		} finally {
			cancelStreamPromiseRef.current = null;
		}
	}, [stop]);

	const stopStreaming = useCallback(async () => {
		if (activePromptRef.current) {
			shouldFinalizeActivePromptRef.current = true;
		}

		isCancellingRef.current = true;
		try {
			await cancelCurrentStream();
		} finally {
			isCancellingRef.current = false;
			queueTick();
		}
	}, [cancelCurrentStream, queueTick]);

	const resetChat = useCallback(() => {
		isCancellingRef.current = true;
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

		void cancelCurrentStream().finally(() => {
			// Old stream chunks can still arrive briefly while cancellation settles.
			// Clear message state one more time so the next session starts clean.
			setMessages([]);
			setSubmissionErrorMessage(null);
			isCancellingRef.current = false;
			queueTick();
		});
	}, [cancelCurrentStream, cancelRetryTimer, queueTick, setMessages]);

	const replaceMessages = useCallback(
		(messages: ReadonlyArray<RovoUIMessage>) => {
			isCancellingRef.current = false;
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
			setSubmissionErrorMessage(null);
			setMessages(sanitizeRovoUiMessages([...messages]));
			queueTick();
		},
		[cancelRetryTimer, queueTick, setMessages]
	);

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
				replaceMessages,
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
