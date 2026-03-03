"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRovoChat } from "@/app/contexts";
import type { QueuedPromptItem } from "@/app/contexts";
import { useCreationModeState, useCreationModeActions } from "@/app/contexts/context-creation-mode";
import type { CreationMode } from "@/app/contexts/context-creation-mode";
import { API_ENDPOINTS } from "@/lib/api-config";
import {
	getMessageText,
	type RovoUIMessage,
} from "@/lib/rovo-ui-messages";
import {
	buildClarificationSummaryDisplayLabel,
	getLatestQuestionCardPayload,
	buildClarificationDismissPrompt,
	buildClarificationSummaryRows,
	type ClarificationSubmission,
	type ParsedQuestionCardPayload,
} from "@/components/templates/shared/lib/question-card-widget";
import {
	buildPlanApprovalPrompt,
	getPlanApprovalKeyFromSubmission,
	type PlanApprovalDecision,
	type PlanApprovalSubmission,
} from "@/components/templates/shared/lib/plan-approval";
import {
	buildGenerativeWidgetSubmitPrompt,
	type GenerativeWidgetPrimaryActionPayload,
} from "@/components/templates/shared/lib/generative-widget";
import { getLatestPlanWidgetPayload } from "@/components/templates/shared/lib/plan-widget";
import {
	PLAN_MODE_CONTEXT_DESCRIPTION,
	PLAN_MODE_POST_CLARIFICATION_CONTEXT_DESCRIPTION,
	PLAN_MODE_RETRY_PROMPT,
} from "../lib/plan-mode";
import type { ChatHistoryItem } from "../components/sidebar-chat-history";
import {
	PLAN_THREAD_RETENTION_LIMIT,
	createThreadFromPrompt,
	deleteThread,
	getThreadById,
	sortThreadsByUpdatedAtDesc,
	trimTitleText,
	type PlanThread,
	updateThreadMessages,
	updateThreadTitle,
	upsertThreadSnapshot,
} from "../lib/thread-store";
import {
	persistThreadToServer,
	updateThreadOnServer,
	deleteThreadOnServer,
	fetchAITitle,
	deriveTitleFromAssistantMessage,
	updateUrlThreadParam,
	areMessageArraysShallowEqual,
	createPlanRequestId,
} from "../lib/thread-api";

type PlanningPhase = "awaiting-plan" | "retrying-missing-plan";
const PLAN_MODE_SOURCE = "plan-toggle" as const;

interface PlanningSession {
	requestId: string;
	phase: PlanningPhase;
	hasStreamStarted: boolean;
	retryUsed: boolean;
}

interface UsePlanChatReturn {
	prompt: string;
	setPrompt: (value: string) => void;
	isPlanMode: boolean;
	togglePlanMode: () => void;
	isChatMode: boolean;
	isStreaming: boolean;
	isSubmitPending: boolean;
	stopStreaming: () => Promise<void>;
	isGeneratingTitle: boolean;
	pendingTitleChatId: string | null;
	uiMessages: RovoUIMessage[];
	queuedPrompts: ReadonlyArray<QueuedPromptItem>;
	removeQueuedPrompt: (id: string) => void;
	chatHistory: ChatHistoryItem[];
	activeChatId: string | null;
	handleSubmit: () => Promise<void>;
	handleSuggestedQuestionClick: (question: string) => Promise<void>;
	handleWidgetPrimaryAction: (
		payload: GenerativeWidgetPrimaryActionPayload
	) => Promise<void>;
	submitClarification: (
		promptText: string,
		clarification: ClarificationSubmission,
		questionCard?: ParsedQuestionCardPayload
	) => Promise<void>;
	dismissClarification: (
		questionCard: ParsedQuestionCardPayload
	) => Promise<void>;
	submitPlanApproval: (approval: PlanApprovalSubmission) => Promise<void>;
	sendAgentDirective: (agentName: string, message: string) => Promise<void>;
	handleNewChat: () => void;
	handleSelectChat: (id: string) => void;
	handleDeleteChat: (id: string) => void;
	handleDeleteMessage: (messageId: string) => void;
	appendPlanApprovalMarker: (options: {
		decision: PlanApprovalDecision;
		planApprovalPlanKey?: string | null;
		threadId?: string | null;
	}) => Promise<void>;
}

