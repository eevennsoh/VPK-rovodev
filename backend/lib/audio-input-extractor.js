const QUOTED_SEGMENT_PATTERN =
	/"([^"\n]{1,4000})"|“([^”\n]{1,4000})”|`([^`\n]{1,4000})`|'([^'\n]{2,4000})'/gu;

const COMMAND_EXTRACTION_PATTERNS = [
	/\b(?:read|say|speak|narrate)\b\s+([\s\S]+?)\s+\b(?:aloud|out\s*loud)\b$/iu,
	/\b(?:read|say|speak|narrate)\b(?:\s+(?:this|that|the\s+text|text|the\s+following|following))?(?:\s+(?:aloud|out\s*loud))?\s*[:,-]\s*([\s\S]+)$/iu,
	/\b(?:that|this)\s+(?:says?|reads?|narrates?|speaks?)\b\s*[:,-]?\s*([\s\S]+)$/iu,
	/\b(?:says?|reads?|narrates?|speaks?)\b\s*[:,-]?\s*([\s\S]+)$/iu,
	/\b(?:make|create|generate|produce|synthesize|render)\b[\s\S]{0,160}?\b(?:audio|voice|speech|tts|voiceover|voice\s*clip|audio\s*clip)\b[\s\S]{0,160}?\b(?:that\s+)?(?:says?|reads?|narrates?|speaks?)\b\s+([\s\S]+)$/iu,
	/\b(?:make|create|generate|produce|synthesize|render)\b[\s\S]{0,160}?\b(?:audio|voice|speech|tts|voiceover|voice\s*clip|audio\s*clip)\b[\s\S]{0,160}?\b(?:for|of)\b\s+([\s\S]+)$/iu,
	/\b(?:read|say|speak|narrate)\b(?:\s+(?:the\s+text|text|the\s+following|following))?\s+([\s\S]+)$/iu,
];

const MAX_DEFAULT_CHARS = 4000;

function getNonEmptyString(value) {
	if (typeof value !== "string") {
		return null;
	}

	const trimmedValue = value.trim();
	return trimmedValue.length > 0 ? trimmedValue : null;
}

function clipToMaxChars(value, maxChars = MAX_DEFAULT_CHARS) {
	const text = getNonEmptyString(value);
	if (!text) {
		return null;
	}

	if (text.length <= maxChars) {
		return text;
	}

	return `${text.slice(0, maxChars - 1)}…`;
}

function collapseWhitespace(value) {
	return value.replace(/\s+/gu, " ").trim();
}

function stripSurroundingQuotes(value) {
	const quoteChars = new Set(['"', "'", "“", "”", "‘", "’", "`"]);
	let text = value.trim();

	while (text.length >= 2) {
		const firstChar = text[0];
		const lastChar = text[text.length - 1];
		if (!quoteChars.has(firstChar) || !quoteChars.has(lastChar)) {
			break;
		}
		text = text.slice(1, -1).trim();
	}

	return text;
}

function normalizeSpeechPayload(value) {
	const text = getNonEmptyString(value);
	if (!text) {
		return null;
	}

	const collapsed = collapseWhitespace(text);
	if (!collapsed) {
		return null;
	}

	const unwrapped = stripSurroundingQuotes(collapsed);
	return getNonEmptyString(unwrapped || collapsed);
}

function sanitizeExtractedPayload(value) {
	const normalized = normalizeSpeechPayload(value);
	if (!normalized) {
		return null;
	}

	const withoutLeadingDelimiters = normalized.replace(/^[\s:,-]+/u, "");
	const withoutTrailingPoliteness = withoutLeadingDelimiters.replace(
		/\s+(?:please|thanks?|thank\s+you)[.!?]*$/iu,
		""
	);

	return normalizeSpeechPayload(withoutTrailingPoliteness);
}

function extractQuotedSpeechPayload(prompt) {
	const text = getNonEmptyString(prompt);
	if (!text) {
		return null;
	}

	const segments = [];
	for (const match of text.matchAll(QUOTED_SEGMENT_PATTERN)) {
		const rawSegment = match[1] || match[2] || match[3] || match[4] || null;
		const normalizedSegment = normalizeSpeechPayload(rawSegment);
		if (!normalizedSegment) {
			continue;
		}
		segments.push(normalizedSegment);
	}

	if (segments.length === 0) {
		return null;
	}

	return normalizeSpeechPayload(segments.join(" "));
}

function extractCommandSpeechPayload(prompt) {
	const text = getNonEmptyString(prompt);
	if (!text) {
		return null;
	}

	for (const pattern of COMMAND_EXTRACTION_PATTERNS) {
		const match = text.match(pattern);
		const extracted = match?.[1] ? sanitizeExtractedPayload(match[1]) : null;
		if (!extracted) {
			continue;
		}
		return extracted;
	}

	return null;
}

function resolveSpeechPayloadFromAudioRequest(prompt, { maxChars = MAX_DEFAULT_CHARS } = {}) {
	const normalizedPrompt = normalizeSpeechPayload(prompt);
	if (!normalizedPrompt) {
		return {
			payload: null,
			mode: null,
		};
	}

	const quotedPayload = extractQuotedSpeechPayload(normalizedPrompt);
	if (quotedPayload) {
		return {
			payload: clipToMaxChars(quotedPayload, maxChars),
			mode: "quoted",
		};
	}

	const commandPayload = extractCommandSpeechPayload(normalizedPrompt);
	if (commandPayload) {
		return {
			payload: clipToMaxChars(commandPayload, maxChars),
			mode: "command-pattern",
		};
	}

	return {
		payload: clipToMaxChars(normalizedPrompt, maxChars),
		mode: "fallback-original",
	};
}

module.exports = {
	clipToMaxChars,
	extractCommandSpeechPayload,
	extractQuotedSpeechPayload,
	normalizeSpeechPayload,
	resolveSpeechPayloadFromAudioRequest,
};
