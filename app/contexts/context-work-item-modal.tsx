"use client";

import { createContext, use, useState, ReactNode } from "react";

/**
 * Work Item Modal State
 */
export interface WorkItemModalState {
	isDetailsOpen: boolean;
	isMoreFieldsOpen: boolean;
	isAutomationOpen: boolean;
}

/**
 * Work Item Modal Actions
 */
export interface WorkItemModalActions {
	toggleDetails: () => void;
	toggleMoreFields: () => void;
	toggleAutomation: () => void;
	setDetailsOpen: (open: boolean) => void;
	setMoreFieldsOpen: (open: boolean) => void;
	setAutomationOpen: (open: boolean) => void;
}

/**
 * Work Item Data
 */
export interface WorkItemData {
	title: string;
	code: string;
	description?: string;
	assignee?: {
		name: string;
		avatarUrl?: string;
	};
	reporter?: {
		name: string;
		avatarUrl?: string;
	};
	priority?: "Highest" | "High" | "Medium" | "Low" | "Lowest";
	status?: string;
	startDate?: string;
	parent?: {
		code: string;
		title?: string;
	};
	labels?: string[];
	childItems?: Array<{
		type: string;
		key: string;
		summary: string;
		priority: string;
		assignee?: string;
		status: string;
	}>;
	attachments?: Array<{
		name: string;
		ext: string;
		date: string;
		thumbnailColor?: string;
	}>;
	comments?: Array<{
		id: string;
		author: {
			name: string;
			avatarUrl?: string;
		};
		timestamp: string;
		content: string;
		replies?: Array<{
			id: string;
			author: {
				name: string;
				avatarUrl?: string;
			};
			timestamp: string;
			content: string;
		}>;
	}>;
}

/**
 * Work Item Modal Meta
 */
export interface WorkItemModalMeta {
	isOpen: boolean;
	onClose: () => void;
	workItem: WorkItemData;
}

/**
 * Combined context value
 */
export interface WorkItemModalContextValue {
	state: WorkItemModalState;
	actions: WorkItemModalActions;
	meta: WorkItemModalMeta;
}

const WorkItemModalContext = createContext<WorkItemModalContextValue | null>(null);

interface WorkItemModalProviderProps {
	children: ReactNode;
	isOpen: boolean;
	onClose: () => void;
	workItem: WorkItemData;
	/** Initial state for accordions */
	initialDetailsOpen?: boolean;
	initialMoreFieldsOpen?: boolean;
	initialAutomationOpen?: boolean;
}

/**
 * Provider component that manages WorkItemModal state following the composition pattern.
 *
 * Usage:
 * ```tsx
 * <WorkItemModalProvider isOpen={isOpen} onClose={handleClose} workItem={workItem}>
 *   <WorkItemModal.Backdrop />
 *   <WorkItemModal.Container>
 *     <WorkItemModal.Header />
 *     <WorkItemModal.TwoColumnLayout>
 *       <WorkItemModal.LeftColumn>
 *         <WorkItemModal.Title />
 *         <WorkItemModal.Description />
 *         <WorkItemModal.ChildItems />
 *         <WorkItemModal.Attachments />
 *         <WorkItemModal.Activity />
 *       </WorkItemModal.LeftColumn>
 *       <WorkItemModal.RightColumn>
 *         <WorkItemModal.StatusHeader />
 *         <WorkItemModal.DetailsAccordion />
 *         <WorkItemModal.MoreFieldsAccordion />
 *         <WorkItemModal.AutomationAccordion />
 *       </WorkItemModal.RightColumn>
 *     </WorkItemModal.TwoColumnLayout>
 *   </WorkItemModal.Container>
 * </WorkItemModalProvider>
 * ```
 */
export function WorkItemModalProvider({
	children,
	isOpen,
	onClose,
	workItem,
	initialDetailsOpen = true,
	initialMoreFieldsOpen = false,
	initialAutomationOpen = false,
}: WorkItemModalProviderProps) {
	const [isDetailsOpen, setIsDetailsOpen] = useState(initialDetailsOpen);
	const [isMoreFieldsOpen, setIsMoreFieldsOpen] = useState(initialMoreFieldsOpen);
	const [isAutomationOpen, setIsAutomationOpen] = useState(initialAutomationOpen);

	const state: WorkItemModalState = {
		isDetailsOpen,
		isMoreFieldsOpen,
		isAutomationOpen,
	};

	const actions: WorkItemModalActions = {
		toggleDetails: () => setIsDetailsOpen((prev) => !prev),
		toggleMoreFields: () => setIsMoreFieldsOpen((prev) => !prev),
		toggleAutomation: () => setIsAutomationOpen((prev) => !prev),
		setDetailsOpen: setIsDetailsOpen,
		setMoreFieldsOpen: setIsMoreFieldsOpen,
		setAutomationOpen: setIsAutomationOpen,
	};

	const meta: WorkItemModalMeta = {
		isOpen,
		onClose,
		workItem,
	};

	// Don't render children if modal is closed
	if (!isOpen) return null;

	return (
		<WorkItemModalContext value={{ state, actions, meta }}>
			{children}
		</WorkItemModalContext>
	);
}

/**
 * Hook to access WorkItemModal context.
 * Must be used within a WorkItemModalProvider.
 */
export function useWorkItemModal(): WorkItemModalContextValue {
	const context = use(WorkItemModalContext);
	if (context === null) {
		throw new Error("useWorkItemModal must be used within a WorkItemModalProvider");
	}
	return context;
}

/**
 * Hook to access only the state
 */
export function useWorkItemModalState(): WorkItemModalState {
	return useWorkItemModal().state;
}

/**
 * Hook to access only the actions
 */
export function useWorkItemModalActions(): WorkItemModalActions {
	return useWorkItemModal().actions;
}

/**
 * Hook to access the work item data
 */
export function useWorkItemData(): WorkItemData {
	return useWorkItemModal().meta.workItem;
}
