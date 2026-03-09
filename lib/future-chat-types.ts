import type { RovoUIMessage } from "@/lib/rovo-ui-messages";

export type FutureChatVisibility = "private" | "public";
export type FutureChatDocumentKind = "text" | "code" | "image" | "sheet";

export interface FutureChatThread {
	id: string;
	title: string;
	messages: RovoUIMessage[];
	visibility: FutureChatVisibility;
	modelId: string | null;
	provider: string | null;
	activeDocumentId: string | null;
	createdAt: string;
	updatedAt: string;
}

export interface FutureChatVote {
	threadId: string;
	messageId: string;
	value: "up" | "down" | null;
	isUpvoted: boolean | null;
}

export interface FutureChatDocumentVersion {
	id: string;
	content: string;
	createdAt: string;
}

export interface FutureChatDocument {
	id: string;
	threadId: string;
	title: string;
	kind: FutureChatDocumentKind;
	sourceMessageId: string | null;
	createdAt: string;
	updatedAt: string;
	versions: FutureChatDocumentVersion[];
}

export function createFutureChatId(prefix = "future-chat"): string {
	if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
		return crypto.randomUUID();
	}

	return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}
