const test = require("node:test");
const assert = require("node:assert/strict");

const {
	extractImageSubject,
	buildEnrichedImagePrompt,
	resolveSmartImagePrompt,
} = require("./smart-image-routing");

test("extractImageSubject extracts subject from explicit image requests", () => {
	const result = extractImageSubject("generate an image of a sunset over the ocean");
	assert.equal(result.subject, "a sunset over the ocean");
	assert.equal(result.mode, "extracted");
});

test("extractImageSubject extracts subject from draw commands", () => {
	const result = extractImageSubject("draw a red dragon flying over mountains");
	assert.equal(result.subject, "a red dragon flying over mountains");
	assert.equal(result.mode, "extracted");
});

test("extractImageSubject falls back to full message when no pattern matches", () => {
	const result = extractImageSubject("sunset over the ocean");
	assert.equal(result.subject, "sunset over the ocean");
	assert.equal(result.mode, "fallback-original");
});

test("extractImageSubject returns null for empty input", () => {
	const result = extractImageSubject("   ");
	assert.equal(result.subject, null);
	assert.equal(result.mode, null);
});

test("buildEnrichedImagePrompt combines context with user message", () => {
	const result = buildEnrichedImagePrompt({
		userMessage: "draw the dragon",
		contextText: "A fierce red dragon with emerald scales soaring above snow-capped peaks.",
	});

	assert.ok(result.prompt);
	assert.ok(result.systemInstruction);
	assert.match(result.systemInstruction, /Referenced context/);
	assert.match(result.systemInstruction, /fierce red dragon/);
	assert.equal(result.prompt, "draw the dragon");
});

test("buildEnrichedImagePrompt returns no system instruction without context", () => {
	const result = buildEnrichedImagePrompt({
		userMessage: "draw a sunset",
		contextText: null,
	});

	assert.equal(result.prompt, "draw a sunset");
	assert.equal(result.systemInstruction, null);
});

test("buildEnrichedImagePrompt handles both null inputs", () => {
	const result = buildEnrichedImagePrompt({
		userMessage: null,
		contextText: null,
	});

	assert.equal(result.prompt, null);
	assert.equal(result.systemInstruction, null);
});

test("resolveSmartImagePrompt resolves context-referential prompts from prior chat", () => {
	const assistantPoem = [
		"The Dragon's Flight",
		"Scales of emerald gleaming bright, wings that catch the morning light.",
		"A creature ancient, fierce and free, soaring high above the sea.",
		"Through thunderclouds it carves its way, a shadow born of night and day.",
	].join("\n");

	const result = resolveSmartImagePrompt({
		latestUserMessage:
			"generate an image of the Dragon's Flight poem, the entire poem in the above chat",
		messages: [
			{
				id: "user-1",
				role: "user",
				parts: [{ type: "text", text: "Write me something creative." }],
			},
			{
				id: "assistant-1",
				role: "assistant",
				parts: [{ type: "text", text: assistantPoem }],
			},
		],
	});

	assert.equal(result.needsClarification, false);
	assert.equal(result.source, "context-reference");
	assert.ok(result.imagePrompt);
	assert.ok(result.systemInstruction);
	assert.match(result.systemInstruction, /Dragon's Flight/);
});

test("resolveSmartImagePrompt returns direct prompt for non-referential requests", () => {
	const result = resolveSmartImagePrompt({
		latestUserMessage: "generate an image of a sunset over the ocean",
		messages: [],
	});

	assert.equal(result.needsClarification, false);
	assert.equal(result.source, "direct-user");
	assert.ok(result.imagePrompt);
	assert.equal(result.systemInstruction, null);
});

test("resolveSmartImagePrompt requests clarification when ambiguous", () => {
	const result = resolveSmartImagePrompt({
		latestUserMessage: "draw the character from above",
		messages: [
			{
				id: "assistant-a",
				role: "assistant",
				parts: [
					{
						type: "text",
						text: "The brave knight rode through the enchanted forest, sword gleaming in the moonlight.",
					},
				],
			},
			{
				id: "assistant-b",
				role: "assistant",
				parts: [
					{
						type: "text",
						text: "The wise wizard stood atop the ancient tower, staff crackling with arcane energy.",
					},
				],
			},
		],
		contextAmbiguityThreshold: 0.5,
	});

	assert.equal(result.imagePrompt, null);
	assert.equal(result.needsClarification, true);
	assert.equal(typeof result.clarificationPayload, "object");
});

test("resolveSmartImagePrompt handles empty input", () => {
	const result = resolveSmartImagePrompt({
		latestUserMessage: "   ",
		messages: [],
	});

	assert.equal(result.imagePrompt, null);
	assert.equal(result.source, null);
	assert.equal(result.needsClarification, false);
});

test("resolveSmartImagePrompt requests clarification on not-found referential", () => {
	const result = resolveSmartImagePrompt({
		latestUserMessage: "draw that thing from earlier",
		messages: [],
	});

	assert.equal(result.needsClarification, true);
	assert.equal(result.imagePrompt, null);
});
