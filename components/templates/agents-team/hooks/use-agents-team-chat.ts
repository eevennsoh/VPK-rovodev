"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRovoChat } from "@/app/contexts";
import type { QueuedPromptItem } from "@/app/contexts";
import { API_ENDPOINTS } from "@/lib/api-config";
import {
	getMessageText,
	isMessageTextStreaming,
	type RovoUIMessage,
} from "@/lib/rovo-ui-messages";
import {
	getLatestQuestionCardPayload,
	type ClarificationSubmission,
} from "@/components/templates/shared/lib/question-card-widget";
import {
	buildPlanApprovalPrompt,
	type PlanApprovalSubmission,
} from "@/components/templates/shared/lib/plan-approval";
import { getLatestPlanWidgetPayload } from "@/components/templates/shared/lib/plan-widget";
import {
	AGENT_TEAM_MODE_CONTEXT_DESCRIPTION,
	AGENT_TEAM_MODE_PLAN_RETRY_PROMPT,
} from "../lib/agent-team-mode";
import type { ChatHistoryItem } from "../components/sidebar-chat-history";

type AgentTeamPlanningPhase = "awaiting-plan" | "retrying-missing-plan";

interface AgentTeamPlanningSession {
	requestId: string;
	phase: AgentTeamPlanningPhase;
	hasStreamStarted: boolean;
	retryUsed: boolean;
}

async function fetchAITitle(message: string): Promise<string | null> {
	try {
		const response = await fetch(API_ENDPOINTS.CHAT_TITLE, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ message }),
		});

		if (!response.ok) {
			return null;
		}

		const data = (await response.json()) as { title?: string };
		return data.title?.trim() || null;
	} catch {
		return null;
	}
}

