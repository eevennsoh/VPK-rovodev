"use client";

import type {
	FutureChatDocument,
	FutureChatThread,
	FutureChatVisibility,
	FutureChatVote,
} from "@/lib/future-chat-types";
import { API_ENDPOINTS } from "@/lib/api-config";
import type { RovoUIMessage } from "@/lib/rovo-ui-messages";

async function parseJsonResponse<T>(response: Response): Promise<T> {
	if (!response.ok) {
		let message = `Request failed with status ${response.status}`;
		try {
			const payload = (await response.json()) as { error?: unknown; details?: unknown };
			if (typeof payload.error === "string" && payload.error.trim()) {
				message = payload.error.trim();
			} else if (typeof payload.details === "string" && payload.details.trim()) {
				message = payload.details.trim();
			}
		} catch {
			const text = await response.text().catch(() => "");
			if (text.trim()) {
				message = text.trim();
			}
		}
		throw new Error(message);
	}

	return response.json() as Promise<T>;
}

export async function listFutureChatThreads(): Promise<FutureChatThread[]> {
	const response = await fetch(API_ENDPOINTS.futureChatThreads(), {
		method: "GET",
	});
	const payload = await parseJsonResponse<{ threads?: FutureChatThread[] }>(response);
	return Array.isArray(payload.threads) ? payload.threads : [];
}

export async function getFutureChatThread(threadId: string): Promise<FutureChatThread | null> {
	const response = await fetch(API_ENDPOINTS.futureChatThread(threadId), {
		method: "GET",
	});
	if (response.status === 404) {
		return null;
	}
	const payload = await parseJsonResponse<{ thread?: FutureChatThread }>(response);
	return payload.thread ?? null;
}

export async function createFutureChatThread(input: {
	id: string;
	title: string;
	messages?: ReadonlyArray<RovoUIMessage>;
	visibility: FutureChatVisibility;
	modelId?: string | null;
	provider?: string | null;
	activeDocumentId?: string | null;
}): Promise<FutureChatThread> {
	const response = await fetch(API_ENDPOINTS.FUTURE_CHAT_THREADS, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(input),
	});
	const payload = await parseJsonResponse<{ thread?: FutureChatThread }>(response);
	if (!payload.thread) {
		throw new Error("Future Chat thread response was missing a thread.");
	}
	return payload.thread;
}

export async function updateFutureChatThread(
	threadId: string,
	input: {
		title?: string;
		messages?: ReadonlyArray<RovoUIMessage>;
		visibility?: FutureChatVisibility;
		modelId?: string | null;
		provider?: string | null;
		activeDocumentId?: string | null;
	},
): Promise<FutureChatThread> {
	const response = await fetch(API_ENDPOINTS.futureChatThread(threadId), {
		method: "PUT",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(input),
	});
	const payload = await parseJsonResponse<{ thread?: FutureChatThread }>(response);
	if (!payload.thread) {
		throw new Error("Future Chat update response was missing a thread.");
	}
	return payload.thread;
}

export async function deleteFutureChatThread(threadId: string): Promise<void> {
	const response = await fetch(API_ENDPOINTS.futureChatThread(threadId), {
		method: "DELETE",
	});
	await parseJsonResponse<{ deleted?: boolean }>(response);
}

export async function deleteAllFutureChatThreads(): Promise<void> {
	const response = await fetch(`${API_ENDPOINTS.FUTURE_CHAT_THREADS}?all=true`, {
		method: "DELETE",
	});
	await parseJsonResponse<{ deleted?: boolean }>(response);
}

export async function listFutureChatVotes(threadId: string): Promise<FutureChatVote[]> {
	const response = await fetch(`${API_ENDPOINTS.FUTURE_CHAT_VOTES}?threadId=${encodeURIComponent(threadId)}`, {
		method: "GET",
	});
	const payload = await parseJsonResponse<{ votes?: FutureChatVote[] }>(response);
	return Array.isArray(payload.votes) ? payload.votes : [];
}

export async function setFutureChatVote(input: {
	threadId: string;
	messageId: string;
	value: "up" | "down" | null;
}): Promise<FutureChatVote> {
	const response = await fetch(API_ENDPOINTS.FUTURE_CHAT_VOTES, {
		method: "PATCH",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(input),
	});
	const payload = await parseJsonResponse<{ vote?: FutureChatVote }>(response);
	if (!payload.vote) {
		throw new Error("Future Chat vote response was missing a vote.");
	}
	return payload.vote;
}

export async function listFutureChatDocuments(threadId: string): Promise<FutureChatDocument[]> {
	const response = await fetch(`${API_ENDPOINTS.FUTURE_CHAT_DOCUMENTS}?threadId=${encodeURIComponent(threadId)}`, {
		method: "GET",
	});
	const payload = await parseJsonResponse<{ documents?: FutureChatDocument[] }>(response);
	return Array.isArray(payload.documents) ? payload.documents : [];
}

export async function getFutureChatDocument(documentId: string): Promise<FutureChatDocument | null> {
	const response = await fetch(`${API_ENDPOINTS.FUTURE_CHAT_DOCUMENTS}?documentId=${encodeURIComponent(documentId)}`, {
		method: "GET",
	});
	if (response.status === 404) {
		return null;
	}
	const payload = await parseJsonResponse<{ document?: FutureChatDocument }>(response);
	return payload.document ?? null;
}

export async function saveFutureChatDocument(input: {
	documentId?: string;
	threadId?: string;
	title?: string;
	kind?: string;
	content: string;
	sourceMessageId?: string;
}): Promise<FutureChatDocument> {
	const response = await fetch(API_ENDPOINTS.FUTURE_CHAT_DOCUMENTS, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(input),
	});
	const payload = await parseJsonResponse<{ document?: FutureChatDocument }>(response);
	if (!payload.document) {
		throw new Error("Future Chat document response was missing a document.");
	}
	return payload.document;
}

export async function deleteFutureChatDocument(documentId: string): Promise<void> {
	const response = await fetch(`${API_ENDPOINTS.FUTURE_CHAT_DOCUMENTS}?documentId=${encodeURIComponent(documentId)}`, {
		method: "DELETE",
	});
	await parseJsonResponse<{ deleted?: boolean }>(response);
}
