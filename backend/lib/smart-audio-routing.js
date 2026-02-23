const SMART_AUDIO_REQUEST_PATTERN =
	/\b(audio|voice|speech|tts|text[-\s]?to[-\s]?speech|narrate|read aloud)\b/i;
const EXPLICIT_LITERAL_CUE_PATTERN =
	/\b(?:exact|exactly|verbatim|literally|word[-\s]?for[-\s]?word|as[-\s]?written|this\s+exact)\b/i;
const DIRECT_SCRIPT_VERB_PATTERN = /\b(?:say|read|speak|narrate)\b/i;
const CONTEXTUAL_MEDIA_COMMAND_PATTERN =
	/\b(?:make|create|generate|produce|synthesize|render)\b[\s\S]{0,64}\b(?:audio|voice|speech|tts|voiceover|voice\s*clip|audio\s*clip)\b/i;
const CONTEXT_ARTIFACT_PATTERN =
	/\b(?:poem|story|article|summary|response|message|text|chat|conversation|lyrics|script)\b/i;
const {
	clipToMaxChars,
	normalizeSpeechPayload,
	resolveSpeechPayloadFromAudioRequest,
} = require("./audio-input-extractor");
const {
	buildAudioContextClarificationPayload,
	isContextReferentialAudioRequest,
	resolveReferencedAudioText,
} = require("./audio-context-resolution");

function getNonEmptyString(value) {
	if (typeof value !== "string") {
		return null;
	}

	const trimmedValue = value.trim();
	return trimmedValue.length > 0 ? trimmedValue : null;
}

function countWords(value) {
	const normalizedValue = getNonEmptyString(value);
	if (!normalizedValue) {
		return 0;
	}

	return normalizedValue.split(/\s+/u).filter(Boolean).length;
}

function hasExplicitLiteralSpeechCue(prompt) {
	const text = getNonEmptyString(prompt);
	if (!text) {
		return false;
	}

	if (EXPLICIT_LITERAL_CUE_PATTERN.test(text)) {
		return true;
	}

	const hasDirectSpeechVerb = DIRECT_SCRIPT_VERB_PATTERN.test(text);
	if (!hasDirectSpeechVerb) {
		return false;
	}

	const hasArtifactReference = CONTEXT_ARTIFACT_PATTERN.test(text);
	const hasMediaGenerationCommand =
		CONTEXTUAL_MEDIA_COMMAND_PATTERN.test(text);
	return !hasArtifactReference && !hasMediaGenerationCommand;
}

function isLikelyStandaloneScript(value) {
	const text = getNonEmptyString(value);
	if (!text) {
		return false;
	}

	if (text.includes("\n")) {
		return true;
	}

	const wordCount = countWords(text);
	if (text.length >= 140 || wordCount >= 22) {
		return true;
	}

	const punctuationCount = (text.match(/[.!?]/gu) || []).length;
	return wordCount >= 10 && punctuationCount > 0;
}

function isLikelyTitleLikePayload(value) {
	const text = getNonEmptyString(value);
	if (!text) {
		return false;
	}

	if (text.includes("\n") || text.length > 90) {
		return false;
	}

	const wordCount = countWords(text);
	if (wordCount === 0 || wordCount > 10) {
		return false;
	}

	if (/[.!?]$/u.test(text) && wordCount > 4) {
		return false;
	}

	return true;
}

function shouldAttemptImplicitContextResolution({
	latestUserMessage,
	directUserInput,
	directUserInputMode,
}) {
	if (
		directUserInputMode !== "quoted" &&
		directUserInputMode !== "command-pattern" &&
		directUserInputMode !== "fallback-original"
	) {
		return false;
	}

	const prompt = getNonEmptyString(latestUserMessage);
	if (!prompt) {
		return false;
	}

	if (hasExplicitLiteralSpeechCue(prompt)) {
		return false;
	}

	if (!isLikelyTitleLikePayload(directUserInput)) {
		return false;
	}

	if (isLikelyStandaloneScript(directUserInput)) {
		return false;
	}

	return true;
}

function isAudioRequestPrompt(prompt) {
	const text = getNonEmptyString(prompt);
	if (!text) {
		return false;
	}

	return SMART_AUDIO_REQUEST_PATTERN.test(text);
}

