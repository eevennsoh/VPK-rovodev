const {
	clipToMaxChars,
	normalizeSpeechPayload,
} = require("./audio-input-extractor");

const { getNonEmptyString, extractTextFromUiParts } = require("./shared-utils");

const AUDIO_CONTEXT_CLARIFICATION_SESSION_PREFIX = "audio-context-clarification-";
const AUDIO_CONTEXT_QUESTION_ID = "audio_source";
const AUDIO_CONTEXT_LITERAL_OPTION_ID = "audio-context-literal-request";
const AUDIO_CONTEXT_OPTION_PREFIX = "audio-context-option-";

const DEFAULT_CONTEXT_WINDOW_SIZE = 16;
const DEFAULT_CANDIDATE_LIMIT = 24;
const DEFAULT_CLARIFICATION_OPTION_LIMIT = 3;
const DEFAULT_CONFIDENCE_THRESHOLD = 0.72;
const DEFAULT_AMBIGUITY_THRESHOLD = 0.08;
const DEFAULT_MIN_SUBSTANTIVE_CHARS = 24;

const QUOTED_SEGMENT_PATTERN =
	/"([^"\n]{2,200})"|"([^"\n]{2,200})"|`([^`\n]{2,200})`|'([^'\n]{2,200})'/gu;

const CONTEXT_REFERENTIAL_PATTERNS = [
	/\b(?:above|earlier|previous|prior|same|entire|full|whole)\b/i,
	/\b(?:in|from)\s+(?:the\s+)?(?:above\s+)?(?:chat|conversation)\b/i,
	/\b(?:last|previous)\s+(?:response|message|reply)\b/i,
	/\b(?:that|this|it)\s+(?:poem|story|article|summary|text|response|message)\b/i,
	/\b(?:poem|story|article|summary|text|response|message)\b[\s\S]{0,24}\b(?:above|previous|earlier|entire|full|whole|that|this|it)\b/i,
];

const REFERENCE_PHRASE_PATTERNS = [
	/\b(?:for|about|from|of)\s+(?:the\s+)?([a-z0-9][a-z0-9\s'-]{2,80})\s+(?:poem|story|article|summary|response|message|text)\b/giu,
	/\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,5})\s+(?:poem|story|article|summary|response|message|text)\b/gu,
];

const STOPWORDS = new Set([
	"a",
	"an",
	"and",
	"are",
	"as",
	"at",
	"be",
	"but",
	"by",
	"can",
	"clip",
	"create",
	"do",
	"for",
	"from",
	"generate",
	"i",
	"in",
	"is",
	"it",
	"make",
	"of",
	"on",
	"or",
	"please",
	"read",
	"say",
	"speak",
	"speech",
	"tell",
	"text",
	"that",
	"the",
	"this",
	"to",
	"tts",
	"voice",
	"with",
]);
function sanitizeOptionToken(value) {
	return String(value)
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/-+/g, "-")
		.replace(/^-|-$/g, "");
}

function buildCandidateOptionId({
	messageId,
	messageIndex,
	candidateKind,
}) {
	const candidateKindToken = sanitizeOptionToken(candidateKind || "text") || "text";
	const sourceToken = messageId
		? sanitizeOptionToken(messageId)
		: `idx-${messageIndex}`;
	return `${AUDIO_CONTEXT_OPTION_PREFIX}${sourceToken}-${candidateKindToken}`;
}

function clipText(value, maxChars = 120) {
	const normalizedValue = getNonEmptyString(value);
	if (!normalizedValue) {
		return "";
	}

	if (normalizedValue.length <= maxChars) {
		return normalizedValue;
	}

	return `${normalizedValue.slice(0, Math.max(1, maxChars - 3)).trimEnd()}...`;
}

function collapseWhitespace(value) {
	return value.replace(/\s+/gu, " ").trim();
}

function getFirstNonEmptyLine(value) {
	const normalizedValue = getNonEmptyString(value);
	if (!normalizedValue) {
		return "";
	}

	const firstNonEmptyLine = normalizedValue
		.split(/\r?\n/gu)
		.map((line) => line.trim())
		.find((line) => line.length > 0);

	return firstNonEmptyLine ? collapseWhitespace(firstNonEmptyLine) : "";
}

function tokenizeForScoring(value) {
	const normalizedValue = getNonEmptyString(value);
	if (!normalizedValue) {
		return [];
	}

	const tokens = normalizedValue.toLowerCase().match(/[a-z0-9]+/gu) || [];
	return tokens.filter((token) => token.length >= 3 && !STOPWORDS.has(token));
}

function toTokenSet(value) {
	return new Set(tokenizeForScoring(value));
}

function computeLexicalOverlapScore(requestTokenSet, candidateTokenSet) {
	if (!requestTokenSet || !candidateTokenSet) {
		return 0;
	}

	if (requestTokenSet.size === 0 || candidateTokenSet.size === 0) {
		return 0;
	}

	let overlapCount = 0;
	for (const token of requestTokenSet) {
		if (candidateTokenSet.has(token)) {
			overlapCount += 1;
		}
	}

	if (overlapCount === 0) {
		return 0;
	}

	const denominator = requestTokenSet.size + candidateTokenSet.size;
	if (denominator <= 0) {
		return 0;
	}

	// Sorensen-Dice coefficient.
	return Math.min(1, (2 * overlapCount) / denominator);
}

function extractReferencePhrases(latestUserMessage) {
	const normalizedMessage = getNonEmptyString(latestUserMessage);
	if (!normalizedMessage) {
		return [];
	}

	const seenPhrases = new Set();
	const phrases = [];
	for (const match of normalizedMessage.matchAll(QUOTED_SEGMENT_PATTERN)) {
		const phrase = getNonEmptyString(
			match[1] || match[2] || match[3] || match[4] || ""
		);
		if (!phrase) {
			continue;
		}

		const normalizedPhrase = phrase.toLowerCase();
		if (seenPhrases.has(normalizedPhrase)) {
			continue;
		}

		seenPhrases.add(normalizedPhrase);
		phrases.push(phrase);
	}

	for (const pattern of REFERENCE_PHRASE_PATTERNS) {
		for (const match of normalizedMessage.matchAll(pattern)) {
			const phrase = getNonEmptyString(match[1]);
			if (!phrase || phrase.length < 3) {
				continue;
			}

			const normalizedPhrase = phrase.toLowerCase();
			if (seenPhrases.has(normalizedPhrase)) {
				continue;
			}

			seenPhrases.add(normalizedPhrase);
			phrases.push(phrase);
		}
	}

	return phrases;
}

function isContextReferentialAudioRequest(latestUserMessage) {
	const normalizedMessage = getNonEmptyString(latestUserMessage);
	if (!normalizedMessage) {
		return false;
	}

	return CONTEXT_REFERENTIAL_PATTERNS.some((pattern) =>
		pattern.test(normalizedMessage)
	);
}

function scoreCandidate({
	candidate,
	latestUserMessage,
	requestTokenSet,
	referencePhrases,
	totalCandidates,
}) {
	const candidateTokenSet = toTokenSet(candidate.text);
	const lexicalOverlapScore = computeLexicalOverlapScore(
		requestTokenSet,
		candidateTokenSet
	);

	const phraseMatchScore = referencePhrases.reduce((score, phrase) => {
		const normalizedPhrase = phrase.toLowerCase();
		if (!normalizedPhrase) {
			return score;
		}
		if (candidate.text.toLowerCase().includes(normalizedPhrase)) {
			return score + 0.18;
		}
		return score;
	}, 0);
	const candidateHeading = getFirstNonEmptyLine(candidate.text).toLowerCase();
	const titleLineMatchScore = referencePhrases.reduce((score, phrase) => {
		const normalizedPhrase = collapseWhitespace(phrase).toLowerCase();
		if (!normalizedPhrase || normalizedPhrase.length < 3) {
			return score;
		}

		if (candidateHeading === normalizedPhrase) {
			return Math.max(score, 0.24);
		}

		if (
			candidateHeading.startsWith(`${normalizedPhrase} `) ||
			candidateHeading.includes(normalizedPhrase)
		) {
			return Math.max(score, 0.18);
		}

		return score;
	}, 0);

	const normalizedLatestMessage = getNonEmptyString(latestUserMessage);
	const explicitTitlePrefixScore =
		normalizedLatestMessage &&
		candidate.text
			.toLowerCase()
			.startsWith(collapseWhitespace(normalizedLatestMessage).toLowerCase())
			? 0.08
			: 0;

	const recencyRatio =
		totalCandidates > 0
			? (totalCandidates - candidate.recencyRank) / totalCandidates
			: 0;
	const recencyScore = Math.min(0.26, Math.max(0, recencyRatio) * 0.26);

	const roleScore = candidate.messageRole === "assistant" ? 0.08 : 0.02;

	const textLength = candidate.text.length;
	let lengthScore = 0;
	if (textLength >= 120 && textLength <= 2600) {
		lengthScore = 0.14;
	} else if (textLength >= 60 && textLength <= 3200) {
		lengthScore = 0.08;
	} else if (textLength >= 24) {
		lengthScore = 0.04;
	}

	const compositeScore =
		lexicalOverlapScore * 0.48 +
		Math.min(0.36, phraseMatchScore) +
		Math.min(0.24, titleLineMatchScore) +
		explicitTitlePrefixScore +
		recencyScore +
		roleScore +
		lengthScore;

	return {
		...candidate,
		lexicalOverlapScore,
		phraseMatchScore: Math.min(0.36, phraseMatchScore),
		titleLineMatchScore: Math.min(0.24, titleLineMatchScore),
		score: Math.max(0, Math.min(1, Number(compositeScore.toFixed(4)))),
	};
}

function isSubstantiveCandidate(text) {
	const normalizedText = getNonEmptyString(text);
	if (!normalizedText) {
		return false;
	}

	if (normalizedText.length >= DEFAULT_MIN_SUBSTANTIVE_CHARS) {
		return true;
	}

	const wordCount = normalizedText.split(/\s+/u).filter(Boolean).length;
	return wordCount >= 6;
}

function collectAudioTextCandidates(messages, {
	windowSize = DEFAULT_CONTEXT_WINDOW_SIZE,
	latestUserMessage,
	candidateLimit = DEFAULT_CANDIDATE_LIMIT,
} = {}) {
	if (!Array.isArray(messages) || messages.length === 0) {
		return [];
	}

	const normalizedLatestUserMessage = getNonEmptyString(latestUserMessage);
	const effectiveWindowSize =
		typeof windowSize === "number" && Number.isInteger(windowSize) && windowSize > 0
			? windowSize
			: DEFAULT_CONTEXT_WINDOW_SIZE;
	const startIndex = Math.max(0, messages.length - effectiveWindowSize);
	const candidates = [];

	for (let index = messages.length - 1; index >= startIndex; index -= 1) {
		const message = messages[index];
		if (!message || (message.role !== "assistant" && message.role !== "user")) {
			continue;
		}

		const visibility = getNonEmptyString(message?.metadata?.visibility);
		const source = getNonEmptyString(message?.metadata?.source);
		if (visibility === "hidden" || source === "clarification-submit") {
			continue;
		}

		const role = message.role === "assistant" ? "assistant" : "user";
		const messageText = extractTextFromUiParts(message.parts);
		if (
			isSubstantiveCandidate(messageText) &&
			(!normalizedLatestUserMessage ||
				messageText.trim() !== normalizedLatestUserMessage)
		) {
			candidates.push({
				optionId: buildCandidateOptionId({
					messageId: getNonEmptyString(message.id),
					messageIndex: index,
					candidateKind: "message-text",
				}),
				text: messageText,
				preview: clipText(messageText, 112),
				messageId: getNonEmptyString(message.id),
				messageRole: role,
				messageIndex: index,
				candidateKind: "message-text",
			});
		}

		if (!Array.isArray(message.parts)) {
			continue;
		}

		for (const part of message.parts) {
			if (part?.type !== "data-widget-data" || !part?.data) {
				continue;
			}

			const widgetType = getNonEmptyString(part?.data?.type);
			if (widgetType !== "audio-preview") {
				continue;
			}

			const transcript = getNonEmptyString(part?.data?.payload?.transcript);
			if (!isSubstantiveCandidate(transcript)) {
				continue;
			}

			candidates.push({
				optionId: buildCandidateOptionId({
					messageId: getNonEmptyString(message.id),
					messageIndex: index,
					candidateKind: "audio-transcript",
				}),
				text: transcript,
				preview: clipText(transcript, 112),
				messageId: getNonEmptyString(message.id),
				messageRole: role,
				messageIndex: index,
				candidateKind: "audio-transcript",
			});
		}
	}

	const dedupedCandidates = [];
	const seenNormalizedText = new Set();
	for (const candidate of candidates) {
		const normalizedText = collapseWhitespace(candidate.text).toLowerCase();
		if (seenNormalizedText.has(normalizedText)) {
			continue;
		}

		seenNormalizedText.add(normalizedText);
		dedupedCandidates.push(candidate);
		if (dedupedCandidates.length >= candidateLimit) {
			break;
		}
	}

	return dedupedCandidates.map((candidate, index) => ({
		...candidate,
		recencyRank: index,
	}));
}

function resolveReferencedAudioText({
	latestUserMessage,
	messages,
	maxChars = 4000,
	windowSize = DEFAULT_CONTEXT_WINDOW_SIZE,
	confidenceThreshold = DEFAULT_CONFIDENCE_THRESHOLD,
	ambiguityThreshold = DEFAULT_AMBIGUITY_THRESHOLD,
	allowImplicitReference = false,
} = {}) {
	const normalizedLatestUserMessage = getNonEmptyString(latestUserMessage);
	if (!normalizedLatestUserMessage) {
		return {
			status: "not-found",
			referential: false,
			voiceInput: null,
			confidence: 0,
			candidateCount: 0,
			candidates: [],
		};
	}

	const referential = isContextReferentialAudioRequest(normalizedLatestUserMessage);
	const implicitReferenceEnabled = allowImplicitReference === true;
	const hasReferenceSignal = referential || implicitReferenceEnabled;
	if (!hasReferenceSignal) {
		return {
			status: "not-referential",
			referential: false,
			voiceInput: null,
			confidence: 0,
			candidateCount: 0,
			candidates: [],
		};
	}

	const candidates = collectAudioTextCandidates(messages, {
		windowSize,
		latestUserMessage: normalizedLatestUserMessage,
	});
	if (candidates.length === 0) {
		return {
			status: "not-found",
			referential: hasReferenceSignal,
			voiceInput: null,
			confidence: 0,
			candidateCount: 0,
			candidates: [],
		};
	}

	const requestTokenSet = toTokenSet(normalizedLatestUserMessage);
	const referencePhrases = extractReferencePhrases(normalizedLatestUserMessage);
	const scoredCandidates = candidates
		.map((candidate) =>
			scoreCandidate({
				candidate,
				latestUserMessage: normalizedLatestUserMessage,
				requestTokenSet,
				referencePhrases,
				totalCandidates: candidates.length,
			})
		)
		.map((candidate) => {
			if (referential) {
				return candidate;
			}

			const hasStrongTitleSignal =
				candidate.titleLineMatchScore >= 0.18 ||
				candidate.phraseMatchScore >= 0.18;
			if (hasStrongTitleSignal) {
				return candidate;
			}

			const adjustedScore = Math.max(0, candidate.score - 0.06);
			return {
				...candidate,
				score: Number(adjustedScore.toFixed(4)),
			};
		})
		.sort((left, right) => right.score - left.score);

	const topCandidate = scoredCandidates[0] || null;
	const secondCandidate = scoredCandidates[1] || null;
	const topScore = topCandidate?.score || 0;
	const secondScore = secondCandidate?.score || 0;
	const scoreGap = topScore - secondScore;
	const isConfident =
		topCandidate &&
		topScore >= confidenceThreshold &&
		(!secondCandidate || scoreGap >= ambiguityThreshold);

	if (isConfident) {
		return {
			status: "resolved",
			referential: hasReferenceSignal,
			voiceInput: clipToMaxChars(topCandidate.text, maxChars),
			confidence: topScore,
			candidateCount: scoredCandidates.length,
			candidates: scoredCandidates,
			topCandidate,
			secondCandidate,
		};
	}

	return {
		status: "ambiguous",
		referential: hasReferenceSignal,
		voiceInput: null,
		confidence: topScore,
		candidateCount: scoredCandidates.length,
		candidates: scoredCandidates,
		topCandidate,
		secondCandidate,
	};
}

function createAudioContextClarificationSessionId() {
	return `${AUDIO_CONTEXT_CLARIFICATION_SESSION_PREFIX}${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function getCandidateSourceDescription(candidate) {
	const roleLabel = candidate.messageRole === "assistant"
		? "assistant response"
		: "user message";
	const transcriptSuffix = candidate.candidateKind === "audio-transcript"
		? " transcript"
		: "";
	return `From a previous ${roleLabel}${transcriptSuffix}.`;
}

function buildAudioContextClarificationPayload({
	latestUserMessage,
	candidates,
	sessionId,
} = {}) {
	if (!Array.isArray(candidates) || candidates.length === 0) {
		return null;
	}

	const normalizedLatestUserMessage = getNonEmptyString(latestUserMessage);
	const optionLimit = Math.min(
		DEFAULT_CLARIFICATION_OPTION_LIMIT,
		candidates.length
	);
	const options = candidates.slice(0, optionLimit).map((candidate, index) => ({
		id: candidate.optionId,
		label: clipText(candidate.preview || candidate.text, 96),
		description: getCandidateSourceDescription(candidate),
		recommended: index === 0,
	}));

	if (normalizedLatestUserMessage) {
		options.push({
			id: AUDIO_CONTEXT_LITERAL_OPTION_ID,
			label: clipText(normalizedLatestUserMessage, 96),
			description: "Use your latest request text exactly as typed.",
			recommended: false,
		});
	}

	if (options.length === 0) {
		return null;
	}

	return {
		type: "question-card",
		sessionId:
			getNonEmptyString(sessionId) ||
			createAudioContextClarificationSessionId(),
		round: 1,
		maxRounds: 1,
		title: "Choose text for the audio clip",
		description:
			"I found multiple possible passages in this chat. Pick one, or type the exact text to read aloud.",
		questions: [
			{
				id: AUDIO_CONTEXT_QUESTION_ID,
				label: "Which text should I read aloud?",
				description: "Choose one option, or use the custom input field below.",
				required: true,
				kind: "single-select",
				options,
				placeholder: "Paste exact text to read aloud...",
			},
		],
	};
}

function isAudioContextClarificationSession(sessionId) {
	const normalizedSessionId = getNonEmptyString(sessionId);
	if (!normalizedSessionId) {
		return false;
	}

	return normalizedSessionId.startsWith(
		AUDIO_CONTEXT_CLARIFICATION_SESSION_PREFIX
	);
}

function getSelectionValueFromClarification(clarificationSubmission) {
	if (!clarificationSubmission || typeof clarificationSubmission !== "object") {
		return null;
	}

	const answers =
		clarificationSubmission.answers &&
		typeof clarificationSubmission.answers === "object"
			? clarificationSubmission.answers
			: null;
	if (!answers) {
		return null;
	}

	const preferredValue = answers[AUDIO_CONTEXT_QUESTION_ID];
	if (typeof preferredValue === "string") {
		return getNonEmptyString(preferredValue);
	}
	if (Array.isArray(preferredValue)) {
		const firstValue = preferredValue.find((value) => typeof value === "string");
		return getNonEmptyString(firstValue);
	}

	for (const answerValue of Object.values(answers)) {
		if (typeof answerValue === "string") {
			const normalizedValue = getNonEmptyString(answerValue);
			if (normalizedValue) {
				return normalizedValue;
			}
		}
		if (Array.isArray(answerValue)) {
			for (const value of answerValue) {
				const normalizedValue = getNonEmptyString(value);
				if (normalizedValue) {
					return normalizedValue;
				}
			}
		}
	}

	return null;
}

function resolveAudioContextVoiceInputFromClarification({
	clarificationSubmission,
	messages,
	latestVisibleUserMessage,
	maxChars = 4000,
	windowSize = DEFAULT_CONTEXT_WINDOW_SIZE,
} = {}) {
	if (!isAudioContextClarificationSession(clarificationSubmission?.sessionId)) {
		return {
			voiceInput: null,
			source: null,
			selectedValue: null,
		};
	}

	const selectedValue = getSelectionValueFromClarification(clarificationSubmission);
	if (!selectedValue) {
		return {
			voiceInput: null,
			source: null,
			selectedValue: null,
		};
	}

	if (selectedValue === AUDIO_CONTEXT_LITERAL_OPTION_ID) {
		const literalInput = normalizeSpeechPayload(latestVisibleUserMessage);
		return {
			voiceInput: literalInput ? clipToMaxChars(literalInput, maxChars) : null,
			source: "clarification-literal",
			selectedValue,
		};
	}

	const candidates = collectAudioTextCandidates(messages, {
		windowSize,
		latestUserMessage: latestVisibleUserMessage,
	});
	const selectedCandidate = candidates.find(
		(candidate) => candidate.optionId === selectedValue
	);
	if (selectedCandidate) {
		return {
			voiceInput: clipToMaxChars(selectedCandidate.text, maxChars),
			source: "context-reference",
			selectedValue,
		};
	}

	if (selectedValue.startsWith(AUDIO_CONTEXT_OPTION_PREFIX)) {
		return {
			voiceInput: null,
			source: null,
			selectedValue,
		};
	}

	const customInput = normalizeSpeechPayload(selectedValue);
	return {
		voiceInput: customInput ? clipToMaxChars(customInput, maxChars) : null,
		source: "clarification-custom-script",
		selectedValue,
	};
}

module.exports = {
	AUDIO_CONTEXT_CLARIFICATION_SESSION_PREFIX,
	AUDIO_CONTEXT_QUESTION_ID,
	AUDIO_CONTEXT_LITERAL_OPTION_ID,
	collectAudioTextCandidates,
	isContextReferentialAudioRequest,
	resolveReferencedAudioText,
	buildAudioContextClarificationPayload,
	isAudioContextClarificationSession,
	resolveAudioContextVoiceInputFromClarification,
};
