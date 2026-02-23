const test = require("node:test");
const assert = require("node:assert/strict");

const {
	detectDirectTranslationRequest,
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
	assert.equal(spec.elements["translated-text"].props.content, "我们一起做吧");
	assert.equal(spec.elements["separator"].type, "Separator");
});
