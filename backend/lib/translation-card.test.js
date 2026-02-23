const test = require("node:test");
const assert = require("node:assert/strict");

const {
	detectDirectTranslationRequest,
	resolveTranslationRequestState,
	createTranslationGenerationPrompt,
	parseTranslationModelOutput,
	resolvePronunciationLabel,
	buildTranslationTextSummary,
	buildTranslationGenuiSpec,
} = require("./translation-card");

test("detectDirectTranslationRequest parses quoted text and target language", () => {
	const parsed = detectDirectTranslationRequest(
		'can you translate the phrase "Let\'s do this together" in mandarin for me?'
	);

	assert.equal(parsed.isTranslationRequest, true);
	assert.equal(parsed.explicitToolingPreference, false);
	assert.equal(parsed.sourceText, "Let's do this together");
	assert.equal(parsed.targetLanguage, "mandarin");
	assert.equal(parsed.needsTargetLanguage, false);
});

test("detectDirectTranslationRequest flags missing target language", () => {
	const parsed = detectDirectTranslationRequest('translate "Let\'s do this together"');

	assert.equal(parsed.isTranslationRequest, true);
	assert.equal(parsed.sourceText, "Let's do this together");
	assert.equal(parsed.targetLanguage, null);
	assert.equal(parsed.needsTargetLanguage, true);
});

test("resolveTranslationRequestState flags missing source and target for generic prompt", () => {
	const parsed = resolveTranslationRequestState("Translate this text");

	assert.equal(parsed.isTranslationRequest, true);
	assert.equal(parsed.sourceText, null);
	assert.equal(parsed.targetLanguage, null);
	assert.equal(parsed.needsSourceText, true);
	assert.equal(parsed.needsTargetLanguage, true);
	assert.equal(parsed.needsClarification, true);
});

test("resolveTranslationRequestState flags missing source text when only target language is provided", () => {
	const parsed = resolveTranslationRequestState("Translate to Japanese");

	assert.equal(parsed.isTranslationRequest, true);
	assert.equal(parsed.sourceText, null);
	assert.equal(parsed.targetLanguage, "Japanese");
	assert.equal(parsed.needsSourceText, true);
	assert.equal(parsed.needsTargetLanguage, false);
	assert.equal(parsed.needsClarification, true);
});

test("resolveTranslationRequestState does not require clarification when source and target are present", () => {
	const parsed = resolveTranslationRequestState('Translate "Hello team" to Spanish');

	assert.equal(parsed.isTranslationRequest, true);
	assert.equal(parsed.sourceText, "Hello team");
	assert.equal(parsed.targetLanguage, "Spanish");
	assert.equal(parsed.needsSourceText, false);
	assert.equal(parsed.needsTargetLanguage, false);
	assert.equal(parsed.needsClarification, false);
});

test("detectDirectTranslationRequest identifies explicit tooling preference", () => {
	const parsed = detectDirectTranslationRequest(
		'Use Google Translate API to translate "Hello team" to Spanish'
	);

	assert.equal(parsed.isTranslationRequest, true);
	assert.equal(parsed.explicitToolingPreference, true);
	assert.equal(parsed.sourceText, "Hello team");
	assert.equal(parsed.targetLanguage, "Spanish");
});

test("createTranslationGenerationPrompt returns null without source/target", () => {
	assert.equal(
		createTranslationGenerationPrompt({
			sourceText: "",
			targetLanguage: "French",
		}),
		null
	);
	assert.equal(
		createTranslationGenerationPrompt({
			sourceText: "Hello",
			targetLanguage: "",
		}),
		null
	);
});

test("parseTranslationModelOutput normalizes structured translation payload", () => {
	const parsed = parseTranslationModelOutput(
		JSON.stringify({
			sourceText: "Let's do this together",
			sourceLanguage: "English",
			targetLanguage: "Mandarin Chinese",
			variants: [
				{
					label: "Natural",
					text: "我们一起做吧",
					pronunciation: "Wǒmen yìqǐ zuò ba",
				},
				{
					label: "Formal",
					text: "让我们一起完成这件事",
					pinyin: "Ràng wǒmen yìqǐ wánchéng zhè jiàn shì",
				},
			],
		})
	);

	assert.equal(parsed.sourceText, "Let's do this together");
	assert.equal(parsed.targetLanguage, "Mandarin Chinese");
	assert.equal(parsed.variants.length, 2);
	assert.equal(parsed.variants[0].id, "natural");
	assert.equal(parsed.variants[1].id, "formal");
	assert.equal(parsed.variants[1].pronunciation, "Ràng wǒmen yìqǐ wánchéng zhè jiàn shì");
});

test("resolvePronunciationLabel uses pinyin for mandarin", () => {
	assert.equal(resolvePronunciationLabel("Mandarin Chinese"), "Pinyin");
	assert.equal(resolvePronunciationLabel("Japanese"), "Romaji");
	assert.equal(resolvePronunciationLabel("French"), "Pronunciation");
});

test("buildTranslationTextSummary includes variant label and target language", () => {
	const summary = buildTranslationTextSummary({
		targetLanguage: "Mandarin",
		variants: [
			{
				label: "Natural",
				text: "我们一起做吧",
			},
		],
	});

	assert.equal(summary, "Natural Mandarin: 我们一起做吧");
});

test("buildTranslationGenuiSpec returns spec with original and translated sections", () => {
	const spec = buildTranslationGenuiSpec({
		sourceText: "Let's do this together",
		sourceLanguage: "English",
		targetLanguage: "Mandarin",
		variants: [
			{
				label: "Natural",
				text: "我们一起做吧",
				pronunciation: "Wǒmen yìqǐ zuò ba",
			},
			{
				label: "Formal",
				text: "让我们一起完成这件事",
			},
		],
	});

	assert.equal(spec.root, "root");
	assert.equal(spec.elements["root"].type, "Stack");
	assert.deepEqual(spec.elements["root"].children, [
		"original-section",
		"separator",
		"translated-section",
	]);
	assert.equal(spec.elements["original-heading"].props.text, "Original (English)");
	assert.equal(spec.elements["original-text"].props.content, "Let's do this together");
	assert.equal(spec.elements["translated-heading"].props.text, "Translated (Mandarin)");
	assert.equal(spec.elements["translated-heading"].props.className, "text-sm font-semibold");
	assert.equal(spec.elements["translated-text"].type, "Heading");
	assert.equal(spec.elements["translated-text"].props.text, "我们一起做吧");
	assert.equal(spec.elements["translated-text"].props.className, "text-lg font-medium");
	assert.equal(spec.elements["separator"].type, "Separator");
});
