"use client";

import { createContext, use, useState, type ReactNode } from "react";

type Product = "home" | "jira" | "confluence" | "rovo" | "search";

/**
 * Sidebar State
 */
export interface SidebarState {
	isVisible: boolean;
	isHovered: boolean;
	currentRoute: Product;
}

/**
 * Sidebar Actions
 */
export interface SidebarActions {
	toggleSidebar: () => void;
	setHovered: (hovered: boolean) => void;
	setCurrentRoute: (route: Product) => void;
}

interface SidebarContextValue {
	state: SidebarState;
	actions: SidebarActions;
}

const SidebarContext = createContext<SidebarContextValue | null>(null);

interface SidebarProviderProps {
	children: ReactNode;
	defaultVisible?: boolean;
}

export function SidebarProvider({ children, defaultVisible = false }: Readonly<SidebarProviderProps>) {
	const [isVisible, setIsVisible] = useState(defaultVisible);
	const [isHovered, setIsHovered] = useState(false);
	const [currentRoute, setCurrentRoute] = useState<Product>("home");

	const state: SidebarState = { isVisible, isHovered, currentRoute };

	const actions: SidebarActions = {
		toggleSidebar: () => setIsVisible((prev) => !prev),
		setHovered: (hovered: boolean) => setIsHovered(hovered),
		setCurrentRoute,
	};

	return (
		<SidebarContext value={{ state, actions }}>
			{children}
		</SidebarContext>
	);
}

/**
 * Hook to access full Sidebar context.
 * Must be used within a SidebarProvider.
 */
function useSidebarContext(): SidebarContextValue {
	const context = use(SidebarContext);
	if (context === null) {
		throw new Error("useSidebar must be used within a SidebarProvider");
	}
	return context;
}

/**
 * Hook to access sidebar state.
 */
export function useSidebarState(): SidebarState {
	return useSidebarContext().state;
}

/**
 * Hook to access sidebar actions.
 */
export function useSidebarActions(): SidebarActions {
	return useSidebarContext().actions;
}

/**
 * Legacy convenience hook that returns a flat object matching the old API.
 * Prefer useSidebarState() and useSidebarActions() for new code.
 */
export function useSidebar(): SidebarState & SidebarActions {
	const { state, actions } = useSidebarContext();
	return { ...state, ...actions };
}
