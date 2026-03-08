const {
	getEnvVars,
	getAuthToken,
	getGatewayHeaders,
	resolveGatewayUrl,
} = require("./ai-gateway-helpers");

const TRANSCRIPTION_TIMEOUT_MS = 15_000;
const STRICT_TRANSCRIPTION_PROMPT = [
	"Transcribe this audio verbatim.",
	"Return only the spoken text, nothing else.",
	"Do not answer the user, do not paraphrase, and do not replace a request with background knowledge.",
	'If the speaker says "Create me a page about Apple", return exactly "Create me a page about Apple".',
	"If the audio is empty or contains no speech, return an empty string.",
].join(" ");

function createHttpError(status, message) {
	const error = new Error(message);
	error.statusCode = status;
	return error;
}

function createAbortError(message = "Speech transcription aborted") {
	const error = new Error(message);
	error.name = "AbortError";
	error.code = "ABORT_ERR";
	return error;
}

function resolveTranscriptionModel(rawModel) {
	if (typeof rawModel !== "string" || !rawModel.trim()) {
		throw createHttpError(
			500,
			"Server configuration error: GOOGLE_STT_MODEL must be set in .env.local",
		);
	}

	return rawModel.trim();
}

/**
 * Build the Gemini native generateContent endpoint URL from the gateway URL.
 */
function buildGenerateContentUrl(gatewayUrl, model) {
	if (typeof gatewayUrl !== "string" || !gatewayUrl.trim()) {
		return null;
	}

	try {
		const parsedUrl = new URL(gatewayUrl);
		const pathname = parsedUrl.pathname;

		const publisherPattern = /\/v1\/google\/publishers\/google\/v1\/chat\/completions$/;
		if (publisherPattern.test(pathname)) {
			parsedUrl.pathname = pathname.replace(
				publisherPattern,
				`/v1/google/v1/publishers/google/models/${model}:generateContent`,
			);
			return parsedUrl.toString();
		}

		const simplePattern = /\/v1\/google\/v1\/chat\/completions$/;
		if (simplePattern.test(pathname)) {
			parsedUrl.pathname = pathname.replace(
				simplePattern,
				`/v1/google/v1/publishers/google/models/${model}:generateContent`,
			);
			return parsedUrl.toString();
		}

		if (pathname.endsWith("/chat/completions")) {
			parsedUrl.pathname = pathname.replace(
				/\/chat\/completions$/,
				`/publishers/google/models/${model}:generateContent`,
			);
			return parsedUrl.toString();
		}

		return null;
	} catch {
		return null;
	}
}

function combineAbortSignals(signal, timeoutMs) {
	const controller = new AbortController();
	let timeoutHandle = null;

	const abortWithReason = (reason) => {
		if (!controller.signal.aborted) {
			controller.abort(reason);
		}
	};

	if (typeof timeoutMs === "number" && timeoutMs > 0) {
		timeoutHandle = setTimeout(() => {
			abortWithReason(createAbortError("Speech transcription timed out"));
		}, timeoutMs);
	}

	if (signal) {
		if (signal.aborted) {
			abortWithReason(signal.reason || createAbortError());
		} else {
			signal.addEventListener(
				"abort",
				() => {
					abortWithReason(signal.reason || createAbortError());
				},
				{ once: true },
			);
		}
	}

	return {
		signal: controller.signal,
		cleanup() {
			if (timeoutHandle) {
				clearTimeout(timeoutHandle);
			}
		},
	};
}

/**
 * Transcribe audio using Gemini via AI Gateway (native generateContent API).
 *
 * @param {object} options
 * @param {string} options.audio - Base64-encoded audio data
 * @param {string} [options.mimeType] - MIME type of the audio (default: "audio/webm")
 * @param {AbortSignal} [options.signal] - Optional abort signal
 * @returns {Promise<string>} The transcribed text
 */
async function transcribeAudio({ audio, mimeType, signal } = {}) {
	if (!audio || typeof audio !== "string") {
		throw createHttpError(400, "Base64 audio data is required");
	}

	const normalizedMimeType = (mimeType || "audio/webm").trim();
	const envVars = getEnvVars();
	const model = resolveTranscriptionModel(envVars.GOOGLE_STT_MODEL);

	const rawGatewayUrl = envVars.AI_GATEWAY_URL_GOOGLE || envVars.AI_GATEWAY_URL;
	if (!rawGatewayUrl) {
		throw createHttpError(500, "Server configuration error: no AI gateway URL configured");
	}

	const gatewayUrl = resolveGatewayUrl(rawGatewayUrl) || rawGatewayUrl;
	const generateContentUrl = buildGenerateContentUrl(gatewayUrl, model);
	if (!generateContentUrl) {
		throw createHttpError(
			500,
			"Unable to derive generateContent endpoint from AI_GATEWAY_URL",
		);
	}

	const token = await getAuthToken();

	const payload = {
		contents: [
			{
				role: "user",
				parts: [
					{
						inlineData: {
							mimeType: normalizedMimeType,
							data: audio,
						},
					},
					{
						text: STRICT_TRANSCRIPTION_PROMPT,
					},
				],
			},
		],
		generationConfig: {
			temperature: 0,
			topP: 0,
			topK: 1,
		},
	};

	console.info(`[SPEECH-TRANSCRIPTION] Sending to ${model} via:`, generateContentUrl);

	const { signal: requestSignal, cleanup } = combineAbortSignals(
		signal,
		TRANSCRIPTION_TIMEOUT_MS,
	);

	try {
		const response = await fetch(generateContentUrl, {
			method: "POST",
			headers: getGatewayHeaders(envVars, token),
			body: JSON.stringify(payload),
			signal: requestSignal,
		});

		if (!response.ok) {
			const errorText = await response.text();
			console.error("[SPEECH-TRANSCRIPTION] Gateway error:", response.status, errorText);
			throw createHttpError(
				response.status,
				`Transcription failed: ${response.status}`,
			);
		}

		const result = await response.json();
		return (
			result?.candidates?.[0]?.content?.parts
				?.filter((part) => typeof part.text === "string")
				?.map((part) => part.text)
				?.join("")
				?.trim() ?? ""
		);
	} catch (error) {
		if (error instanceof Error && error.name === "AbortError") {
			throw error;
		}

		if (requestSignal.aborted) {
			throw requestSignal.reason instanceof Error
				? requestSignal.reason
				: createAbortError();
		}

		throw error;
	} finally {
		cleanup();
	}
}

module.exports = {
	transcribeAudio,
	__test__: {
		buildGenerateContentUrl,
		resolveTranscriptionModel,
		STRICT_TRANSCRIPTION_PROMPT,
	},
};
