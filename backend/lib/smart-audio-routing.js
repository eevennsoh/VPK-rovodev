const SMART_AUDIO_REQUEST_PATTERN =
	/\b(audio|voice|speech|tts|text[-\s]?to[-\s]?speech|narrate|read aloud)\b/i;
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

function isAudioRequestPrompt(prompt) {
	const text = getNonEmptyString(prompt);
	if (!text) {
		return false;
	}

	return SMART_AUDIO_REQUEST_PATTERN.test(text);
}

function toSpeechInputText(value, { maxChars = 4000 } = {}) {
	const text = normalizeSpeechPayload(value);
	if (!text) {
		return null;
	}

	return clipToMaxChars(text, maxChars);
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
		const shouldAttemptContextResolution =
			typeof contextReferenceSeedMessage === "string" &&
			requestLooksReferential &&
			directUserInputMode !== "quoted";
		if (shouldAttemptContextResolution) {
			const contextResolution = resolveReferencedAudioText({
				latestUserMessage: contextReferenceSeedMessage,
				messages,
				maxChars,
				windowSize: contextWindowSize,
				confidenceThreshold: contextConfidenceThreshold,
				ambiguityThreshold: contextAmbiguityThreshold,
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
					contextResolution.status === "not-found")
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
	toSpeechInputText,
};
