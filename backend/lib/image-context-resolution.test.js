const test = require("node:test");
const assert = require("node:assert/strict");

const {
	IMAGE_CONTEXT_LITERAL_OPTION_ID,
	collectImageContextCandidates,
	isContextReferentialImageRequest,
	resolveReferencedImageContext,
	buildImageContextClarificationPayload,
	resolveImageContextFromClarification,
} = require("./image-context-resolution");

function createTextMessage(id, role, text, metadata) {
	return {
		id,
		role,
		metadata,
		parts: [{ type: "text", text }],
	};
}

function createMessageWithWidget(id, role, text, widgetData) {
	return {
		id,
		role,
		parts: [
			{ type: "text", text },
			{ type: "data-widget-data", data: widgetData },
		],
	};
}

test("isContextReferentialImageRequest detects references to prior chat context", () => {
	assert.equal(
		isContextReferentialImageRequest(
			"generate an image of the character we discussed above"
		),
		true
	);
	assert.equal(
		isContextReferentialImageRequest(
			"draw that dragon from the previous message"
		),
		true
	);
	assert.equal(
		isContextReferentialImageRequest(
			"illustrate the scene described earlier"
		),
		true
	);
	assert.equal(
		isContextReferentialImageRequest(
			"make an image based on the poem above"
		),
		true
	);
	assert.equal(
		isContextReferentialImageRequest(
			"generate an image of a sunset over the ocean"
		),
		false
	);
});

