const test = require("node:test");
const assert = require("node:assert/strict");

const {
	extractCommandSpeechPayload,
	extractQuotedSpeechPayload,
	resolveSpeechPayloadFromAudioRequest,
} = require("./audio-input-extractor");

test("extractQuotedSpeechPayload returns the quoted phrase", () => {
	assert.equal(
		extractQuotedSpeechPayload('make me a simple audio clip that says "HeLLO!"'),
		"HeLLO!"
	);
});

test("extractQuotedSpeechPayload concatenates multiple quoted phrases", () => {
	assert.equal(extractQuotedSpeechPayload('say "hello" then "world"'), "hello world");
});

test("extractQuotedSpeechPayload supports smart quotes", () => {
	assert.equal(extractQuotedSpeechPayload("read this aloud: “hello there”"), "hello there");
});

test("extractCommandSpeechPayload strips instruction wrappers", () => {
	assert.equal(extractCommandSpeechPayload("read this aloud: hello team"), "hello team");
	assert.equal(extractCommandSpeechPayload("generate a voice clip that says hello"), "hello");
});

test("resolveSpeechPayloadFromAudioRequest keeps payload casing and punctuation", () => {
	const result = resolveSpeechPayloadFromAudioRequest('make audio that says "HeLLO!!!"');
	assert.equal(result.payload, "HeLLO!!!");
	assert.equal(result.mode, "quoted");
});

test("resolveSpeechPayloadFromAudioRequest falls back to original text when no pattern matches", () => {
	const result = resolveSpeechPayloadFromAudioRequest("Weather update tomorrow");
	assert.equal(result.payload, "Weather update tomorrow");
	assert.equal(result.mode, "fallback-original");
});

test("resolveSpeechPayloadFromAudioRequest returns null for empty input", () => {
	const result = resolveSpeechPayloadFromAudioRequest("   ");
	assert.equal(result.payload, null);
	assert.equal(result.mode, null);
});

test("resolveSpeechPayloadFromAudioRequest enforces max length", () => {
	const longPayload = `say "${"a".repeat(30)}"`;
	const result = resolveSpeechPayloadFromAudioRequest(longPayload, { maxChars: 10 });
	assert.equal(result.payload, "aaaaaaaaa…");
	assert.equal(result.payload.length, 10);
	assert.equal(result.mode, "quoted");
});
