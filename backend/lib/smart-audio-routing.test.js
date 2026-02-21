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
		latestUserMessage: "Sing this in a voice clip",
		generatedNarrative: "I can't generate audio directly.",
	});

	assert.equal(result.voiceInput, "Sing this in a voice clip");
	assert.equal(result.source, "direct-user");
});

test("resolveSmartAudioVoiceInput prefers direct user input for both intent", () => {
	const result = resolveSmartAudioVoiceInput({
		intent: "both",
		latestUserMessage: "Generate audio for this summary",
		generatedNarrative: "Generated UI summary text.",
	});

	assert.equal(result.voiceInput, "Generate audio for this summary");
	assert.equal(result.source, "direct-user");
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

test("toSpeechInputText trims and enforces max length", () => {
	assert.equal(toSpeechInputText("  hello  "), "hello");

	const maxChars = 10;
	const longText = "1234567890abcdef";
	const truncated = toSpeechInputText(longText, { maxChars });
	assert.equal(truncated, "123456789…");
	assert.equal(truncated.length, maxChars);
});
