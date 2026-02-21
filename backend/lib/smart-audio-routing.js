const SMART_AUDIO_REQUEST_PATTERN =
	/\b(audio|voice|speech|tts|text[-\s]?to[-\s]?speech|narrate|read aloud)\b/i;

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
	const text = getNonEmptyString(value);
	if (!text) {
		return null;
	}

	if (text.length <= maxChars) {
		return text;
	}

	return `${text.slice(0, maxChars - 1)}…`;
}

function resolveSmartAudioVoiceInput({
	intent,
	latestUserMessage,
	generatedNarrative,
	explicitScript,
	maxChars = 4000,
} = {}) {
	const normalizedIntent = getNonEmptyString(intent)?.toLowerCase() || "audio";
	const directUserInput = toSpeechInputText(latestUserMessage, { maxChars });
	const explicitScriptInput = toSpeechInputText(explicitScript, { maxChars });
	const generatedNarrativeInput = toSpeechInputText(generatedNarrative, { maxChars });

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
				source: "direct-user",
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
			source: "direct-user",
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
