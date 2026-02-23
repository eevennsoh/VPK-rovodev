const test = require("node:test");
const assert = require("node:assert/strict");

const {
	isAudioRequestPrompt,
	resolveSmartAudioVoiceInput,
	stripConversationalFiller,
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

test("resolveSmartAudioVoiceInput resolves context-referential prompts from prior chat messages", () => {
	const assistantPoem = [
		"Here's a poem about AI:",
		"",
		"Silicon Dreams",
		"In circuits deep where electrons dance, a mind unfolds.",
	].join("\n");

	const result = resolveSmartAudioVoiceInput({
		intent: "audio",
		latestUserMessage:
			"make a voice clip for the Silicon Dreams poem, the entire poem in the above chat",
		messages: [
			{
				id: "user-1",
				role: "user",
				parts: [{ type: "text", text: "Write a poem about AI." }],
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
	assert.match(result.voiceInput || "", /Silicon Dreams/);
});

test("resolveSmartAudioVoiceInput resolves title-only prompts using prior context when confidence is high", () => {
	const assistantPoem = [
		"Silicon Dreams",
		"In circuits deep and networks wide, A consciousness begins to glide.",
		"Electric synapses that fire and dance, Give machines their fleeting chance.",
	].join("\n");

	const result = resolveSmartAudioVoiceInput({
		intent: "audio",
		latestUserMessage: 'generate an audio about "Silicon Dreams"',
		messages: [
			{
				id: "user-1",
				role: "user",
				parts: [{ type: "text", text: "write me a poem about AI" }],
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
	assert.match(result.voiceInput || "", /Electric synapses/);
});

test("resolveSmartAudioVoiceInput asks for clarification when implicit title match is ambiguous", () => {
	const result = resolveSmartAudioVoiceInput({
		intent: "audio",
		latestUserMessage: 'generate an audio about "Silicon Dreams"',
		messages: [
			{
				id: "assistant-a",
				role: "assistant",
				parts: [{ type: "text", text: "Silicon Dreams\nVersion one with four stanzas and a reflective ending." }],
			},
			{
				id: "assistant-b",
				role: "assistant",
				parts: [{ type: "text", text: "Silicon Dreams\nVersion two with two stanzas and a concise ending." }],
			},
		],
		contextAmbiguityThreshold: 0.5,
	});

	assert.equal(result.voiceInput, null);
	assert.equal(result.needsClarification, true);
	assert.equal(result.source, null);
	assert.equal(typeof result.clarificationPayload, "object");
});

test("resolveSmartAudioVoiceInput keeps explicit literal requests as direct payload", () => {
	const result = resolveSmartAudioVoiceInput({
		intent: "audio",
		latestUserMessage: 'say "Silicon Dreams" exactly',
		messages: [
			{
				id: "assistant-1",
				role: "assistant",
				parts: [{ type: "text", text: "Silicon Dreams\nA longer prior poem body." }],
			},
		],
	});

	assert.equal(result.source, "extracted-user-payload");
	assert.equal(result.voiceInput, "Silicon Dreams");
	assert.equal(result.needsClarification, false);
});

test("resolveSmartAudioVoiceInput requests clarification when context resolution is low confidence", () => {
	const result = resolveSmartAudioVoiceInput({
		intent: "audio",
		latestUserMessage: "make a voice clip for the poem above",
		messages: [
			{
				id: "assistant-a",
				role: "assistant",
				parts: [{ type: "text", text: "Silicon Dreams poem first version with four stanzas." }],
			},
			{
				id: "assistant-b",
				role: "assistant",
				parts: [{ type: "text", text: "Silicon Dreams poem revised version with two stanzas." }],
			},
		],
		contextConfidenceThreshold: 0.999,
	});

	assert.equal(result.voiceInput, null);
	assert.equal(result.needsClarification, true);
	assert.equal(result.source, null);
	assert.equal(typeof result.clarificationPayload, "object");
});

test("toSpeechInputText trims and enforces max length", () => {
	assert.equal(toSpeechInputText("  hello  "), "hello");

	const maxChars = 10;
	const longText = "1234567890abcdef";
	const truncated = toSpeechInputText(longText, { maxChars });
	assert.equal(truncated, "123456789…");
	assert.equal(truncated.length, maxChars);
});

test("stripConversationalFiller removes leading filler phrases", () => {
	assert.equal(
		stripConversationalFiller("I'd be happy to write a poem about Atlassian! Here's one for you: The code runs fast."),
		"The code runs fast."
	);
	assert.equal(
		stripConversationalFiller("Sure! Here is your poem: Roses are red."),
		"Roses are red."
	);
	assert.equal(
		stripConversationalFiller("Of course! The sky is blue."),
		"The sky is blue."
	);
});

test("stripConversationalFiller removes trailing filler phrases", () => {
	assert.equal(
		stripConversationalFiller("Roses are red. Would you like me to adjust the tone?"),
		"Roses are red."
	);
	assert.equal(
		stripConversationalFiller("The poem is done. Let me know if you want changes."),
		"The poem is done."
	);
});

test("stripConversationalFiller removes markdown separators at boundaries", () => {
	assert.equal(
		stripConversationalFiller("--- Hello world ---"),
		"Hello world"
	);
});

test("stripConversationalFiller preserves text without filler", () => {
	const cleanText = "Roses are red, violets are blue.";
	assert.equal(stripConversationalFiller(cleanText), cleanText);
});

test("stripConversationalFiller returns original text when stripping would leave it empty", () => {
	assert.equal(
		stripConversationalFiller("Sure!"),
		"Sure!"
	);
});

test("stripConversationalFiller handles null/undefined/empty inputs", () => {
	assert.equal(stripConversationalFiller(null), null);
	assert.equal(stripConversationalFiller(undefined), undefined);
	assert.equal(stripConversationalFiller(""), "");
});

test("toSpeechInputText applies filler stripping before length enforcement", () => {
	const input = "I'd be happy to help! Here's what I wrote: The quick brown fox jumps.";
	const result = toSpeechInputText(input);
	assert.equal(result, "The quick brown fox jumps.");
});
