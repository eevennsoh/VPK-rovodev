import type {
	FutureChatThread,
	FutureChatVisibility,
} from "@/lib/future-chat-types";
import type { RovoUIMessage } from "@/lib/rovo-ui-messages";

export function buildFutureChatThreadPersistKey(options: {
	messages: ReadonlyArray<RovoUIMessage>;
	visibility: FutureChatVisibility;
	activeDocumentId: string | null;
	title: string;
}): string {
	return JSON.stringify({
		messages: options.messages,
		visibility: options.visibility,
		activeDocumentId: options.activeDocumentId,
		title: options.title,
	});
}

export function shouldReplaceFutureChatRouteAfterPersistence(options: {
	pendingThreadId: string | null;
	thread: FutureChatThread;
	messages: ReadonlyArray<RovoUIMessage>;
	visibility: FutureChatVisibility;
	activeDocumentId: string | null;
	title: string;
}): boolean {
	if (!options.pendingThreadId || options.thread.id !== options.pendingThreadId) {
		return false;
	}

	const expectedPersistKey = buildFutureChatThreadPersistKey({
		messages: options.messages,
		visibility: options.visibility,
		activeDocumentId: options.activeDocumentId,
		title: options.title,
	});
	const persistedThreadKey = buildFutureChatThreadPersistKey({
		messages: options.thread.messages,
		visibility: options.thread.visibility,
		activeDocumentId: options.thread.activeDocumentId,
		title: options.thread.title,
	});

	return persistedThreadKey === expectedPersistKey;
}
