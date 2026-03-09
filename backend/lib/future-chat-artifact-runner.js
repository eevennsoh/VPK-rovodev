const {
	extractFutureChatRequestedTitle,
} = require("./future-chat-artifact-updates");
const {
	extractFutureChatArtifactTitleFromContent,
	sanitizeFutureChatArtifactTitle,
} = require("./future-chat-artifact-titles");

async function resolvePersistedFutureChatArtifactTitle({
	artifactAction,
	content,
	fallbackTitle,
	latestUserMessage,
	resolveGeneratedTitle,
}) {
	const requestedTitle =
		artifactAction === "updateDocument"
			? extractFutureChatRequestedTitle({ latestUserMessage })
			: null;
	if (requestedTitle) {
		return requestedTitle;
	}

	const extractedTitle = extractFutureChatArtifactTitleFromContent(content);
	if (extractedTitle) {
		return extractedTitle;
	}

	if (typeof resolveGeneratedTitle === "function") {
		try {
			const generatedTitle = sanitizeFutureChatArtifactTitle(
				await resolveGeneratedTitle({ content }),
			);
			if (generatedTitle) {
				return generatedTitle;
			}
		} catch {
			// Title generation is best-effort. Fall back to the local title below.
		}
	}

	return sanitizeFutureChatArtifactTitle(fallbackTitle) || "Artifact draft";
}

async function generateAndPersistFutureChatArtifact({
	artifactAction,
	artifactDocument,
	changeLabel,
	fallbackTitle,
	latestUserMessage,
	generateArtifactText,
	inferArtifactKindFromContent,
	futureChatDocumentManager,
	onCreateFailure,
	onTextDelta,
	resolveGeneratedTitle,
}) {
	let shouldRunCreateFailureCleanup = artifactAction === "createDocument" &&
		typeof onCreateFailure === "function";

	try {
		const assistantText = await generateArtifactText({ onTextDelta });
		const normalizedAssistantText =
			typeof assistantText === "string" ? assistantText.trim() : "";
		if (!normalizedAssistantText) {
			throw new Error("Future Chat artifact generation returned no content.");
		}

		const contentToPersist = normalizedAssistantText;
		const finalArtifactTitle = await resolvePersistedFutureChatArtifactTitle({
			artifactAction,
			content: contentToPersist,
			fallbackTitle,
			latestUserMessage,
			resolveGeneratedTitle,
		});
		const persistedArtifactDocument = {
			...artifactDocument,
			title: finalArtifactTitle,
			kind: inferArtifactKindFromContent(
				contentToPersist,
				artifactDocument.kind,
			),
		};

		let persistedDocument = null;
		if (artifactAction === "updateDocument") {
			persistedDocument =
				await futureChatDocumentManager.appendDocumentVersion(
					persistedArtifactDocument.id,
					{
						changeLabel,
						content: contentToPersist,
						title: persistedArtifactDocument.title,
						kind: persistedArtifactDocument.kind,
					},
				);
		} else {
			persistedDocument =
				await futureChatDocumentManager.finalizeDocumentShell(
					persistedArtifactDocument.id,
					{
						changeLabel,
						content: contentToPersist,
						title: persistedArtifactDocument.title,
						kind: persistedArtifactDocument.kind,
					},
				);
		}

		if (!persistedDocument) {
			throw new Error("Future Chat artifact document could not be persisted.");
		}

		shouldRunCreateFailureCleanup = false;

		return {
			contentToPersist,
			persistedArtifactDocument,
			titleChanged:
				persistedArtifactDocument.title !== artifactDocument.title,
			kindChanged:
				persistedArtifactDocument.kind !== artifactDocument.kind,
		};
	} catch (error) {
		if (shouldRunCreateFailureCleanup) {
			try {
				await onCreateFailure({ error });
			} catch {
				// Preserve the original generation failure.
			}
		}

		throw error;
	}
}

module.exports = {
	generateAndPersistFutureChatArtifact,
	resolvePersistedFutureChatArtifactTitle,
};
