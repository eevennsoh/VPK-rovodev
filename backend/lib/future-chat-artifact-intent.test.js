const test = require("node:test");
const assert = require("node:assert/strict");

const {
	buildFutureChatArtifactIntentPrompt,
	fallbackFutureChatArtifactIntent,
	normalizeArtifactKind,
	parseFutureChatArtifactIntent,
} = require("./future-chat-artifact-intent");

test("parseFutureChatArtifactIntent normalizes createDocument payload", () => {
	const parsed = parseFutureChatArtifactIntent(
		JSON.stringify({
			action: "createDocument",
			title: "Robot Gardening Memo",
			kind: "text",
		}),
	);

	assert.deepEqual(parsed, {
		action: "createDocument",
		title: "Robot Gardening Memo",
		kind: "text",
	});
});

test("parseFutureChatArtifactIntent falls back to chat when update lacks active artifact", () => {
	const parsed = parseFutureChatArtifactIntent(
		JSON.stringify({
			action: "updateDocument",
			title: "New title",
			kind: "code",
		}),
	);

	assert.deepEqual(parsed, {
		action: "chat",
		title: null,
		kind: null,
	});
});

test("fallbackFutureChatArtifactIntent handles explicit artifact follow-up", () => {
	const parsed = fallbackFutureChatArtifactIntent({
		activeArtifact: {
			id: "doc-1",
			title: "Robot Gardening Memo",
			kind: "text",
		},
		latestUserMessage: "create an artifact about it",
	});

	assert.equal(parsed.action, "updateDocument");
	assert.equal(parsed.title, "Robot Gardening Memo");
	assert.equal(parsed.kind, "text");
});

test("normalizeArtifactKind maps spreadsheet aliases", () => {
	assert.equal(normalizeArtifactKind("spreadsheet"), "sheet");
	assert.equal(normalizeArtifactKind("table"), "sheet");
});

test("buildFutureChatArtifactIntentPrompt includes current artifact context", () => {
	const prompt = buildFutureChatArtifactIntentPrompt({
		activeArtifact: { id: "doc-1", title: "Memo", kind: "text" },
		conversationHistory: [{ type: "user", content: "Write a memo." }],
		latestUserMessage: "Make it shorter.",
	});

	assert.match(prompt, /Current open artifact:/);
	assert.match(prompt, /Latest user request:/);
});
