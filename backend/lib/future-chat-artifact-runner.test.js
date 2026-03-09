const test = require("node:test");
const assert = require("node:assert/strict");

const {
	generateAndPersistFutureChatArtifact,
	resolvePersistedFutureChatArtifactTitle,
} = require("./future-chat-artifact-runner");

test("resolvePersistedFutureChatArtifactTitle uses extracted content titles before model fallback", async () => {
	let generatedTitleCalls = 0;

	const title = await resolvePersistedFutureChatArtifactTitle({
		artifactAction: "createDocument",
		content: "# Shipping Plan\n\nDraft body.",
		fallbackTitle: "Artifact draft",
		latestUserMessage: "Create a shipping plan",
		resolveGeneratedTitle: async () => {
			generatedTitleCalls += 1;
			return "Model title";
		},
	});

	assert.equal(title, "Shipping Plan");
	assert.equal(generatedTitleCalls, 0);
});

test("resolvePersistedFutureChatArtifactTitle falls back to model title when local heuristics fail", async () => {
	const title = await resolvePersistedFutureChatArtifactTitle({
		artifactAction: "createDocument",
		content: "{\n}\n",
		fallbackTitle: "Artifact draft",
		latestUserMessage: "Make me something",
		resolveGeneratedTitle: async () => "\"Generated title.\"",
	});

	assert.equal(title, "Generated title");
});

test("resolvePersistedFutureChatArtifactTitle keeps fallback title when model fallback fails", async () => {
	const title = await resolvePersistedFutureChatArtifactTitle({
		artifactAction: "createDocument",
		content: "{\n}\n",
		fallbackTitle: "My fallback",
		latestUserMessage: "Make me something",
		resolveGeneratedTitle: async () => {
			throw new Error("gateway failed");
		},
	});

	assert.equal(title, "My fallback");
});

test("generateAndPersistFutureChatArtifact cleans up failed create shells", async () => {
	const cleanupCalls = [];

	await assert.rejects(
		generateAndPersistFutureChatArtifact({
			artifactAction: "createDocument",
			artifactDocument: {
				id: "doc-shell-1",
				title: "Draft",
				kind: "text",
			},
			changeLabel: "Created",
			fallbackTitle: "Draft",
			latestUserMessage: "Create a plan",
			generateArtifactText: async () => {
				throw new Error("rovodev failed");
			},
			inferArtifactKindFromContent: () => "text",
			futureChatDocumentManager: {
				appendDocumentVersion: async () => null,
				finalizeDocumentShell: async () => null,
			},
			onCreateFailure: async ({ error }) => {
				cleanupCalls.push(error.message);
			},
		}),
		/rovodev failed/,
	);

	assert.deepEqual(cleanupCalls, ["rovodev failed"]);
});

test("generateAndPersistFutureChatArtifact does not run create cleanup for update failures", async () => {
	let cleanupCalls = 0;

	await assert.rejects(
		generateAndPersistFutureChatArtifact({
			artifactAction: "updateDocument",
			artifactDocument: {
				id: "doc-1",
				title: "Draft",
				kind: "text",
			},
			changeLabel: "Updated",
			fallbackTitle: "Draft",
			latestUserMessage: "Rewrite it",
			generateArtifactText: async () => "Updated body",
			inferArtifactKindFromContent: () => "text",
			futureChatDocumentManager: {
				appendDocumentVersion: async () => {
					throw new Error("append failed");
				},
				finalizeDocumentShell: async () => null,
			},
			onCreateFailure: async () => {
				cleanupCalls += 1;
			},
		}),
		/append failed/,
	);

	assert.equal(cleanupCalls, 0);
});
