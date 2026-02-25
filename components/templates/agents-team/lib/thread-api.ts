import { API_ENDPOINTS } from "@/lib/api-config";
import type { RovoUIMessage } from "@/lib/rovo-ui-messages";
import { trimTitleText, type PlanThread } from "./thread-store";

/**
 * Fire-and-forget: persist a full thread snapshot to the server.
 */
export function persistThreadToServer(thread: PlanThread): void {
	fetch(API_ENDPOINTS.planThreads(), {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({
			id: thread.id,
			title: thread.title,
			messages: thread.messages,
			createdAt: new Date(thread.createdAt).toISOString(),
			updatedAt: new Date(thread.updatedAt).toISOString(),
		}),
	}).catch(() => {
		// Fire-and-forget — optimistic local state takes precedence
	});
}

/**
 * Fire-and-forget: update specific fields on a thread.
 */
export function updateThreadOnServer(
	threadId: string,
	fields: { title?: string; messages?: ReadonlyArray<RovoUIMessage>; updatedAt?: string },
): void {
	fetch(API_ENDPOINTS.planThread(threadId), {
		method: "PUT",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(fields),
	}).catch(() => {
		// Fire-and-forget
	});
}

/**
 * Fire-and-forget: delete a thread on the server.
 */
export function deleteThreadOnServer(threadId: string): void {
	fetch(API_ENDPOINTS.planThread(threadId), {
		method: "DELETE",
	}).catch(() => {
		// Fire-and-forget
	});
}

/**
 * Fetch an AI-generated title from the chat-title endpoint.
 */
export async function fetchAITitle(message: string): Promise<string | null> {
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

/**
 * Derive a short title from the first heading or sentence of an assistant message.
 */
export function deriveTitleFromAssistantMessage(messageText: string): string | null {
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

/**
 * Update the `thread` query parameter in the URL without navigation.
 */
export function updateUrlThreadParam(threadId: string | null): void {
	if (typeof window === "undefined") return;
	const url = new URL(window.location.href);
	if (threadId) {
		url.searchParams.set("thread", threadId);
	} else {
		url.searchParams.delete("thread");
	}
	if (url.toString() !== window.location.href) {
		window.history.replaceState(null, "", url.toString());
	}
}

/**
 * Shallow-compare two message arrays by identity.
 */
export function areMessageArraysShallowEqual(
	left: ReadonlyArray<RovoUIMessage>,
	right: ReadonlyArray<RovoUIMessage>,
): boolean {
	if (left === right) {
		return true;
	}

	if (left.length !== right.length) {
		return false;
	}

	for (let index = 0; index < left.length; index += 1) {
		if (left[index] !== right[index]) {
			return false;
		}
	}

	return true;
}

/**
 * Generate a unique request ID for plan sessions.
 */
export function createPlanRequestId(): string {
	if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
		return crypto.randomUUID();
	}

	return `plan-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}
