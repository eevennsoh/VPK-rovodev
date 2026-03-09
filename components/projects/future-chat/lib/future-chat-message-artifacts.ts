import type { FutureChatStreamingArtifact } from "@/components/projects/future-chat/lib/future-chat-streaming-artifact";
import type {
	FutureChatDocument,
	FutureChatDocumentKind,
} from "@/lib/future-chat-types";
import {
	getMessageArtifactResult,
	type RovoDataParts,
	type RovoUIMessage,
} from "@/lib/rovo-ui-messages";

export interface FutureChatPendingArtifactResult {
	action: RovoDataParts["artifact-result"]["action"] | null;
	documentId: string | null;
	kind: FutureChatDocumentKind;
	title: string;
}

export interface FutureChatMessageArtifactDisplay {
	action: RovoDataParts["artifact-result"]["action"] | null;
	displayMode: "preview" | "chip";
	document: FutureChatDocument | null;
	documentId: string;
	isStreaming: boolean;
	kind: FutureChatDocumentKind;
	previewContent: string;
	title: string;
}

function getLatestDocumentContent(document: FutureChatDocument | null): string {
	if (!document || document.versions.length === 0) {
		return "";
	}

	return document.versions[document.versions.length - 1]?.content ?? "";
}

export function resolveFutureChatMessageArtifactDisplay({
	visibleDocumentId,
	documents,
	message,
	pendingArtifactResult,
	streamingArtifact,
	streamingArtifactMessageId,
}: Readonly<{
	visibleDocumentId: string | null;
	documents: ReadonlyArray<FutureChatDocument>;
	message: Pick<RovoUIMessage, "id" | "parts">;
	pendingArtifactResult: FutureChatPendingArtifactResult | null;
	streamingArtifact: FutureChatStreamingArtifact | null;
	streamingArtifactMessageId: string | null;
}>): FutureChatMessageArtifactDisplay | null {
	const messageArtifact = getMessageArtifactResult(message);
	const pendingArtifact =
		streamingArtifactMessageId === message.id ? pendingArtifactResult : null;
	const documentId =
		messageArtifact?.documentId ??
		pendingArtifact?.documentId ??
		(streamingArtifactMessageId === message.id ? streamingArtifact?.documentId : null) ??
		null;

	if (!documentId) {
		return null;
	}

	const document = documents.find((candidate) => candidate.id === documentId) ?? null;
	const isStreaming =
		streamingArtifactMessageId === message.id &&
		streamingArtifact?.documentId === documentId;

	return {
		action: messageArtifact?.action ?? pendingArtifact?.action ?? null,
		displayMode: visibleDocumentId === documentId ? "chip" : "preview",
		document,
		documentId,
		isStreaming,
		kind:
			(isStreaming ? streamingArtifact?.kind : null) ??
			messageArtifact?.kind ??
			pendingArtifact?.kind ??
			document?.kind ??
			"text",
		previewContent: isStreaming
			? streamingArtifact?.content ?? ""
			: getLatestDocumentContent(document),
		title:
			(isStreaming ? streamingArtifact?.title : null) ??
			messageArtifact?.title ??
			pendingArtifact?.title ??
			document?.title ??
			"Artifact",
	};
}
