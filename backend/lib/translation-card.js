const TRANSLATION_TRIGGER_PATTERN =
	/\b(translate|translation|how\s+do\s+you\s+say|what(?:'s|\s+is)\s+.+\s+in\s+\S+)\b/i;
const EXPLICIT_TRANSLATION_TOOL_PATTERN =
	/\b(google\s+translate|google\s+cloud\s+translate|cloud\s+translation|translation\s+api|use\s+google\s+translate)\b/i;
const TARGET_LANGUAGE_PATTERN =
	/\b(?:in|to|into)\s+([\p{L}][\p{L}\p{N}\s-]{1,40})(?=$|[?.!,]|(?:\s+(?:for|please|now|today|thanks|thank)\b))/iu;
const QUOTED_TEXT_PATTERN = /["“”`]\s*([^"“”`]{1,400}?)\s*["“”`]/;
const MAX_VARIANTS = 3;
const MAX_LINE_LENGTH = 200;

function getNonEmptyString(value) {
	if (typeof value !== "string") {
		return null;
	}

	const trimmedValue = value.trim();
	return trimmedValue.length > 0 ? trimmedValue : null;
}

function normalizeWhitespace(value) {
	return value.replace(/\s+/g, " ").trim();
}

function clipText(value, maxLength = MAX_LINE_LENGTH) {
	const text = getNonEmptyString(value);
	if (!text) {
		return "";
	}

	return text.length <= maxLength ? text : `${text.slice(0, maxLength - 3)}...`;
}

function extractQuotedText(prompt) {
	const match = prompt.match(QUOTED_TEXT_PATTERN);
	if (!match || !match[1]) {
		return null;
	}

	return getNonEmptyString(match[1]);
}

function sanitizeLanguageCandidate(value) {
	const text = getNonEmptyString(value);
	if (!text) {
		return null;
	}

	const withoutTrailingFillers = text
		.replace(/\s+(?:for\s+me|please|thanks?|thank\s+you)\b[\s\S]*$/i, "")
		.replace(/[?.!,]+$/g, "");
	const normalized = normalizeWhitespace(withoutTrailingFillers);
	if (!normalized) {
		return null;
	}

	return clipText(normalized, 40);
}

function extractTargetLanguage(prompt) {
	const match = prompt.match(TARGET_LANGUAGE_PATTERN);
	if (!match || !match[1]) {
		return null;
	}

	return sanitizeLanguageCandidate(match[1]);
}

function stripSurroundingQuotes(value) {
	const text = getNonEmptyString(value);
	if (!text) {
		return null;
	}

	return text
		.replace(/^["'“”`]+/, "")
		.replace(/["'“”`]+$/, "")
		.trim();
}

function extractSourceByPattern(prompt, targetLanguage) {
	const targetPattern = targetLanguage
		? targetLanguage.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
		: "[\\p{L}][\\p{L}\\p{N}\\s-]{1,40}";
	const patterns = [
		new RegExp(
			`\\bhow\\s+do\\s+you\\s+say\\s+([\\s\\S]{1,220}?)\\s+\\b(?:in|to|into)\\s+${targetPattern}\\b`,
			"iu"
		),
		new RegExp(
			`\\btranslate\\s+(?:the\\s+)?(?:phrase|text|sentence|word)?\\s*([\\s\\S]{1,220}?)\\s+\\b(?:in|to|into)\\s+${targetPattern}\\b`,
			"iu"
		),
	];

	for (const pattern of patterns) {
		const match = prompt.match(pattern);
		if (!match || !match[1]) {
			continue;
		}

		const candidate = stripSurroundingQuotes(match[1]);
		if (candidate) {
			return candidate;
		}
	}

	return null;
}

function detectDirectTranslationRequest(prompt) {
	const text = getNonEmptyString(prompt);
	if (!text) {
		return {
			isTranslationRequest: false,
			explicitToolingPreference: false,
			sourceText: null,
			targetLanguage: null,
			needsTargetLanguage: false,
		};
	}

	const normalizedPrompt = normalizeWhitespace(text);
	const isTranslationRequest = TRANSLATION_TRIGGER_PATTERN.test(normalizedPrompt);
	const explicitToolingPreference =
		EXPLICIT_TRANSLATION_TOOL_PATTERN.test(normalizedPrompt);
	if (!isTranslationRequest) {
		return {
			isTranslationRequest: false,
			explicitToolingPreference,
			sourceText: null,
			targetLanguage: null,
			needsTargetLanguage: false,
		};
	}

	const targetLanguage = extractTargetLanguage(normalizedPrompt);
	const sourceText =
		extractQuotedText(normalizedPrompt) ||
		extractSourceByPattern(normalizedPrompt, targetLanguage);

	return {
		isTranslationRequest: true,
		explicitToolingPreference,
		sourceText: sourceText ? clipText(sourceText, 220) : null,
		targetLanguage,
		needsTargetLanguage: Boolean(sourceText) && !targetLanguage,
	};
}

function resolveTranslationRequestState(prompt) {
	const request = detectDirectTranslationRequest(prompt);
	const sourceText = getNonEmptyString(request.sourceText);
	const targetLanguage = sanitizeLanguageCandidate(request.targetLanguage);
	const needsSourceText = request.isTranslationRequest && !sourceText;
	const needsTargetLanguage = request.isTranslationRequest && !targetLanguage;

	return {
		...request,
		sourceText,
		targetLanguage,
		needsSourceText,
		needsTargetLanguage,
		needsClarification: needsSourceText || needsTargetLanguage,
	};
}

function createTranslationGenerationPrompt({
	sourceText,
	targetLanguage,
	variantLevel = "natural+formal",
}) {
	const source = getNonEmptyString(sourceText);
	const target = getNonEmptyString(targetLanguage);
	if (!source || !target) {
		return null;
	}

	return [
		"You translate text accurately and naturally.",
		"Return ONLY strict JSON and no markdown.",
		"",
		"Schema:",
		"{",
		'  "sourceText": "string",',
		'  "sourceLanguage": "string",',
		'  "targetLanguage": "string",',
		'  "variants": [',
		'    { "label": "Natural", "text": "string", "pronunciation": "string", "notes": "string" },',
		'    { "label": "Formal", "text": "string", "pronunciation": "string", "notes": "string" }',
		"  ],",
		'  "notes": "string"',
		"}",
		"",
		"Rules:",
		`- Translate source text into ${target}.`,
		`- Provide ${variantLevel} variants when possible.`,
		"- Keep meaning faithful and avoid adding unrelated content.",
		"- Include pronunciation in Latin script when target script is non-Latin or pronunciation is useful.",
		"- Keep each variant concise and production-ready.",
		"",
		`Source text: ${JSON.stringify(source)}`,
		`Target language: ${JSON.stringify(target)}`,
	].join("\n");
}

function parseJsonFromText(rawText) {
	if (typeof rawText !== "string") {
		return null;
	}

	try {
		return JSON.parse(rawText);
	} catch {
		const objectMatch = rawText.match(/\{[\s\S]*\}/);
		if (!objectMatch) {
			return null;
		}

		try {
			return JSON.parse(objectMatch[0]);
		} catch {
			return null;
		}
	}
}

function getVariantId(label, index) {
	const normalizedLabel = getNonEmptyString(label)?.toLowerCase() || "";
	if (normalizedLabel.includes("natural")) {
		return "natural";
	}
	if (normalizedLabel.includes("formal")) {
		return "formal";
	}
	return `variant-${index + 1}`;
}

function normalizeVariant(variant, index) {
	if (!variant || typeof variant !== "object") {
		return null;
	}

	const text =
		getNonEmptyString(variant.text) ||
		getNonEmptyString(variant.translation) ||
		getNonEmptyString(variant.value);
	if (!text) {
		return null;
	}

	const label =
		getNonEmptyString(variant.label) ||
		getNonEmptyString(variant.style) ||
		`Variant ${index + 1}`;

	return {
		id: getVariantId(label, index),
		label: clipText(label, 32),
		text: clipText(text, 280),
		pronunciation:
			getNonEmptyString(variant.pronunciation) ||
			getNonEmptyString(variant.transliteration) ||
			getNonEmptyString(variant.pinyin) ||
			undefined,
		notes:
			getNonEmptyString(variant.notes) ||
			getNonEmptyString(variant.note) ||
			getNonEmptyString(variant.description) ||
			undefined,
	};
}

function parseTranslationModelOutput(rawText, defaults = {}) {
	const parsed = parseJsonFromText(rawText);
	if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
		return null;
	}

	const sourceText =
		getNonEmptyString(parsed.sourceText) ||
		getNonEmptyString(defaults.sourceText);
	const targetLanguage =
		sanitizeLanguageCandidate(parsed.targetLanguage) ||
		sanitizeLanguageCandidate(defaults.targetLanguage);
	if (!sourceText || !targetLanguage) {
		return null;
	}

	let variants = [];
	if (Array.isArray(parsed.variants)) {
		variants = parsed.variants
			.map((variant, index) => normalizeVariant(variant, index))
			.filter(Boolean)
			.slice(0, MAX_VARIANTS);
	}

	if (variants.length === 0) {
		const fallbackText =
			getNonEmptyString(parsed.translation) ||
			getNonEmptyString(parsed.translatedText);
		if (fallbackText) {
			variants = [
				{
					id: "natural",
					label: "Natural",
					text: clipText(fallbackText, 280),
				},
			];
		}
	}

	if (variants.length === 0) {
		return null;
	}

	return {
		sourceText: clipText(sourceText, 240),
		sourceLanguage: getNonEmptyString(parsed.sourceLanguage) || undefined,
		targetLanguage,
		variants,
		notes: getNonEmptyString(parsed.notes) || undefined,
	};
}

function resolvePronunciationLabel(targetLanguage) {
	const normalizedLanguage = getNonEmptyString(targetLanguage)?.toLowerCase() || "";
	if (!normalizedLanguage) {
		return "Pronunciation";
	}
	if (/\b(mandarin|chinese)\b/.test(normalizedLanguage)) {
		return "Pinyin";
	}
	if (/\bjapanese\b/.test(normalizedLanguage)) {
		return "Romaji";
	}
	if (/\bkorean\b/.test(normalizedLanguage)) {
		return "Romanization";
	}
	if (/\barabic\b/.test(normalizedLanguage)) {
		return "Transliteration";
	}
	return "Pronunciation";
}

function buildTranslationTextSummary(payload) {
	if (!payload || typeof payload !== "object" || !Array.isArray(payload.variants)) {
		return "Translation completed.";
	}

	const firstVariant = payload.variants.find(
		(variant) => variant && typeof variant.text === "string"
	);
	if (!firstVariant) {
		return `Translated to ${payload.targetLanguage || "the target language"}.`;
	}

	return `${firstVariant.label || "Natural"} ${payload.targetLanguage || "translation"}: ${firstVariant.text}`;
}

function buildTranslationGenuiSpec(payload) {
	if (
		!payload ||
		typeof payload !== "object" ||
		!Array.isArray(payload.variants) ||
		payload.variants.length === 0
	) {
		return null;
	}

	const sourceLanguageLabel = payload.sourceLanguage || "English";
	const firstVariant = payload.variants[0];

	return {
		root: "root",
		elements: {
			root: {
				type: "Stack",
				props: { direction: "vertical", gap: "md" },
				children: ["original-section", "separator", "translated-section"],
			},
			"original-section": {
				type: "Stack",
				props: { direction: "vertical", gap: "sm" },
				children: ["original-heading", "original-text"],
			},
			"original-heading": {
				type: "Heading",
				props: {
					text: `Original (${sourceLanguageLabel})`,
					level: "h4",
					className: null,
				},
			},
			"original-text": {
				type: "Text",
				props: { content: payload.sourceText, muted: null },
			},
			separator: {
				type: "Separator",
				props: { orientation: "horizontal" },
			},
			"translated-section": {
				type: "Stack",
				props: { direction: "vertical", gap: "sm" },
				children: ["translated-heading", "translated-text"],
			},
			"translated-heading": {
				type: "Heading",
				props: {
					text: `Translated (${payload.targetLanguage})`,
					level: "h4",
					className: "text-sm font-semibold",
				},
			},
			"translated-text": {
				type: "Heading",
				props: {
					text: firstVariant.text,
					level: "h4",
					className: "text-lg font-medium",
				},
			},
		},
	};
}

module.exports = {
	detectDirectTranslationRequest,
	resolveTranslationRequestState,
	createTranslationGenerationPrompt,
	parseTranslationModelOutput,
	resolvePronunciationLabel,
	buildTranslationTextSummary,
	buildTranslationGenuiSpec,
};
