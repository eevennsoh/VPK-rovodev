"use client";

import { createContext, use, useState, type ReactNode } from "react";

/**
 * System Prompt State
 */
export interface SystemPromptState {
	customPrompt: string;
	isModalOpen: boolean;
}

/**
 * System Prompt Actions
 */
export interface SystemPromptActions {
	setCustomPrompt: (prompt: string) => void;
	openModal: () => void;
	closeModal: () => void;
}

interface SystemPromptContextValue {
	state: SystemPromptState;
	actions: SystemPromptActions;
}

const SystemPromptContext = createContext<SystemPromptContextValue | null>(null);

interface SystemPromptProviderProps {
	children: ReactNode;
}

export function SystemPromptProvider({ children }: Readonly<SystemPromptProviderProps>) {
	const [customPrompt, setCustomPromptState] = useState(() => {
		if (typeof window === "undefined") {
			return "";
		}
		try {
			return localStorage.getItem("rovo-system-prompt") ?? "";
		} catch {
			return "";
		}
	});
	const [isModalOpen, setIsModalOpen] = useState(false);

	const state: SystemPromptState = { customPrompt, isModalOpen };

	const actions: SystemPromptActions = {
		setCustomPrompt: (prompt: string) => {
			setCustomPromptState(prompt);
			localStorage.setItem("rovo-system-prompt", prompt);
		},
		openModal: () => setIsModalOpen(true),
		closeModal: () => setIsModalOpen(false),
	};

	return (
		<SystemPromptContext value={{ state, actions }}>
			{children}
		</SystemPromptContext>
	);
}

/**
 * Hook to access full SystemPrompt context.
 * Must be used within a SystemPromptProvider.
 */
function useSystemPromptContext(): SystemPromptContextValue {
	const context = use(SystemPromptContext);
	if (context === null) {
		throw new Error("useSystemPrompt must be used within a SystemPromptProvider");
	}
	return context;
}

/**
 * Hook to access system prompt state.
 */
export function useSystemPromptState(): SystemPromptState {
	return useSystemPromptContext().state;
}

/**
 * Hook to access system prompt actions.
 */
export function useSystemPromptActions(): SystemPromptActions {
	return useSystemPromptContext().actions;
}

/**
 * Legacy convenience hook that returns a flat object matching the old API.
 * Prefer useSystemPromptState() and useSystemPromptActions() for new code.
 */
export function useSystemPrompt(): SystemPromptState & SystemPromptActions {
	const { state, actions } = useSystemPromptContext();
	return { ...state, ...actions };
}
