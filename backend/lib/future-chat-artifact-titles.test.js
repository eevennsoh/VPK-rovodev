const test = require("node:test");
const assert = require("node:assert/strict");

const {
	deriveFutureChatArtifactTitle,
	extractFutureChatArtifactTitleFromContent,
} = require("./future-chat-artifact-titles");

test("deriveFutureChatArtifactTitle uses the latest create request instead of the active artifact title", () => {
	const title = deriveFutureChatArtifactTitle({
		action: "createDocument",
		activeArtifact: {
			id: "doc-orange",
			title: "orange big orange",
		},
		conversationHistory: [
			{ type: "user", content: "Create me a page about Orange" },
			{ type: "assistant", content: "Created artifact." },
		],
		decisionTitle: null,
		latestUserMessage: "Create a page about Apple",
	});

	assert.equal(title, "Apple");
});

test("deriveFutureChatArtifactTitle preserves the active artifact title as the update fallback", () => {
	const title = deriveFutureChatArtifactTitle({
		action: "updateDocument",
		activeArtifact: {
			id: "doc-orange",
			title: "orange big orange",
		},
		conversationHistory: [
			{ type: "user", content: "Create me a page about Orange" },
		],
		decisionTitle: null,
		latestUserMessage: "Make it more playful",
	});

	assert.equal(title, "orange big orange");
});

test("extractFutureChatArtifactTitleFromContent prefers markdown headings", () => {
	assert.equal(
		extractFutureChatArtifactTitleFromContent("# Apple Future\n\nBody copy."),
		"Apple Future",
	);
});

test("extractFutureChatArtifactTitleFromContent can read HTML title tags", () => {
	assert.equal(
		extractFutureChatArtifactTitleFromContent("<html><head><title>Apple Inc. Overview</title></head><body></body></html>"),
		"Apple Inc. Overview",
	);
});
