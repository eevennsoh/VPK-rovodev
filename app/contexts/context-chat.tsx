"use client";

import { createContext, use, useState, type ReactNode } from "react";

export interface Message {
	id: string;
	type: "user" | "assistant";
	content: string;
	isStreaming?: boolean;
	widget?: {
		type: string;
		data: unknown;
	};
	widgetLoading?: boolean;
}

/**
 * Chat State
 */
export interface ChatState {
	isOpen: boolean;
	messages: Message[];
}

/**
 * Chat Actions
 */
export interface ChatActions {
	toggleChat: () => void;
	closeChat: () => void;
	setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
}

interface ChatContextValue {
	state: ChatState;
	actions: ChatActions;
}

const ChatContext = createContext<ChatContextValue | null>(null);

interface ChatProviderProps {
	children: ReactNode;
}

export function ChatProvider({ children }: Readonly<ChatProviderProps>) {
	const [isOpen, setIsOpen] = useState(false);
	const [messages, setMessages] = useState<Message[]>([]);

	const state: ChatState = { isOpen, messages };

	const actions: ChatActions = {
		toggleChat: () => setIsOpen((prev) => !prev),
		closeChat: () => setIsOpen(false),
		setMessages,
	};

	return (
		<ChatContext value={{ state, actions }}>
			{children}
		</ChatContext>
	);
}

/**
 * Hook to access full Chat context.
 * Must be used within a ChatProvider.
 */
function useChatContext(): ChatContextValue {
	const context = use(ChatContext);
	if (context === null) {
		throw new Error("useChat must be used within a ChatProvider");
	}
	return context;
}

/**
 * Hook to access chat state (isOpen, messages).
 */
export function useChatState(): ChatState {
	return useChatContext().state;
}

/**
 * Hook to access chat actions (toggleChat, closeChat, setMessages).
 */
export function useChatActions(): ChatActions {
	return useChatContext().actions;
}

/**
 * Legacy convenience hook that returns a flat object matching the old API.
 * Prefer useChatState() and useChatActions() for new code.
 */
export function useChat(): ChatState & ChatActions {
	const { state, actions } = useChatContext();
	return { ...state, ...actions };
}
