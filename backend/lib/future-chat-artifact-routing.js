const { normalizeArtifactKind } = require("./future-chat-artifact-intent");
const { getNonEmptyString } = require("./shared-utils");

function getLatestFutureChatDocumentContent(document) {
	if (!document || !Array.isArray(document.versions) || document.versions.length === 0) {
		return "";
	}

	return typeof document.versions[document.versions.length - 1]?.content === "string"
		? document.versions[document.versions.length - 1].content
		: "";
}

function normalizeArtifactContext(rawArtifactContext) {
	if (!rawArtifactContext || typeof rawArtifactContext !== "object") {
		return null;
	}

	const content = getNonEmptyString(rawArtifactContext.content);
	if (!content) {
		return null;
	}

	return {
		content,
		id: getNonEmptyString(rawArtifactContext.id),
		kind: normalizeArtifactKind(rawArtifactContext.kind),
		title: getNonEmptyString(rawArtifactContext.title) || "Untitled artifact",
	};
}

async function resolveFutureChatActiveArtifact({
	activeDocumentId,
	artifactContext,
	futureChatDocumentManager,
	futureChatThreadManager,
	threadId,
}) {
	const normalizedArtifactContext = normalizeArtifactContext(artifactContext);
	const normalizedThreadId = getNonEmptyString(threadId);
	const normalizedActiveDocumentId = getNonEmptyString(activeDocumentId);
	const persistedThread =
		normalizedThreadId && futureChatThreadManager?.getThread
			? await futureChatThreadManager.getThread(normalizedThreadId)
			: null;
	const candidateDocumentIds = [
		normalizedActiveDocumentId,
		normalizedArtifactContext?.id ?? null,
		getNonEmptyString(persistedThread?.activeDocumentId),
	].filter((value, index, values) => value && values.indexOf(value) === index);

	for (const documentId of candidateDocumentIds) {
		const document = await futureChatDocumentManager?.getDocument?.(documentId);
		if (!document) {
			continue;
		}
		if (normalizedThreadId && document.threadId !== normalizedThreadId) {
			continue;
		}

		return {
			activeArtifact: {
				content:
					normalizedArtifactContext?.content || getLatestFutureChatDocumentContent(document),
				id: document.id,
				kind: normalizeArtifactKind(normalizedArtifactContext?.kind || document.kind),
				title: normalizedArtifactContext?.title || document.title,
			},
			activeDocument: document,
			thread: persistedThread,
		};
	}

	return {
		activeArtifact: normalizedArtifactContext,
		activeDocument: null,
		thread: persistedThread,
	};
}

module.exports = {
	getLatestFutureChatDocumentContent,
	resolveFutureChatActiveArtifact,
};
