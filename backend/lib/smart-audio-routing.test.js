const test = require("node:test");
const assert = require("node:assert/strict");

const {
	isAudioRequestPrompt,
	resolveSmartAudioVoiceInput,
	toSpeechInputText,
} = require("./smart-audio-routing");

test("isAudioRequestPrompt detects explicit audio requests", () => {
	assert.equal(isAudioRequestPrompt("Can you generate a voice clip?"), true);
	assert.equal(isAudioRequestPrompt("Please narrate this text"), true);
	assert.equal(isAudioRequestPrompt("Build a dashboard for me"), false);
});

test("resolveSmartAudioVoiceInput prefers direct user input for audio intent", () => {
	const result = resolveSmartAudioVoiceInput({
		intent: "audio",
		latestUserMessage: 'make me a simple audio clip that says "HeLLO!"',
		generatedNarrative: "I can't generate audio directly.",
	});

	assert.equal(result.voiceInput, "HeLLO!");
	assert.equal(result.source, "extracted-user-payload");
	assert.equal(result.extractionMode, "quoted");
});

test("resolveSmartAudioVoiceInput prefers direct user input for both intent", () => {
	const result = resolveSmartAudioVoiceInput({
		intent: "both",
		latestUserMessage: "Generate a voice clip that says hello",
		generatedNarrative: "Generated UI summary text.",
	});

	assert.equal(result.voiceInput, "hello");
	assert.equal(result.source, "extracted-user-payload");
	assert.equal(result.extractionMode, "command-pattern");
});

test("resolveSmartAudioVoiceInput falls back to generated narrative only when direct input is unavailable", () => {
	const result = resolveSmartAudioVoiceInput({
		intent: "both",
		latestUserMessage: "   ",
		generatedNarrative: "Fallback narrative for synthesis",
	});

	assert.equal(result.voiceInput, "Fallback narrative for synthesis");
	assert.equal(result.source, "generated-narrative");
});

test("resolveSmartAudioVoiceInput keeps direct-user source for non-command text", () => {
	const result = resolveSmartAudioVoiceInput({
		intent: "audio",
		latestUserMessage: "Release is complete and all systems are healthy.",
		generatedNarrative: null,
	});

	assert.equal(result.voiceInput, "Release is complete and all systems are healthy.");
	assert.equal(result.source, "direct-user");
	assert.equal(result.extractionMode, "fallback-original");
});

test("toSpeechInputText trims and enforces max length", () => {
	assert.equal(toSpeechInputText("  hello  "), "hello");

	const maxChars = 10;
	const longText = "1234567890abcdef";
	const truncated = toSpeechInputText(longText, { maxChars });
	assert.equal(truncated, "123456789…");
	assert.equal(truncated.length, maxChars);
});
