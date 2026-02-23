const test = require("node:test");
const assert = require("node:assert/strict");

const {
	AUDIO_CONTEXT_LITERAL_OPTION_ID,
	collectAudioTextCandidates,
	isContextReferentialAudioRequest,
	resolveReferencedAudioText,
	buildAudioContextClarificationPayload,
	resolveAudioContextVoiceInputFromClarification,
} = require("./audio-context-resolution");

function createTextMessage(id, role, text, metadata) {
	return {
		id,
		role,
		metadata,
		parts: [{ type: "text", text }],
	};
}

test("isContextReferentialAudioRequest detects references to prior chat context", () => {
	assert.equal(
		isContextReferentialAudioRequest(
			"make a voice clip for the entire poem in the above chat"
		),
		true
	);
	assert.equal(
		isContextReferentialAudioRequest(
			'make a voice clip that says "hello world"'
		),
		false
	);
});

test("resolveReferencedAudioText resolves the best contextual candidate", () => {
	const messages = [
		createTextMessage("user-1", "user", "Write a poem about AI."),
		createTextMessage(
			"assistant-1",
			"assistant",
			[
				"Here's a poem about AI:",
				"",
				"Silicon Dreams",
				"In circuits deep where electrons dance, a mind unfolds.",
			].join("\n")
		),
		createTextMessage(
			"user-2",
			"user",
			"make a voice clip for the Silicon Dreams poem, the entire poem in the above chat"
		),
	];

	const result = resolveReferencedAudioText({
		latestUserMessage: messages[2].parts[0].text,
		messages,
	});

	assert.equal(result.status, "resolved");
	assert.equal(result.referential, true);
	assert.match(result.voiceInput || "", /Silicon Dreams/);
	assert.ok(result.confidence >= 0.72);
	assert.ok(Array.isArray(result.candidates));
	assert.ok(result.candidates.length >= 1);
});

test("buildAudioContextClarificationPayload creates a single-select question card", () => {
	const latestUserMessage = "make a voice clip for the poem above";
	const candidates = [
		{
			optionId: "audio-context-option-assistant-1-message-text",
			text: "Silicon Dreams poem version one",
			preview: "Silicon Dreams poem version one",
			messageRole: "assistant",
			candidateKind: "message-text",
		},
		{
			optionId: "audio-context-option-assistant-2-message-text",
			text: "Silicon Dreams poem version two",
			preview: "Silicon Dreams poem version two",
			messageRole: "assistant",
			candidateKind: "message-text",
		},
	];

	const payload = buildAudioContextClarificationPayload({
		latestUserMessage,
		candidates,
	});

	assert.equal(payload?.type, "question-card");
	assert.equal(Array.isArray(payload?.questions), true);
	assert.equal(payload?.questions[0]?.id, "audio_source");
	assert.equal(payload?.questions[0]?.kind, "single-select");
	assert.equal(
		payload?.questions[0]?.options.some(
			(option) => option.id === AUDIO_CONTEXT_LITERAL_OPTION_ID
		),
		true
	);
});

test("resolveAudioContextVoiceInputFromClarification maps option IDs back to candidate text", () => {
	const latestVisibleUserMessage = "make a voice clip for the Silicon Dreams poem above";
	const messages = [
		createTextMessage("user-1", "user", "Write a poem about AI."),
		createTextMessage(
			"assistant-1",
			"assistant",
			"Silicon Dreams\nIn circuits deep where electrons dance, a mind unfolds."
		),
	];
	const candidates = collectAudioTextCandidates(messages, {
		latestUserMessage: latestVisibleUserMessage,
	});
	assert.ok(candidates.length >= 1);

	const clarificationSubmission = {
		sessionId: "audio-context-clarification-123",
		round: 1,
		completed: true,
		answers: {
			audio_source: candidates[0].optionId,
		},
	};

	const result = resolveAudioContextVoiceInputFromClarification({
		clarificationSubmission,
		messages,
		latestVisibleUserMessage,
	});

	assert.equal(result.source, "context-reference");
	assert.match(result.voiceInput || "", /Silicon Dreams/);
});

test("resolveAudioContextVoiceInputFromClarification supports literal and custom script answers", () => {
	const latestVisibleUserMessage = "Read this exact sentence aloud please";
	const messages = [];

	const literalResult = resolveAudioContextVoiceInputFromClarification({
		clarificationSubmission: {
			sessionId: "audio-context-clarification-456",
			round: 1,
			completed: true,
			answers: {
				audio_source: AUDIO_CONTEXT_LITERAL_OPTION_ID,
			},
		},
		messages,
		latestVisibleUserMessage,
	});
	assert.equal(literalResult.source, "clarification-literal");
	assert.equal(literalResult.voiceInput, "Read this exact sentence aloud please");

	const customResult = resolveAudioContextVoiceInputFromClarification({
		clarificationSubmission: {
			sessionId: "audio-context-clarification-789",
			round: 1,
			completed: true,
			answers: {
				audio_source: "Please read only this custom script.",
			},
		},
		messages,
		latestVisibleUserMessage,
	});
	assert.equal(customResult.source, "clarification-custom-script");
	assert.equal(customResult.voiceInput, "Please read only this custom script.");
});
