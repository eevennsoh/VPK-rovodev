const assert = require("node:assert/strict");
const test = require("node:test");

const {
	__test__: {
		buildGenerateContentUrl,
		resolveTranscriptionModel,
		STRICT_TRANSCRIPTION_PROMPT,
	},
} = require("./speech-transcription");

test("buildGenerateContentUrl rewrites Google chat completions to generateContent", () => {
	const result = buildGenerateContentUrl(
		"https://example.test/v1/google/v1/chat/completions",
		"gemini-3-flash-preview",
	);

	assert.equal(
		result,
		"https://example.test/v1/google/v1/publishers/google/models/gemini-3-flash-preview:generateContent",
	);
});

test("STRICT_TRANSCRIPTION_PROMPT forbids answer-like rewrites", () => {
	assert.match(STRICT_TRANSCRIPTION_PROMPT, /verbatim/i);
	assert.match(STRICT_TRANSCRIPTION_PROMPT, /do not answer/i);
	assert.match(STRICT_TRANSCRIPTION_PROMPT, /Create me a page about Apple/);
});

test("resolveTranscriptionModel uses GOOGLE_STT_MODEL exactly as configured", () => {
	assert.equal(
		resolveTranscriptionModel("gemini-3-flash-preview"),
		"gemini-3-flash-preview",
	);
	assert.equal(
		resolveTranscriptionModel("gemini-2.5-flash"),
		"gemini-2.5-flash",
	);
});

test("resolveTranscriptionModel throws when GOOGLE_STT_MODEL is missing", () => {
	assert.throws(
		() => resolveTranscriptionModel(""),
		/error: GOOGLE_STT_MODEL must be set/i,
	);
});
