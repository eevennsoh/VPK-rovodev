const assert = require("node:assert/strict");
const test = require("node:test");

const {
	resolveFutureChatMessageArtifactDisplay,
} = require("./future-chat-message-artifacts.ts");

function createAssistantMessage(id, artifactResult = null) {
	return {
		id,
		role: "assistant",
		parts: artifactResult
			? [
					{
						type: "data-artifact-result",
						data: artifactResult,
					},
				]
			: [],
	};
}

function createDocument({
	id,
	title,
	content,
	updatedAt,
}) {
	return {
		id,
		threadId: "thread-1",
		title,
		kind: "text",
		sourceMessageId: null,
		createdAt: updatedAt,
		updatedAt,
		versions: [
			{
				changeLabel: "Created",
				id: `${id}-version`,
				content,
				createdAt: updatedAt,
				title,
			},
		],
	};
}

test("keeps per-message artifact ownership across create, update, and new create turns", () => {
	const documents = [
		createDocument({
			id: "doc-apple",
			title: "APPLE YO",
			content: "# APPLE YO\n\nUpdated Apple content",
			updatedAt: "2026-03-09T10:10:00.000Z",
		}),
		createDocument({
			id: "doc-orange",
			title: "Orange",
			content: "# Orange\n\nFresh Orange content",
			updatedAt: "2026-03-09T10:20:00.000Z",
		}),
	];
	const messages = [
		createAssistantMessage("assistant-apple-create", {
			action: "create",
			documentId: "doc-apple",
			kind: "text",
			title: "Apple",
		}),
		createAssistantMessage("assistant-apple-update", {
			action: "update",
			documentId: "doc-apple",
			kind: "text",
			title: "APPLE YO",
		}),
		createAssistantMessage("assistant-orange-create", {
			action: "create",
			documentId: "doc-orange",
			kind: "text",
			title: "Orange",
		}),
	];

	const resolvedDisplays = messages.map((message) =>
		resolveFutureChatMessageArtifactDisplay({
			visibleDocumentId: "doc-orange",
			documents,
			message,
			pendingArtifactResult: null,
			streamingArtifact: null,
			streamingArtifactMessageId: null,
		}),
	);

	assert.deepEqual(
		resolvedDisplays.map((display) => display?.documentId),
		["doc-apple", "doc-apple", "doc-orange"],
	);
	assert.deepEqual(
		resolvedDisplays.map((display) => display?.displayMode),
		["preview", "preview", "chip"],
	);
	assert.deepEqual(
		resolvedDisplays.map((display) => display?.title),
		["Apple", "APPLE YO", "Orange"],
	);
});

test("uses pending artifact state for the current streaming assistant turn", () => {
	const display = resolveFutureChatMessageArtifactDisplay({
		visibleDocumentId: null,
		documents: [],
		message: createAssistantMessage("assistant-streaming"),
		pendingArtifactResult: {
			action: null,
			documentId: "doc-orange",
			kind: "text",
			title: "Orange",
		},
		streamingArtifact: {
			content: "# Orange\n\nStreaming draft",
			documentId: "doc-orange",
			createdAt: "2026-03-09T10:30:00.000Z",
			kind: "text",
			status: "streaming",
			title: "Orange",
			updatedAt: "2026-03-09T10:30:10.000Z",
		},
		streamingArtifactMessageId: "assistant-streaming",
	});

	assert.equal(display?.documentId, "doc-orange");
	assert.equal(display?.isStreaming, true);
	assert.equal(display?.previewContent, "# Orange\n\nStreaming draft");
	assert.equal(display?.displayMode, "preview");
});

test("collapses the open artifact message into chip mode", () => {
	const display = resolveFutureChatMessageArtifactDisplay({
		visibleDocumentId: "doc-orange",
		documents: [
			createDocument({
				id: "doc-orange",
				title: "Orange",
				content: "# Orange\n\nSaved content",
				updatedAt: "2026-03-09T10:40:00.000Z",
			}),
		],
		message: createAssistantMessage("assistant-orange", {
			action: "create",
			documentId: "doc-orange",
			kind: "text",
			title: "Orange",
		}),
		pendingArtifactResult: null,
		streamingArtifact: null,
		streamingArtifactMessageId: null,
	});

	assert.equal(display?.displayMode, "chip");
	assert.equal(display?.previewContent, "# Orange\n\nSaved content");
});