const LEADING_FILLER_PATTERN =
	/^(?:(?:I'd be happy to|I would be happy to|I'd love to|Sure[,!]?\s*|Of course[,!]?\s*|Absolutely[,!]?\s*|Certainly[,!]?\s*|Great[,!]?\s*|Here(?:'s| is| are)\s)[\s\S]{0,80}?(?:[:!]\s*(?:---\s*)?|[.]\s+))/i;
const TRAILING_FILLER_PATTERN =
	/(?:\s*---\s*)?(?:(?:Would you like me to|Let me know if|Feel free to|I (?:can|could) also|Hope (?:you enjoy|this helps|that helps))[\s\S]{0,120}[.!?]?\s*)$/i;
const MARKDOWN_SEPARATOR_BOUNDARY_PATTERN = /(?:^\s*---\s*|\s*---\s*$)/g;

function stripConversationalFiller(value) {
	const text = getNonEmptyString(value);
	if (!text) {
		return value;
	}

	let stripped = text;
	// Apply leading filler removal iteratively (handles chained fillers like
	// "I'd be happy to help! Here's one for you: ...")
	let prev;
	do {
		prev = stripped;
		stripped = stripped.replace(LEADING_FILLER_PATTERN, "").trim();
	} while (stripped !== prev && stripped.length > 0);

	stripped = stripped
		.replace(TRAILING_FILLER_PATTERN, "")
		.replace(MARKDOWN_SEPARATOR_BOUNDARY_PATTERN, "")
		.trim();

	return stripped.length > 0 ? stripped : text;
}

function toSpeechInputText(value, { maxChars = 4000 } = {}) {
	const text = normalizeSpeechPayload(value);
	if (!text) {
		return null;
	}

	const stripped = stripConversationalFiller(text);
	return clipToMaxChars(stripped, maxChars);
}

function resolveSmartAudioVoiceInput({
	intent,
	latestUserMessage,
	latestVisibleUserMessage,
	messages,
	generatedNarrative,
	explicitScript,
	maxChars = 4000,
	contextWindowSize = 16,
	contextConfidenceThreshold = 0.72,
	contextAmbiguityThreshold = 0.08,
} = {}) {
	const normalizedIntent = getNonEmptyString(intent)?.toLowerCase() || "audio";
	const contextReferenceSeedMessage =
		getNonEmptyString(latestVisibleUserMessage) || latestUserMessage;
	const {
		payload: directUserInput,
		mode: directUserInputMode,
	} = resolveSpeechPayloadFromAudioRequest(contextReferenceSeedMessage, {
		maxChars,
	});
	const explicitScriptInput = toSpeechInputText(explicitScript, { maxChars });
	const generatedNarrativeInput = toSpeechInputText(generatedNarrative, { maxChars });
	const directUserSource =
		directUserInputMode && directUserInputMode !== "fallback-original"
			? "extracted-user-payload"
			: "direct-user";

	if (explicitScriptInput) {
		return {
			voiceInput: explicitScriptInput,
			source: "explicit-script",
			resolutionType: "explicit-script",
			needsClarification: false,
			clarificationPayload: null,
			confidence: 1,
			candidateCount: 1,
		};
	}

	if (normalizedIntent === "audio" || normalizedIntent === "both") {
		const requestLooksReferential =
			isContextReferentialAudioRequest(contextReferenceSeedMessage) ||
			(directUserInputMode !== "quoted" &&
				isContextReferentialAudioRequest(directUserInput));
		const requestLooksImplicitlyReferential =
			!requestLooksReferential &&
			shouldAttemptImplicitContextResolution({
				latestUserMessage: contextReferenceSeedMessage,
				directUserInput,
				directUserInputMode,
			});
		const shouldAttemptContextResolution =
			typeof contextReferenceSeedMessage === "string" &&
			(requestLooksReferential || requestLooksImplicitlyReferential);
		if (shouldAttemptContextResolution) {
			const contextResolution = resolveReferencedAudioText({
				latestUserMessage: contextReferenceSeedMessage,
				messages,
				maxChars,
				windowSize: contextWindowSize,
				confidenceThreshold: contextConfidenceThreshold,
				ambiguityThreshold: contextAmbiguityThreshold,
				allowImplicitReference: requestLooksImplicitlyReferential,
			});

			if (contextResolution.status === "resolved" && contextResolution.voiceInput) {
				return {
					voiceInput: contextResolution.voiceInput,
					source: "context-reference",
					resolutionType: "context-reference",
					needsClarification: false,
					clarificationPayload: null,
					confidence: contextResolution.confidence,
					candidateCount: contextResolution.candidateCount,
				};
			}

			if (
				contextResolution.referential &&
				(contextResolution.status === "ambiguous" ||
					(requestLooksReferential &&
						contextResolution.status === "not-found"))
			) {
				return {
					voiceInput: null,
					source: null,
					resolutionType: "context-reference",
					needsClarification: true,
					clarificationPayload: buildAudioContextClarificationPayload({
						latestUserMessage: contextReferenceSeedMessage,
						candidates: contextResolution.candidates,
					}),
					confidence: contextResolution.confidence || 0,
					candidateCount: contextResolution.candidateCount || 0,
				};
			}
		}

		if (directUserInput) {
			return {
				voiceInput: directUserInput,
				source: directUserSource,
				resolutionType: "direct-user",
				extractionMode: directUserInputMode,
				needsClarification: false,
				clarificationPayload: null,
				confidence: 1,
				candidateCount: 1,
			};
		}
		if (generatedNarrativeInput) {
			return {
				voiceInput: generatedNarrativeInput,
				source: "generated-narrative",
				resolutionType: "generated-narrative",
				needsClarification: false,
				clarificationPayload: null,
				confidence: 1,
				candidateCount: 1,
			};
		}
		return {
			voiceInput: null,
			source: null,
			resolutionType: null,
			needsClarification: false,
			clarificationPayload: null,
			confidence: 0,
			candidateCount: 0,
		};
	}

	if (generatedNarrativeInput) {
		return {
			voiceInput: generatedNarrativeInput,
			source: "generated-narrative",
			resolutionType: "generated-narrative",
			needsClarification: false,
			clarificationPayload: null,
			confidence: 1,
			candidateCount: 1,
		};
	}

	if (directUserInput) {
		return {
			voiceInput: directUserInput,
			source: directUserSource,
			resolutionType: "direct-user",
			extractionMode: directUserInputMode,
			needsClarification: false,
			clarificationPayload: null,
			confidence: 1,
			candidateCount: 1,
		};
	}

	return {
		voiceInput: null,
		source: null,
		resolutionType: null,
		needsClarification: false,
		clarificationPayload: null,
		confidence: 0,
		candidateCount: 0,
	};
}

module.exports = {
	isAudioRequestPrompt,
	resolveSmartAudioVoiceInput,
	stripConversationalFiller,
	toSpeechInputText,
};
