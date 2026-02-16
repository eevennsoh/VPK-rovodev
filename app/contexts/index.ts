/**
 * Context Providers
 *
 * React contexts following the Vercel composition pattern with { state, actions, meta }.
 */

// Chat contexts
export { ChatProvider, useChat } from "./context-chat";
export type { Message } from "./context-chat";

export { RovoChatPlanProvider, useRovoChatPlan } from "./context-rovo-chat-plan";
export { RovoChatAskProvider, useRovoChatAsk } from "./context-rovo-chat-ask";

// Modal contexts
export {
	WorkItemModalProvider,
	useWorkItemModal,
	useWorkItemModalState,
	useWorkItemModalActions,
	useWorkItemData,
} from "./context-work-item-modal";
export type {
	WorkItemModalState,
	WorkItemModalActions,
	WorkItemData,
	WorkItemModalMeta,
	WorkItemModalContextValue,
} from "./context-work-item-modal";

// Other contexts
export { SystemPromptProvider, useSystemPrompt } from "./context-system-prompt";
export { SidebarProvider, useSidebar } from "./context-sidebar";
