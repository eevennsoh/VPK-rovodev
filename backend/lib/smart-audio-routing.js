const SMART_AUDIO_REQUEST_PATTERN =
	/\b(audio|voice|speech|tts|text[-\s]?to[-\s]?speech|narrate|read aloud)\b/i;
const {
	clipToMaxChars,
	normalizeSpeechPayload,
	resolveSpeechPayloadFromAudioRequest,
} = require("./audio-input-extractor");

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
	generatedNarrative,
	explicitScript,
	maxChars = 4000,
} = {}) {
	const normalizedIntent = getNonEmptyString(intent)?.toLowerCase() || "audio";
	const {
		payload: directUserInput,
		mode: directUserInputMode,
	} = resolveSpeechPayloadFromAudioRequest(latestUserMessage, { maxChars });
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
		};
	}

	if (normalizedIntent === "audio" || normalizedIntent === "both") {
		if (directUserInput) {
			return {
				voiceInput: directUserInput,
				source: directUserSource,
				extractionMode: directUserInputMode,
			};
		}
		if (generatedNarrativeInput) {
			return {
				voiceInput: generatedNarrativeInput,
				source: "generated-narrative",
			};
		}
		return {
			voiceInput: null,
			source: null,
		};
	}

	if (generatedNarrativeInput) {
		return {
			voiceInput: generatedNarrativeInput,
			source: "generated-narrative",
		};
	}

	if (directUserInput) {
		return {
			voiceInput: directUserInput,
			source: directUserSource,
			extractionMode: directUserInputMode,
		};
	}

	return {
		voiceInput: null,
		source: null,
	};
}

module.exports = {
	isAudioRequestPrompt,
	resolveSmartAudioVoiceInput,
	toSpeechInputText,
};