function trimTitleText(value: string): string {
	return value.replace(/^["']|["']$/g, "").replace(/\.+$/, "").trim();
}

function deriveTitleFromAssistantMessage(messageText: string): string | null {
	const trimmed = messageText.trim();
	if (!trimmed) {
		return null;
	}

	const headingMatch = trimmed.match(/^#{1,6}\s+(.+)$/m);
	if (headingMatch?.[1]) {
		const headingTitle = trimTitleText(headingMatch[1]);
		return headingTitle || null;
	}

	const firstNonEmptyLine = trimmed
		.split(/\r?\n/)
		.map((line) => trimTitleText(line.replace(/^[-*]\s+/, "")))
		.find((line) => line.length > 0);

	if (!firstNonEmptyLine) {
		return null;
	}

	const firstSentence = firstNonEmptyLine.split(/[.!?](?:\s|$)/)[0] ?? firstNonEmptyLine;
	return trimTitleText(firstSentence) || null;
}

function deriveTitleFromUserPrompt(promptText: string): string {
	const firstLine = promptText
		.split(/\r?\n/)
		.map((line) => trimTitleText(line))
		.find((line) => line.length > 0);

	return trimTitleText(firstLine ?? promptText) || "New chat";
}

function createAgentTeamRequestId(): string {
	if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
		return crypto.randomUUID();
	}

	return `agent-team-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function getWordCount(value: string): number {
	return value
		.trim()
		.split(/\s+/)
		.filter(Boolean).length;
}

function isFallbackTitleReady(options: {
	assistantText: string;
	derivedTitle: string;
	isStreaming: boolean;
}): boolean {
	const { assistantText, derivedTitle, isStreaming } = options;
	if (getWordCount(derivedTitle) < 3) {
		return false;
	}

	if (!isStreaming) {
		return true;
	}

	const normalizedAssistantText = assistantText.trim();
	return (
		normalizedAssistantText.length >= 32 ||
		/[.!?]/.test(normalizedAssistantText) ||
		normalizedAssistantText.includes("\n")
	);
}

interface UseAgentsTeamChatReturn {
	prompt: string;
	setPrompt: (value: string) => void;
	isAgentTeamMode: boolean;
	toggleAgentTeamMode: () => void;
	isChatMode: boolean;
	isStreaming: boolean;
	stopStreaming: () => void;
	isGeneratingTitle: boolean;
	pendingTitleChatId: string | null;
	uiMessages: RovoUIMessage[];
	queuedPrompts: ReadonlyArray<QueuedPromptItem>;
	removeQueuedPrompt: (id: string) => void;
	chatHistory: ChatHistoryItem[];
	activeChatId: string | null;
	handleSubmit: () => Promise<void>;
	handleSuggestedQuestionClick: (question: string) => Promise<void>;
	submitClarification: (
		promptText: string,
		clarification: ClarificationSubmission
	) => Promise<void>;
	submitPlanApproval: (approval: PlanApprovalSubmission) => Promise<void>;
	sendAgentDirective: (agentName: string, message: string) => Promise<void>;
	handleNewChat: () => void;
	handleSelectChat: (id: string) => void;
	handleDeleteChat: (id: string) => void;
}

export function useAgentsTeamChat(): UseAgentsTeamChatReturn {
	const [prompt, setPrompt] = useState("");
	const [isAgentTeamMode, setIsAgentTeamMode] = useState(false);
	const [agentTeamPlanningSession, setAgentTeamPlanningSession] =
		useState<AgentTeamPlanningSession | null>(null);
	const [isChatMode, setIsChatMode] = useState(false);
	const [chatHistory, setChatHistory] = useState<ChatHistoryItem[]>([]);
	const [activeChatId, setActiveChatId] = useState<string | null>(null);
	const [isGeneratingTitle, setIsGeneratingTitle] = useState(false);
	const [pendingTitleChatId, setPendingTitleChatId] = useState<string | null>(null);
	const pendingTitleChatIdRef = useRef<string | null>(null);
	const hasCreatedEntry = useRef(false);
	const {
		uiMessages,
		isStreaming,
		sendPrompt,
		stopStreaming,
		resetChat,
		queuedPrompts,
		removeQueuedPrompt,
	} = useRovoChat();

	useEffect(() => {
		return () => stopStreaming();
	}, [stopStreaming]);

	const resolveChatTitle = useCallback((chatId: string, title: string) => {
		const normalizedTitle = trimTitleText(title);
		if (!normalizedTitle) {
			return;
		}

		setChatHistory((prev) => {
			const existingIndex = prev.findIndex((item) => item.id === chatId);
			if (existingIndex === -1) {
				return [{ id: chatId, title: normalizedTitle }, ...prev];
			}

			const next = [...prev];
			next[existingIndex] = {
				...next[existingIndex],
				title: normalizedTitle,
			};
			return next;
		});

		if (pendingTitleChatIdRef.current === chatId) {
			pendingTitleChatIdRef.current = null;
			setPendingTitleChatId(null);
			setIsGeneratingTitle(false);
		}
	}, []);

	useEffect(() => {
		if (!pendingTitleChatId || !isGeneratingTitle) {
			return;
		}

		const isTitleStillPending = pendingTitleChatIdRef.current === pendingTitleChatId;
		if (!isTitleStillPending) {
			return;
		}

		const assistantMessageWithText = uiMessages.find((message) => {
			if (message.role !== "assistant") {
				return false;
			}

			return getMessageText(message).length > 0;
		});

		if (!assistantMessageWithText) {
			return;
		}

		const assistantText = getMessageText(assistantMessageWithText);
		const fallbackTitle = deriveTitleFromAssistantMessage(assistantText);
		if (!fallbackTitle) {
			return;
		}

		const isStreamingAssistantMessage = isMessageTextStreaming(assistantMessageWithText);
		if (
			!isFallbackTitleReady({
				assistantText,
				derivedTitle: fallbackTitle,
				isStreaming: isStreamingAssistantMessage,
			})
		) {
			return;
		}

		const fallbackResolveTimeout = setTimeout(() => {
			resolveChatTitle(pendingTitleChatId, fallbackTitle);
		}, 0);

		return () => {
			clearTimeout(fallbackResolveTimeout);
		};
	}, [isGeneratingTitle, pendingTitleChatId, resolveChatTitle, uiMessages]);

	const pendingTitleMessageRef = useRef<string | null>(null);
	const hasStreamedOnceRef = useRef(false);

	const createChatEntry = useCallback((firstMessage: string) => {
		const id = crypto.randomUUID();
		const provisionalTitle = deriveTitleFromUserPrompt(firstMessage);
		setChatHistory((prev) => [{ id, title: provisionalTitle }, ...prev]);
		setActiveChatId(id);
		hasCreatedEntry.current = true;
		setIsGeneratingTitle(true);
		setPendingTitleChatId(id);
		pendingTitleChatIdRef.current = id;
		pendingTitleMessageRef.current = firstMessage;
		hasStreamedOnceRef.current = false;
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
				if (!aiTitle) {
					// Clear generating state so the sidebar doesn't stay in skeleton loading
					if (pendingTitleChatIdRef.current === chatId) {
						pendingTitleChatIdRef.current = null;
						setPendingTitleChatId(null);
						setIsGeneratingTitle(false);
					}
					return;
				}

				resolveChatTitle(chatId, aiTitle);
			});
		}, 2000);

		return () => clearTimeout(titleDelay);
	}, [isStreaming, pendingTitleChatId, resolveChatTitle]);

	const setAgentTeamModeEnabled = useCallback((enabled: boolean) => {
		setIsAgentTeamMode(enabled);
		if (!enabled) {
			setAgentTeamPlanningSession(null);
		}
	}, []);

	const sendAgentsPrompt = useCallback(
		async (nextPrompt: string) => {
			if (!nextPrompt.trim()) {
				return;
			}

			if (isAgentTeamMode) {
				const requestId = createAgentTeamRequestId();
				setAgentTeamPlanningSession({
					requestId,
					phase: "awaiting-plan",
					hasStreamStarted: false,
					retryUsed: false,
				});

				await sendPrompt(nextPrompt, {
					contextDescription: AGENT_TEAM_MODE_CONTEXT_DESCRIPTION,
					agentTeamMode: true,
					agentTeamRequestId: requestId,
				});
				return;
			}

			await sendPrompt(nextPrompt, {});
		},
		[isAgentTeamMode, sendPrompt]
	);

	useEffect(() => {
		if (!agentTeamPlanningSession) {
			return;
		}

		if (isStreaming) {
			if (!agentTeamPlanningSession.hasStreamStarted) {
				queueMicrotask(() => {
					setAgentTeamPlanningSession((previousSession) => {
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

		if (!agentTeamPlanningSession.hasStreamStarted) {
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
				setAgentTeamModeEnabled(false);
			});
			return;
		}

		if (isAwaitingClarificationAnswers) {
			return;
		}

		if (agentTeamPlanningSession.retryUsed) {
			queueMicrotask(() => {
				setAgentTeamModeEnabled(false);
			});
			return;
		}

		const retryRequestId = agentTeamPlanningSession.requestId;
		queueMicrotask(() => {
			setAgentTeamPlanningSession((previousSession) => {
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

		void sendPrompt(AGENT_TEAM_MODE_PLAN_RETRY_PROMPT, {
			contextDescription: AGENT_TEAM_MODE_CONTEXT_DESCRIPTION,
			agentTeamMode: true,
			agentTeamRequestId: retryRequestId,
			messageMetadata: {
				visibility: "hidden",
				source: "agent-team-plan-retry",
			},
		});
	}, [
		agentTeamPlanningSession,
		isStreaming,
		sendPrompt,
		setAgentTeamModeEnabled,
		uiMessages,
	]);

	const submitClarification = useCallback(
		async (promptText: string, clarification: ClarificationSubmission) => {
			if (!promptText.trim()) {
				return;
			}

			await sendPrompt(promptText, {
				contextDescription: isAgentTeamMode
					? AGENT_TEAM_MODE_CONTEXT_DESCRIPTION
					: undefined,
				agentTeamMode: isAgentTeamMode || undefined,
				agentTeamRequestId: agentTeamPlanningSession?.requestId,
				clarification,
				messageMetadata: {
					visibility: "hidden",
					source: "clarification-submit",
				},
			});
		},
		[agentTeamPlanningSession?.requestId, isAgentTeamMode, sendPrompt]
	);
	const submitPlanApproval = useCallback(
		async (approval: PlanApprovalSubmission) => {
			const approvalPrompt = buildPlanApprovalPrompt(approval).trim();
			if (!approvalPrompt) {
				return;
			}

			await sendPrompt(approvalPrompt, {
				
				approval,
				messageMetadata: {
					visibility: "hidden",
					source: "plan-approval-submit",
				},
			});
		},
		[sendPrompt]
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
		[sendPrompt]
	);

	const handleSubmit = useCallback(async () => {
		if (!prompt.trim()) {
			return;
		}

		if (isAgentTeamMode && agentTeamPlanningSession !== null) {
			return;
		}

		const currentPrompt = prompt;
		setPrompt("");

		if (!isChatMode) {
			setIsChatMode(true);
			createChatEntry(currentPrompt);
		}

		await sendAgentsPrompt(currentPrompt);
	}, [
		prompt,
		isAgentTeamMode,
		agentTeamPlanningSession,
		isChatMode,
		sendAgentsPrompt,
		createChatEntry,
	]);

	const handleSuggestedQuestionClick = useCallback(
		async (question: string) => {
			if (!question.trim()) {
				return;
			}

			if (isAgentTeamMode && agentTeamPlanningSession !== null) {
				return;
			}

			if (!isChatMode) {
				setIsChatMode(true);
				createChatEntry(question);
			}

			await sendAgentsPrompt(question);
		},
		[
			isAgentTeamMode,
			agentTeamPlanningSession,
			isChatMode,
			sendAgentsPrompt,
			createChatEntry,
		]
	);

	const handleNewChat = useCallback(() => {
		resetChat();
		setPrompt("");
		setAgentTeamPlanningSession(null);
		setIsChatMode(false);
		setActiveChatId(null);
		setIsGeneratingTitle(false);
		setPendingTitleChatId(null);
		pendingTitleChatIdRef.current = null;
		hasCreatedEntry.current = false;
	}, [resetChat]);

	const handleSelectChat = useCallback((id: string) => {
		setActiveChatId(id);
		setIsChatMode(true);
	}, []);

	const handleDeleteChat = useCallback(
		(id: string) => {
			setChatHistory((prev) => prev.filter((item) => item.id !== id));

			// If deleting the active chat, go back to composer
			if (activeChatId === id) {
				resetChat();
				setPrompt("");
				setAgentTeamPlanningSession(null);
				setIsChatMode(false);
				setActiveChatId(null);
				setIsGeneratingTitle(false);
				setPendingTitleChatId(null);
				pendingTitleChatIdRef.current = null;
				hasCreatedEntry.current = false;
			}
		},
		[activeChatId, resetChat],
	);

	const toggleAgentTeamMode = useCallback(() => {
		setAgentTeamModeEnabled(!isAgentTeamMode);
	}, [isAgentTeamMode, setAgentTeamModeEnabled]);

	return {
		prompt,
		setPrompt,
		isAgentTeamMode,
		toggleAgentTeamMode,
		isChatMode,
		isStreaming,
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
		submitClarification,
		submitPlanApproval,
		sendAgentDirective,
		handleNewChat,
		handleSelectChat,
		handleDeleteChat,
	};
}
