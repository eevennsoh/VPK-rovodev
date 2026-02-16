/**
 * Context Providers
 *
 * React contexts following the Vercel composition pattern with { state, actions, meta }.
 */

// Chat contexts
export { ChatProvider, useChat } from "./context-chat";
export type { Message } from "./context-chat";

export { RovoChatProvider, useRovoChat } from "./context-rovo-chat";
export type { QueuedPromptItem, SendPromptOptions } from "./context-rovo-chat";

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
export { SidebarProvider, useSidebar } from "./context-sidebar";