export function usePlanChat(): UsePlanChatReturn {
	const [prompt, setPrompt] = useState("");
	const [isPlanMode, setIsPlanMode] = useState(false);
	const [planningSession, setPlanningSession] =
		useState<PlanningSession | null>(null);
	const [isChatMode, setIsChatMode] = useState(false);
	const [threads, setThreads] = useState<PlanThread[]>([]);
	const [activeChatId, setActiveChatId] = useState<string | null>(null);
	const [isGeneratingTitle, setIsGeneratingTitle] = useState(false);
	const [pendingTitleChatId, setPendingTitleChatId] = useState<string | null>(null);
	const pendingTitleChatIdRef = useRef<string | null>(null);
	const activeChatIdRef = useRef<string | null>(null);
	const uiMessagesRef = useRef<RovoUIMessage[]>([]);
	const threadsRef = useRef<PlanThread[]>([]);
	const isRestoringThreadRef = useRef(false);
	const threadTransitionTokenRef = useRef(0);
	const threadTransitionQueueRef = useRef<Promise<void>>(Promise.resolve());
	const {
		uiMessages,
		isStreaming,
		isSubmitPending,
		sendPrompt,
		stopStreaming,
		replaceMessages,
		queuedPrompts,
		removeQueuedPrompt,
	} = useRovoChat();

	const { mode: creationMode } = useCreationModeState();
	const { clearCreationMode } = useCreationModeActions();
	const creationModeRef = useRef<CreationMode>(null);
	creationModeRef.current = creationMode;

	useEffect(() => {
		return () => {
			void stopStreaming();
		};
	}, [stopStreaming]);

	// Sync activeChatId to URL query param
	useEffect(() => {
		updateUrlThreadParam(isChatMode ? activeChatId : null);
	}, [activeChatId, isChatMode]);

	// Restore active thread from URL on mount once threads are loaded
	const hasRestoredFromUrlRef = useRef(false);
	useEffect(() => {
		if (hasRestoredFromUrlRef.current || threads.length === 0) {
			return;
		}
		hasRestoredFromUrlRef.current = true;

		if (typeof window === "undefined") {
			return;
		}
		const params = new URLSearchParams(window.location.search);
		const threadId = params.get("thread");
		if (!threadId) {
			return;
		}

		const thread = getThreadById({ threads, chatId: threadId });
		if (!thread) {
			// Thread not found — clean up the stale URL param
			updateUrlThreadParam(null);
			return;
		}

		replaceMessages(thread.messages);
		setActiveChatId(threadId);
		setIsChatMode(true);
	}, [threads, replaceMessages]);

	const pendingTitleMessageRef = useRef<string | null>(null);
	const hasStreamedOnceRef = useRef(false);

	const chatHistory = useMemo<ChatHistoryItem[]>(
		() =>
			threads.map((thread) => ({
				id: thread.id,
				title: thread.title,
			})),
		[threads],
	);

	useEffect(() => {
		if (typeof window === "undefined") {
			return;
		}

		let cancelled = false;
		fetch(API_ENDPOINTS.chatThreads())
			.then((response) => {
				if (!response.ok) {
					throw new Error(`HTTP ${response.status}`);
				}

				return response.json() as Promise<{ threads?: unknown[] }>;
			})
			.then((data) => {
				if (cancelled) {
					return;
				}

				const serverThreads = Array.isArray(data.threads)
					? (data.threads
							.map((raw) => {
								if (
									!raw ||
									typeof raw !== "object" ||
									!("id" in raw) ||
									typeof (raw as Record<string, unknown>).id !== "string"
								) {
									return null;
								}

								const record = raw as Record<string, unknown>;
								const createdAt =
									typeof record.createdAt === "string"
										? Date.parse(record.createdAt)
										: typeof record.createdAt === "number"
											? record.createdAt
											: Date.now();
								const updatedAt =
									typeof record.updatedAt === "string"
										? Date.parse(record.updatedAt)
										: typeof record.updatedAt === "number"
											? record.updatedAt
											: createdAt;

								return {
									id: record.id as string,
									title:
										typeof record.title === "string"
											? record.title
											: "New chat",
									messages: Array.isArray(record.messages)
										? (record.messages as RovoUIMessage[])
										: [],
									createdAt: Number.isFinite(createdAt)
										? createdAt
										: Date.now(),
									updatedAt: Number.isFinite(updatedAt)
										? updatedAt
										: Date.now(),
								} satisfies PlanThread;
							})
							.filter(Boolean) as PlanThread[])
					: [];

				setThreads((previousThreads) =>
					previousThreads.length > 0
						? previousThreads
						: sortThreadsByUpdatedAtDesc(serverThreads)
				);
			})
			.catch(() => {
				// Silently fall back to empty thread list on server error
			});

		return () => {
			cancelled = true;
		};
	}, []);

	useEffect(() => {
		activeChatIdRef.current = activeChatId;
	}, [activeChatId]);

	useEffect(() => {
		uiMessagesRef.current = uiMessages;
	}, [uiMessages]);

	useEffect(() => {
		threadsRef.current = threads;
	}, [threads]);

	const enqueueThreadTransition = useCallback(
		(operation: () => Promise<void>) => {
			const runTransition = async () => {
				const transitionToken = threadTransitionTokenRef.current + 1;
				threadTransitionTokenRef.current = transitionToken;
				isRestoringThreadRef.current = true;

				try {
					await operation();
				} finally {
					if (threadTransitionTokenRef.current === transitionToken) {
						isRestoringThreadRef.current = false;
					}
				}
			};

			const queuedTransition = threadTransitionQueueRef.current.then(
				runTransition,
				runTransition,
			);
			threadTransitionQueueRef.current = queuedTransition.catch(() => undefined);
			return queuedTransition;
		},
		[],
	);

	const snapshotThreadMessages = useCallback(
		(chatId: string | null, messages: ReadonlyArray<RovoUIMessage>) => {
			if (!chatId) {
				return;
			}

			setThreads((previousThreads) => {
				const currentThread = getThreadById({
					threads: previousThreads,
					chatId,
				});
				if (!currentThread) {
					return previousThreads;
				}

				if (areMessageArraysShallowEqual(currentThread.messages, messages)) {
					return previousThreads;
				}

				return updateThreadMessages({
					threads: previousThreads,
					chatId,
					messages,
					updatedAt: Date.now(),
					maxThreads: PLAN_THREAD_RETENTION_LIMIT,
				});
			});

			updateThreadOnServer(chatId, {
				messages: [...messages],
				updatedAt: new Date().toISOString(),
			});
		},
		[],
	);

	const transitionChatState = useCallback(
		(options: {
			nextChatId: string | null;
			nextMessages: ReadonlyArray<RovoUIMessage>;
			nextIsChatMode: boolean;
			snapshotCurrent?: boolean;
			clearPrompt?: boolean;
		}) => {
			const {
				nextChatId,
				nextMessages,
				nextIsChatMode,
				snapshotCurrent = true,
				clearPrompt = true,
			} = options;

			return enqueueThreadTransition(async () => {
				if (snapshotCurrent) {
					snapshotThreadMessages(activeChatIdRef.current, uiMessagesRef.current);
				}

				await stopStreaming();
				replaceMessages(nextMessages);
				if (clearPrompt) {
					setPrompt("");
				}
				setPlanningSession(null);
				setIsChatMode(nextIsChatMode);
				setActiveChatId(nextChatId);
			});
		},
		[enqueueThreadTransition, replaceMessages, snapshotThreadMessages, stopStreaming],
	);

	useEffect(() => {
		if (isRestoringThreadRef.current || !activeChatId) {
			return;
		}

		const scheduledTransitionToken = threadTransitionTokenRef.current;
		queueMicrotask(() => {
			if (isRestoringThreadRef.current) {
				return;
			}
			if (scheduledTransitionToken !== threadTransitionTokenRef.current) {
				return;
			}
			if (activeChatIdRef.current !== activeChatId) {
				return;
			}

			snapshotThreadMessages(activeChatId, uiMessagesRef.current);
		});
	}, [activeChatId, snapshotThreadMessages, uiMessages]);

	const resolveChatTitle = useCallback((chatId: string, title: string) => {
		const normalizedTitle = trimTitleText(title);
		if (!normalizedTitle) {
			return;
		}

		setThreads((previousThreads) =>
			updateThreadTitle({
				threads: previousThreads,
				chatId,
				title: normalizedTitle,
				updatedAt: Date.now(),
				maxThreads: PLAN_THREAD_RETENTION_LIMIT,
			})
		);

		updateThreadOnServer(chatId, {
			title: normalizedTitle,
			updatedAt: new Date().toISOString(),
		});

		if (pendingTitleChatIdRef.current === chatId) {
			pendingTitleChatIdRef.current = null;
			setPendingTitleChatId(null);
			setIsGeneratingTitle(false);
		}
	}, []);

	const resolveFallbackTitle = useCallback(
		(chatId: string): boolean => {
			const assistantMessageWithText = uiMessagesRef.current.find((message) => {
				if (message.role !== "assistant") {
					return false;
				}

				return getMessageText(message).length > 0;
			});

			if (!assistantMessageWithText) {
				return false;
			}

			const assistantText = getMessageText(assistantMessageWithText);
			const fallbackTitle = deriveTitleFromAssistantMessage(assistantText);
			if (!fallbackTitle) {
				return false;
			}

			resolveChatTitle(chatId, fallbackTitle);
			return true;
		},
		[resolveChatTitle],
	);

	const createChatEntry = useCallback((firstMessage: string) => {
		// Prevent the URL-restore effect from firing after we create a new thread.
		// Without this, the restore effect sees the new thread (with empty messages)
		// and calls replaceMessages([]), wiping out the in-progress stream.
		hasRestoredFromUrlRef.current = true;
		const thread = createThreadFromPrompt({
			promptText: firstMessage,
		});
		setThreads((previousThreads) =>
			upsertThreadSnapshot({
				threads: previousThreads,
				thread,
				maxThreads: PLAN_THREAD_RETENTION_LIMIT,
			})
		);
		setActiveChatId(thread.id);
		setIsGeneratingTitle(true);
		setPendingTitleChatId(thread.id);
		pendingTitleChatIdRef.current = thread.id;
		pendingTitleMessageRef.current = firstMessage;
		hasStreamedOnceRef.current = false;
		persistThreadToServer(thread);
		return thread.id;
	}, []);

	// Track when streaming has started at least once so we don't fire title
	// generation before the stream begins (isStreaming may still be false on the
	// first render after sendMessage is called).
	useEffect(() => {
		if (isStreaming) {
			hasStreamedOnceRef.current = true;
		}
	}, [isStreaming]);

	// Generate title via API after streaming completes to avoid 409 race with RovoDev Serve
	useEffect(() => {
		if (isStreaming || !pendingTitleChatId || !pendingTitleMessageRef.current) {
			return;
		}

		// Don't fire until streaming has started and finished at least once
		if (!hasStreamedOnceRef.current) {
			return;
		}

		const isTitleStillPending = pendingTitleChatIdRef.current === pendingTitleChatId;
		if (!isTitleStillPending) {
			return;
		}

		const chatId = pendingTitleChatId;
		const message = pendingTitleMessageRef.current;

		const titleDelay = setTimeout(() => {
			pendingTitleMessageRef.current = null;
			void fetchAITitle(message).then((aiTitle) => {
				if (aiTitle) {
					resolveChatTitle(chatId, aiTitle);
					return;
				}

				if (resolveFallbackTitle(chatId)) {
					return;
				}

				// Clear generating state so the sidebar doesn't stay in skeleton loading
				if (pendingTitleChatIdRef.current === chatId) {
					pendingTitleChatIdRef.current = null;
					setPendingTitleChatId(null);
					setIsGeneratingTitle(false);
				}
			});
		}, 2000);

		return () => clearTimeout(titleDelay);
	}, [isStreaming, pendingTitleChatId, resolveChatTitle, resolveFallbackTitle]);

	const setPlanModeEnabled = useCallback((enabled: boolean) => {
		setIsPlanMode(enabled);
		if (!enabled) {
			setPlanningSession(null);
		}
	}, []);

	const sendAgentsPrompt = useCallback(
		async (nextPrompt: string) => {
			if (!nextPrompt.trim()) {
				return;
			}

			const activeCreationMode = creationModeRef.current;

			if (isPlanMode) {
				const requestId = createPlanRequestId();
				setPlanningSession({
					requestId,
					phase: "awaiting-plan",
					hasStreamStarted: false,
					retryUsed: false,
				});

				await sendPrompt(nextPrompt, {
					contextDescription: PLAN_MODE_CONTEXT_DESCRIPTION,
					planMode: true,
					planModeSource: PLAN_MODE_SOURCE,
					planRequestId: requestId,
					creationMode: activeCreationMode ?? undefined,
				});
				if (activeCreationMode) {
					clearCreationMode();
				}
				return;
			}

			await sendPrompt(nextPrompt, {
				creationMode: activeCreationMode ?? undefined,
			});
			if (activeCreationMode) {
				clearCreationMode();
			}
		},
		[isPlanMode, sendPrompt, clearCreationMode],
	);

	useEffect(() => {
		if (!planningSession) {
			return;
		}

		if (isStreaming) {
			if (!planningSession.hasStreamStarted) {
				queueMicrotask(() => {
					setPlanningSession((previousSession) => {
						if (!previousSession || previousSession.hasStreamStarted) {
							return previousSession;
						}

						return {
							...previousSession,
							hasStreamStarted: true,
						};
					});
				});
			}
			return;
		}

		if (!planningSession.hasStreamStarted) {
			return;
		}

		const latestPlanWidget = getLatestPlanWidgetPayload(uiMessages);
		const hasGeneratedPlan = Boolean(
			latestPlanWidget && latestPlanWidget.tasks.length > 0
		);
		const isAwaitingClarificationAnswers =
			getLatestQuestionCardPayload(uiMessages) !== null;

		if (hasGeneratedPlan) {
			queueMicrotask(() => {
				setPlanModeEnabled(false);
			});
			return;
		}

		if (isAwaitingClarificationAnswers) {
			return;
		}

		if (planningSession.retryUsed) {
			queueMicrotask(() => {
				setPlanModeEnabled(false);
			});
			return;
		}

		const retryRequestId = planningSession.requestId;
		queueMicrotask(() => {
			setPlanningSession((previousSession) => {
				if (!previousSession) {
					return previousSession;
				}

				return {
					...previousSession,
					phase: "retrying-missing-plan",
					retryUsed: true,
					hasStreamStarted: false,
				};
			});
		});

		void sendPrompt(PLAN_MODE_RETRY_PROMPT, {
			contextDescription: PLAN_MODE_POST_CLARIFICATION_CONTEXT_DESCRIPTION,
			planMode: true,
			planModeSource: PLAN_MODE_SOURCE,
			planRequestId: retryRequestId,
			messageMetadata: {
				visibility: "hidden",
				source: "plan-retry",
			},
		});
	}, [
		planningSession,
		isStreaming,
		sendPrompt,
		setPlanModeEnabled,
		uiMessages,
	]);

	const submitClarification = useCallback(
		async (
			promptText: string,
			clarification: ClarificationSubmission,
			questionCard?: ParsedQuestionCardPayload
		) => {
			if (!promptText.trim()) {
				return;
			}

			const summaryRows = questionCard
				? buildClarificationSummaryRows(questionCard, clarification.answers)
				: [];
			const displayLabel = questionCard
				? buildClarificationSummaryDisplayLabel(questionCard, clarification.answers)
				: "Requirements captured.";

			await sendPrompt(promptText, {
				contextDescription: isPlanMode
					? PLAN_MODE_POST_CLARIFICATION_CONTEXT_DESCRIPTION
					: undefined,
				planMode: isPlanMode || undefined,
				planModeSource: isPlanMode
					? PLAN_MODE_SOURCE
					: undefined,
				planRequestId: planningSession?.requestId,
				clarification,
				messageMetadata: {
					source: "clarification-submit",
					displayLabel,
					clarificationSummary: summaryRows,
				},
			});
		},
		[planningSession?.requestId, isPlanMode, sendPrompt],
	);

	const dismissClarification = useCallback(
		async (questionCard: ParsedQuestionCardPayload) => {
			const dismissPrompt = buildClarificationDismissPrompt(questionCard);
			await sendPrompt(dismissPrompt, {
				contextDescription: isPlanMode
					? PLAN_MODE_POST_CLARIFICATION_CONTEXT_DESCRIPTION
					: undefined,
				planMode: isPlanMode || undefined,
				planModeSource: isPlanMode
					? PLAN_MODE_SOURCE
					: undefined,
				planRequestId: planningSession?.requestId,
				messageMetadata: {
					visibility: "hidden",
					source: "clarification-submit",
				},
			});
		},
		[planningSession?.requestId, isPlanMode, sendPrompt],
	);

	const submitPlanApproval = useCallback(
		async (approval: PlanApprovalSubmission) => {
			const approvalPrompt = buildPlanApprovalPrompt(approval).trim();
			if (!approvalPrompt) {
				return;
			}
			const planApprovalPlanKey = getPlanApprovalKeyFromSubmission(approval);

			await sendPrompt(approvalPrompt, {
				approval,
				messageMetadata: {
					visibility: "hidden",
					source: "plan-approval-submit",
					planApprovalDecision: approval.decision,
					planApprovalPlanKey: planApprovalPlanKey ?? undefined,
				},
			});
		},
		[sendPrompt],
	);

	const sendAgentDirective = useCallback(
		async (agentName: string, message: string) => {
			const trimmed = message.trim();
			if (!trimmed) {
				return;
			}

			await sendPrompt(`@${agentName}: ${trimmed}`, {
				messageMetadata: {
					visibility: "hidden",
					source: "agent-directive",
				},
			});
		},
		[sendPrompt],
	);

	const handleSubmit = useCallback(async () => {
		if (!prompt.trim()) {
			return;
		}

		if (isPlanMode && planningSession !== null) {
			return;
		}

		const currentPrompt = prompt;
		setPrompt("");

		if (!isChatMode || activeChatIdRef.current === null) {
			setIsChatMode(true);
			createChatEntry(currentPrompt);
		}

		await sendAgentsPrompt(currentPrompt);
	}, [
		prompt,
		isPlanMode,
		planningSession,
		isChatMode,
		sendAgentsPrompt,
		createChatEntry,
	]);

	const handleSuggestedQuestionClick = useCallback(
		async (question: string) => {
			if (!question.trim()) {
				return;
			}

			if (isPlanMode && planningSession !== null) {
				return;
			}

			if (!isChatMode || activeChatIdRef.current === null) {
				setIsChatMode(true);
				createChatEntry(question);
			}

			await sendAgentsPrompt(question);
		},
		[
			isPlanMode,
			planningSession,
			isChatMode,
			sendAgentsPrompt,
			createChatEntry,
		],
	);

	const handleWidgetPrimaryAction = useCallback(
		async (payload: GenerativeWidgetPrimaryActionPayload) => {
			const submitPrompt = buildGenerativeWidgetSubmitPrompt(payload);
			if (!submitPrompt.trim()) {
				return;
			}

			if (!isChatMode || activeChatIdRef.current === null) {
				setIsChatMode(true);
				createChatEntry(submitPrompt);
			}

			await sendAgentsPrompt(submitPrompt);
		},
		[createChatEntry, isChatMode, sendAgentsPrompt],
	);

	const clearPendingTitleState = useCallback(() => {
		setIsGeneratingTitle(false);
		setPendingTitleChatId(null);
		pendingTitleChatIdRef.current = null;
		pendingTitleMessageRef.current = null;
		hasStreamedOnceRef.current = false;
	}, []);

	const handleNewChat = useCallback(() => {
		void transitionChatState({
			nextChatId: null,
			nextMessages: [],
			nextIsChatMode: false,
		})
			.catch((error) => {
				console.error("[AGENTS-TEAM] Failed to start new chat:", error);
			})
			.finally(() => {
				clearPendingTitleState();
			});
	}, [clearPendingTitleState, transitionChatState]);

	const handleSelectChat = useCallback(
		(id: string) => {
			if (activeChatIdRef.current === id) {
				return;
			}

			const selectedThread = getThreadById({
				threads: threadsRef.current,
				chatId: id,
			});
			if (!selectedThread) {
				return;
			}

			void transitionChatState({
				nextChatId: id,
				nextMessages: selectedThread.messages,
				nextIsChatMode: true,
			}).catch((error) => {
				console.error("[AGENTS-TEAM] Failed to switch chat thread:", error);
			});
		},
		[transitionChatState],
	);

	const handleDeleteChat = useCallback(
		(id: string) => {
			setThreads((previousThreads) =>
				deleteThread({
					threads: previousThreads,
					chatId: id,
				})
			);

			deleteThreadOnServer(id);

			if (pendingTitleChatIdRef.current === id) {
				clearPendingTitleState();
			}

			// If deleting the active chat, go back to composer
			if (activeChatIdRef.current === id) {
				void transitionChatState({
					nextChatId: null,
					nextMessages: [],
					nextIsChatMode: false,
					snapshotCurrent: false,
				})
					.catch((error) => {
						console.error("[AGENTS-TEAM] Failed to clear deleted chat:", error);
					})
					.finally(() => {
						clearPendingTitleState();
					});
			}
		},
		[clearPendingTitleState, transitionChatState],
	);

	const handleDeleteMessage = useCallback(
		(messageId: string) => {
			const currentMessages = uiMessagesRef.current;
			const messageIndex = currentMessages.findIndex((m) => m.id === messageId);
			if (messageIndex < 0) {
				return;
			}

			const remainingMessages = currentMessages.slice(0, messageIndex);

			if (remainingMessages.length === 0) {
				const chatId = activeChatIdRef.current;
				if (chatId) {
					setThreads((prev) => deleteThread({ threads: prev, chatId }));
					deleteThreadOnServer(chatId);
					if (pendingTitleChatIdRef.current === chatId) {
						clearPendingTitleState();
					}
				}

				void transitionChatState({
					nextChatId: null,
					nextMessages: [],
					nextIsChatMode: false,
					snapshotCurrent: false,
				})
					.catch((error) => {
						console.error("[AGENTS-TEAM] Failed to remove final message:", error);
					})
					.finally(() => {
						clearPendingTitleState();
					});
			} else {
				const activeChatForSnapshot = activeChatIdRef.current;
				void transitionChatState({
					nextChatId: activeChatForSnapshot,
					nextMessages: remainingMessages,
					nextIsChatMode: true,
					snapshotCurrent: false,
					clearPrompt: false,
				})
					.then(() => {
						snapshotThreadMessages(activeChatForSnapshot, remainingMessages);
					})
					.catch((error) => {
						console.error("[AGENTS-TEAM] Failed to delete message:", error);
					});
			}
		},
		[clearPendingTitleState, snapshotThreadMessages, transitionChatState],
	);

	const appendPlanApprovalMarker = useCallback(
		async (options: {
			decision: PlanApprovalDecision;
			planApprovalPlanKey?: string | null;
			threadId?: string | null;
		}) => {
			const targetThreadId = options.threadId ?? activeChatIdRef.current;
			if (!targetThreadId) {
				return;
			}

			const planApprovalPlanKey = options.planApprovalPlanKey ?? null;
			let shouldPersistUpdate = false;
			let nextMessages: RovoUIMessage[] | null = null;
			setThreads((previousThreads) => {
				const thread = getThreadById({
					threads: previousThreads,
					chatId: targetThreadId,
				});
				if (!thread) {
					return previousThreads;
				}

				const hasMatchingMarker = thread.messages.some((message) => {
					if (message.role !== "user") {
						return false;
					}

					if (message.metadata?.source !== "plan-approval-submit") {
						return false;
					}

					return (
						message.metadata?.planApprovalDecision === options.decision &&
						message.metadata?.planApprovalPlanKey === planApprovalPlanKey
					);
				});
				if (hasMatchingMarker) {
					return previousThreads;
				}

				const approvalMarkerMessage: RovoUIMessage = {
					id: `approval-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
					role: "user",
					parts: [
						{
							type: "text",
							text: "Plan approval submitted.",
							state: "done",
						},
					],
					metadata: {
						visibility: "hidden",
						source: "plan-approval-submit",
						planApprovalDecision: options.decision,
						planApprovalPlanKey: planApprovalPlanKey ?? undefined,
					},
				};

				nextMessages = [...thread.messages, approvalMarkerMessage];
				shouldPersistUpdate = true;
				return updateThreadMessages({
					threads: previousThreads,
					chatId: targetThreadId,
					messages: nextMessages,
					updatedAt: Date.now(),
					maxThreads: PLAN_THREAD_RETENTION_LIMIT,
				});
			});

			if (!shouldPersistUpdate || !nextMessages) {
				return;
			}

			if (activeChatIdRef.current === targetThreadId) {
				replaceMessages(nextMessages);
			}

			updateThreadOnServer(targetThreadId, {
				messages: nextMessages,
				updatedAt: new Date().toISOString(),
			});
		},
		[replaceMessages],
	);

	const togglePlanMode = useCallback(() => {
		setIsPlanMode((prev) => {
			const next = !prev;
			if (!next) {
				setPlanningSession(null);
			}
			return next;
		});
	}, []);

	return {
		prompt,
		setPrompt,
		isPlanMode,
		togglePlanMode,
		isChatMode,
		isStreaming,
		isSubmitPending,
		stopStreaming,
		isGeneratingTitle,
		pendingTitleChatId,
		uiMessages,
		queuedPrompts,
		removeQueuedPrompt,
		chatHistory,
		activeChatId,
		handleSubmit,
		handleSuggestedQuestionClick,
		handleWidgetPrimaryAction,
		submitClarification,
		dismissClarification,
		submitPlanApproval,
		sendAgentDirective,
		handleNewChat,
		handleSelectChat,
		handleDeleteChat,
		handleDeleteMessage,
		appendPlanApprovalMarker,
	};
}
