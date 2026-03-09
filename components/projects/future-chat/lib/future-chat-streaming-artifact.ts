import type { FutureChatDocumentKind } from "@/lib/future-chat-types";

export interface FutureChatStreamingArtifact {
	content: string;
	documentId: string | null;
	createdAt: string;
	kind: FutureChatDocumentKind;
	status: "streaming" | "idle";
	title: string;
	updatedAt: string;
}

export interface FutureChatStreamingArtifactCheckpoint {
	content: string;
	documentId: string;
	kind: FutureChatDocumentKind;
	title: string;
}

export function getFutureChatStreamingArtifactCheckpoint(
	artifact: FutureChatStreamingArtifact | null,
): FutureChatStreamingArtifactCheckpoint | null {
	if (!artifact?.documentId) {
		return null;
	}

	if (!artifact.content.trim()) {
		return null;
	}

	return {
		content: artifact.content,
		documentId: artifact.documentId,
		kind: artifact.kind,
		title: artifact.title,
	};
}

export function appendFutureChatStreamingArtifactDelta({
	current,
	delta,
	kind,
	timestamp,
}: Readonly<{
	current: FutureChatStreamingArtifact | null;
	delta: string;
	kind?: FutureChatDocumentKind;
	timestamp: string;
}>): FutureChatStreamingArtifact {
	return {
		content: `${current?.content ?? ""}${delta}`,
		documentId: current?.documentId ?? null,
		createdAt: current?.createdAt ?? timestamp,
		kind: kind ?? current?.kind ?? "text",
		status: "streaming",
		title: current?.title ?? "Artifact draft",
		updatedAt: timestamp,
	};
}
