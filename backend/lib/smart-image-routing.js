const {
	buildImageContextClarificationPayload,
	isContextReferentialImageRequest,
	resolveReferencedImageContext,
} = require("./image-context-resolution");

const { getNonEmptyString } = require("./shared-utils");

const IMAGE_SUBJECT_PATTERNS = [
	/\b(?:generate|create|draw|make|design|render|paint|sketch|illustrate)\b[\s\S]{0,12}\b(?:an?\s+)?(?:image|photo|picture|illustration|art|drawing|painting|sketch)\b\s+(?:of|about|depicting|showing|featuring)\s+([\s\S]+)$/iu,
	/\b(?:image|photo|picture|illustration|art|drawing|painting|sketch)\b\s+(?:of|about|depicting|showing|featuring)\s+([\s\S]+)$/iu,
	/\b(?:generate|create|draw|make|design|render|paint|sketch|illustrate)\b\s+([\s\S]+)$/iu,
];

function extractImageSubject(userMessage) {
	const text = getNonEmptyString(userMessage);
	if (!text) {
		return { subject: null, mode: null };
	}

	for (const pattern of IMAGE_SUBJECT_PATTERNS) {
		const match = text.match(pattern);
		if (match && match[1]) {
			const subject = getNonEmptyString(match[1]);
			if (subject) {
				return { subject, mode: "extracted" };
			}
		}
	}

	return { subject: text, mode: "fallback-original" };
}

function buildEnrichedImagePrompt({ userMessage, contextText }) {
	const normalizedUserMessage = getNonEmptyString(userMessage);
	const normalizedContextText = getNonEmptyString(contextText);

	if (!normalizedUserMessage && !normalizedContextText) {
		return { prompt: null, systemInstruction: null };
	}

	if (!normalizedContextText) {
		return {
			prompt: normalizedUserMessage,
			systemInstruction: null,
		};
	}

	const systemInstruction = [
		"The user is referencing content from their conversation. Use the following context to inform the image you generate.",
		"Do not reproduce this context as text in the image — use it to understand what the user wants depicted visually.",
		"",
		"--- Referenced context ---",
		normalizedContextText,
		"--- End context ---",
	].join("\n");

	return {
		prompt: normalizedUserMessage || "Generate an image based on the context above.",
		systemInstruction,
	};
}

function resolveSmartImagePrompt({
	latestUserMessage,
	latestVisibleUserMessage,
	messages,
	maxChars = 4000,
	contextWindowSize = 16,
	contextConfidenceThreshold = 0.72,
	contextAmbiguityThreshold = 0.08,
} = {}) {
	const contextReferenceSeedMessage =
		getNonEmptyString(latestVisibleUserMessage) || latestUserMessage;
	const normalizedMessage = getNonEmptyString(contextReferenceSeedMessage);

	if (!normalizedMessage) {
		return {
			imagePrompt: null,
			systemInstruction: null,
			source: null,
			resolutionType: null,
			needsClarification: false,
			clarificationPayload: null,
			confidence: 0,
			candidateCount: 0,
		};
	}

	const referential = isContextReferentialImageRequest(normalizedMessage);

	if (referential) {
		const contextResolution = resolveReferencedImageContext({
			latestUserMessage: normalizedMessage,
			messages,
			maxChars,
			windowSize: contextWindowSize,
			confidenceThreshold: contextConfidenceThreshold,
			ambiguityThreshold: contextAmbiguityThreshold,
		});

		if (contextResolution.status === "resolved" && contextResolution.contextText) {
			const { prompt, systemInstruction } = buildEnrichedImagePrompt({
				userMessage: normalizedMessage,
				contextText: contextResolution.contextText,
			});

			return {
				imagePrompt: prompt,
				systemInstruction,
				source: "context-reference",
				resolutionType: "context-reference",
				needsClarification: false,
				clarificationPayload: null,
				confidence: contextResolution.confidence,
				candidateCount: contextResolution.candidateCount,
			};
		}

		if (
			contextResolution.status === "ambiguous" ||
			contextResolution.status === "not-found"
		) {
			return {
				imagePrompt: null,
				systemInstruction: null,
				source: null,
				resolutionType: "context-reference",
				needsClarification: true,
				clarificationPayload: buildImageContextClarificationPayload({
					latestUserMessage: normalizedMessage,
					candidates: contextResolution.candidates,
				}),
				confidence: contextResolution.confidence || 0,
				candidateCount: contextResolution.candidateCount || 0,
			};
		}
	}

	const { subject } = extractImageSubject(normalizedMessage);

	return {
		imagePrompt: subject || normalizedMessage,
		systemInstruction: null,
		source: "direct-user",
		resolutionType: "direct-user",
		needsClarification: false,
		clarificationPayload: null,
		confidence: 1,
		candidateCount: 0,
	};
}

module.exports = {
	extractImageSubject,
	buildEnrichedImagePrompt,
	resolveSmartImagePrompt,
};