test("resolveReferencedImageContext resolves the best contextual candidate", () => {
	const messages = [
		createTextMessage("user-1", "user", "Write me something creative."),
		createTextMessage(
			"assistant-1",
			"assistant",
			[
				"The Dragon's Flight",
				"Scales of emerald gleaming bright, wings that catch the morning light.",
				"A creature ancient, fierce and free, soaring high above the sea.",
				"Through thunderclouds it carves its way, a shadow born of night and day.",
			].join("\n")
		),
		createTextMessage(
			"user-2",
			"user",
			"generate an image of the Dragon's Flight poem, the entire poem in the above chat"
		),
	];

	const result = resolveReferencedImageContext({
		latestUserMessage: messages[2].parts[0].text,
		messages,
	});

	assert.equal(result.status, "resolved");
	assert.equal(result.referential, true);
	assert.match(result.contextText || "", /Dragon's Flight/);
	assert.ok(result.confidence >= 0.72);
	assert.ok(Array.isArray(result.candidates));
	assert.ok(result.candidates.length >= 1);
});

test("resolveReferencedImageContext returns not-referential for direct requests", () => {
	const messages = [
		createTextMessage("assistant-1", "assistant", "Here is some text."),
	];

	const result = resolveReferencedImageContext({
		latestUserMessage: "generate an image of a sunset",
		messages,
	});
	assert.equal(result.status, "not-referential");
	assert.equal(result.referential, false);
});

test("collectImageContextCandidates collects image-prompt widgets", () => {
	const messages = [
		createMessageWithWidget(
			"assistant-1",
			"assistant",
			"Here is your image.",
			{
				type: "image-preview",
				payload: {
					prompt: "A majestic dragon flying over snow-capped mountains at sunset",
				},
			}
		),
	];

	const candidates = collectImageContextCandidates(messages, {
		latestUserMessage: "draw that again",
	});

	assert.ok(candidates.length >= 1);
	const imagePromptCandidate = candidates.find(
		(c) => c.candidateKind === "image-prompt"
	);
	assert.ok(imagePromptCandidate);
	assert.match(imagePromptCandidate.text, /majestic dragon/);
});

test("collectImageContextCandidates collects genui-description widgets", () => {
	const messages = [
		createMessageWithWidget(
			"assistant-1",
			"assistant",
			"Here is a dashboard.",
			{
				type: "genui-preview",
				payload: {
					summary: "A project management dashboard with Kanban board, timeline view, and task metrics",
				},
			}
		),
	];

	const candidates = collectImageContextCandidates(messages, {
		latestUserMessage: "make an image of that dashboard",
	});

	const genuiCandidate = candidates.find(
		(c) => c.candidateKind === "genui-description"
	);
	assert.ok(genuiCandidate);
	assert.match(genuiCandidate.text, /Kanban board/);
});

test("resolveReferencedImageContext returns ambiguous when candidates score close", () => {
	const messages = [
		createTextMessage(
			"assistant-a",
			"assistant",
			"The brave knight rode through the enchanted forest, sword gleaming in the moonlight."
		),
		createTextMessage(
			"assistant-b",
			"assistant",
			"The wise wizard stood atop the ancient tower, staff crackling with arcane energy."
		),
	];

	const result = resolveReferencedImageContext({
		latestUserMessage: "draw the character from above",
		messages,
		ambiguityThreshold: 0.5,
	});

	assert.equal(result.status, "ambiguous");
	assert.equal(result.referential, true);
	assert.equal(result.contextText, null);
});

test("buildImageContextClarificationPayload creates a single-select question card", () => {
	const latestUserMessage = "draw the scene from above";
	const candidates = [
		{
			optionId: "image-context-option-assistant-1-message-text",
			text: "A dragon soaring over mountains",
			preview: "A dragon soaring over mountains",
			messageRole: "assistant",
			candidateKind: "message-text",
		},
		{
			optionId: "image-context-option-assistant-2-message-text",
			text: "A wizard casting a spell in a tower",
			preview: "A wizard casting a spell in a tower",
			messageRole: "assistant",
			candidateKind: "message-text",
		},
	];

	const payload = buildImageContextClarificationPayload({
		latestUserMessage,
		candidates,
	});

	assert.equal(payload?.type, "question-card");
	assert.equal(Array.isArray(payload?.questions), true);
	assert.equal(payload?.questions[0]?.id, "image_context");
	assert.equal(payload?.questions[0]?.kind, "single-select");
	assert.equal(
		payload?.questions[0]?.options.some(
			(option) => option.id === IMAGE_CONTEXT_LITERAL_OPTION_ID
		),
		true
	);
	assert.match(payload?.title, /Choose context for the image/);
});

test("resolveImageContextFromClarification maps option IDs back to candidate text", () => {
	const latestVisibleUserMessage = "draw the dragon from the poem above";
	const messages = [
		createTextMessage("user-1", "user", "Write a poem about a dragon."),
		createTextMessage(
			"assistant-1",
			"assistant",
			"The Dragon's Flight\nScales of emerald gleaming bright, wings that catch the morning light."
		),
	];
	const candidates = collectImageContextCandidates(messages, {
		latestUserMessage: latestVisibleUserMessage,
	});
	assert.ok(candidates.length >= 1);

	const clarificationSubmission = {
		sessionId: "image-context-clarification-123",
		round: 1,
		completed: true,
		answers: {
			image_context: candidates[0].optionId,
		},
	};

	const result = resolveImageContextFromClarification({
		clarificationSubmission,
		messages,
		latestVisibleUserMessage,
	});

	assert.equal(result.source, "context-reference");
	assert.match(result.contextText || "", /Dragon's Flight/);
});

test("resolveImageContextFromClarification supports literal and custom description answers", () => {
	const latestVisibleUserMessage = "draw the scene from the story above";
	const messages = [];

	const literalResult = resolveImageContextFromClarification({
		clarificationSubmission: {
			sessionId: "image-context-clarification-456",
			round: 1,
			completed: true,
			answers: {
				image_context: IMAGE_CONTEXT_LITERAL_OPTION_ID,
			},
		},
		messages,
		latestVisibleUserMessage,
	});
	assert.equal(literalResult.source, "clarification-literal");
	assert.equal(literalResult.contextText, "draw the scene from the story above");

	const customResult = resolveImageContextFromClarification({
		clarificationSubmission: {
			sessionId: "image-context-clarification-789",
			round: 1,
			completed: true,
			answers: {
				image_context: "A fierce red dragon breathing fire over a castle",
			},
		},
		messages,
		latestVisibleUserMessage,
	});
	assert.equal(customResult.source, "clarification-custom-description");
	assert.equal(customResult.contextText, "A fierce red dragon breathing fire over a castle");
});

test("collectImageContextCandidates skips hidden and clarification-submit messages", () => {
	const messages = [
		createTextMessage(
			"hidden-1",
			"assistant",
			"This is a hidden message with enough text to be substantive.",
			{ visibility: "hidden" }
		),
		createTextMessage(
			"clarification-1",
			"user",
			"This is a clarification submission with enough text content.",
			{ source: "clarification-submit" }
		),
		createTextMessage(
			"normal-1",
			"assistant",
			"The brave knight charged into battle with sword raised high."
		),
	];

	const candidates = collectImageContextCandidates(messages, {
		latestUserMessage: "draw the character",
	});

	assert.equal(candidates.length, 1);
	assert.match(candidates[0].text, /brave knight/);
});

test("collectImageContextCandidates deduplicates identical text", () => {
	const duplicatedText = "A beautiful mountain landscape with snow-capped peaks and a clear lake.";
	const messages = [
		createTextMessage("msg-1", "assistant", duplicatedText),
		createTextMessage("msg-2", "assistant", duplicatedText),
	];

	const candidates = collectImageContextCandidates(messages, {
		latestUserMessage: "draw that",
	});

	assert.equal(candidates.length, 1);
});
