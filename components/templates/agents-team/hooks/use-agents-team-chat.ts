"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRovoChatPlan } from "@/app/contexts/context-rovo-chat-plan";
import { useSystemPrompt } from "@/app/contexts/context-system-prompt";
import { API_ENDPOINTS } from "@/lib/api-config";
import {
	getMessageText,
	isMessageTextStreaming,
	type RovoUIMessage,
} from "@/lib/rovo-ui-messages";
import type { ClarificationSubmission } from "@/components/templates/shared/lib/question-card-widget";
import {
	buildPlanApprovalPrompt,
	type PlanApprovalSubmission,
} from "@/components/templates/shared/lib/plan-approval";
import type { ChatHistoryItem } from "../components/sidebar-chat-history";

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

function truncateTitleWords(value: string, maxWords: number): string {
	const words = value.split(/\s+/).filter(Boolean);
	return words.slice(0, maxWords).join(" ").trim();
}

function deriveTitleFromAssistantMessage(messageText: string): string | null {
	const trimmed = messageText.trim();
	if (!trimmed) {
		return null;
	}

	const headingMatch = trimmed.match(/^#{1,6}\s+(.+)$/m);
	if (headingMatch?.[1]) {
		const headingTitle = truncateTitleWords(trimTitleText(headingMatch[1]), 6);
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
	const normalizedTitle = truncateTitleWords(trimTitleText(firstSentence), 6);
	return normalizedTitle || null;
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
	isChatMode: boolean;
	isStreaming: boolean;
	isGeneratingTitle: boolean;
	uiMessages: RovoUIMessage[];
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
	} = useRovoChatPlan();
	const { customPrompt } = useSystemPrompt();

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

		const hasResolvedTitle = chatHistory.some((item) => item.id === pendingTitleChatId);
		if (hasResolvedTitle) {
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
	}, [chatHistory, isGeneratingTitle, pendingTitleChatId, resolveChatTitle, uiMessages]);

	const createChatEntry = useCallback((firstMessage: string) => {
		const id = crypto.randomUUID();
		setActiveChatId(id);
		hasCreatedEntry.current = true;
		setIsGeneratingTitle(true);
		setPendingTitleChatId(id);
		pendingTitleChatIdRef.current = id;

		// Prefer dedicated title generation API, then fallback to first assistant message.
		void fetchAITitle(firstMessage).then((aiTitle) => {
			if (!aiTitle) {
				return;
			}

			resolveChatTitle(id, aiTitle);
		});
	}, [resolveChatTitle]);

	const sendAgentsPrompt = useCallback(
		async (nextPrompt: string) => {
			if (!nextPrompt.trim()) {
				return;
			}

			await sendPrompt(nextPrompt, {
				customSystemPrompt: customPrompt || undefined,
			});
		},
		[customPrompt, sendPrompt]
	);
	const submitClarification = useCallback(
		async (promptText: string, clarification: ClarificationSubmission) => {
			if (!promptText.trim()) {
				return;
			}

			await sendPrompt(promptText, {
				customSystemPrompt: customPrompt || undefined,
				clarification,
				messageMetadata: {
					visibility: "hidden",
					source: "clarification-submit",
				},
			});
		},
		[customPrompt, sendPrompt]
	);
	const submitPlanApproval = useCallback(
		async (approval: PlanApprovalSubmission) => {
			const approvalPrompt = buildPlanApprovalPrompt(approval).trim();
			if (!approvalPrompt) {
				return;
			}

			await sendPrompt(approvalPrompt, {
				customSystemPrompt: customPrompt || undefined,
				approval,
				messageMetadata: {
					visibility: "hidden",
					source: "plan-approval-submit",
				},
			});
		},
		[customPrompt, sendPrompt]
	);
	const sendAgentDirective = useCallback(
		async (agentName: string, message: string) => {
			const trimmed = message.trim();
			if (!trimmed) {
				return;
			}

			await sendPrompt(`@${agentName}: ${trimmed}`, {
				customSystemPrompt: customPrompt || undefined,
				messageMetadata: {
					visibility: "hidden",
					source: "agent-directive",
				},
			});
		},
		[customPrompt, sendPrompt]
	);

	const handleSubmit = useCallback(async () => {
		if (!prompt.trim()) {
			return;
		}

		const currentPrompt = prompt;
		setPrompt("");

		if (!isChatMode) {
			setIsChatMode(true);
			createChatEntry(currentPrompt);
		}

		await sendAgentsPrompt(currentPrompt);
	}, [prompt, isChatMode, sendAgentsPrompt, createChatEntry]);

	const handleSuggestedQuestionClick = useCallback(
		async (question: string) => {
			if (!question.trim()) {
				return;
			}

			if (!isChatMode) {
				setIsChatMode(true);
				createChatEntry(question);
			}

			await sendAgentsPrompt(question);
		},
		[isChatMode, sendAgentsPrompt, createChatEntry]
	);

	const handleNewChat = useCallback(() => {
		resetChat();
		setPrompt("");
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

	return {
		prompt,
		setPrompt,
		isChatMode,
		isStreaming,
		isGeneratingTitle,
		uiMessages,
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
