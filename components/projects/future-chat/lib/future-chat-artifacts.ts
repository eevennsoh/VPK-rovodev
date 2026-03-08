import type { FutureChatDocument } from "@/lib/future-chat-types";

function getDocumentTimestamp(document: FutureChatDocument): number {
	const timestamp = Date.parse(document.updatedAt);
	return Number.isFinite(timestamp) ? timestamp : 0;
}

export function sortFutureChatArtifacts(
	documents: ReadonlyArray<FutureChatDocument>,
): FutureChatDocument[] {
	return [...documents].sort((left, right) => {
		return getDocumentTimestamp(right) - getDocumentTimestamp(left);
	});
}

export function getFutureChatPrimaryArtifact(
	documents: ReadonlyArray<FutureChatDocument>,
	activeDocumentId: string | null,
): FutureChatDocument | null {
	if (documents.length === 0) {
		return null;
	}

	if (activeDocumentId) {
		const activeDocument = documents.find((document) => document.id === activeDocumentId) ?? null;
		if (activeDocument) {
			return activeDocument;
		}
	}

	return sortFutureChatArtifacts(documents)[0] ?? null;
}
