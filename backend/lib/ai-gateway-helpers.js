const jwt = require("jsonwebtoken");

const DEBUG = process.env.DEBUG === "true";

function debugLog(section, message, data) {
	if (DEBUG) {
		console.log(`[DEBUG][${section}] ${message}`, data ? JSON.stringify(data, null, 2) : "");
	}
}

const DEFAULT_MODELS = {
	bedrock: "anthropic.claude-3-5-haiku-20241022-v1:0",
	openai: "gpt-5.2-2025-12-11",
	google: "gemini-3-pro-image-preview",
};

function getEnvVars() {
	return {
		AI_GATEWAY_URL: process.env.AI_GATEWAY_URL,
		AI_GATEWAY_URL_GOOGLE: process.env.AI_GATEWAY_URL_GOOGLE,
		AI_GATEWAY_USE_CASE_ID: process.env.AI_GATEWAY_USE_CASE_ID,
		AI_GATEWAY_CLOUD_ID: process.env.AI_GATEWAY_CLOUD_ID,
		AI_GATEWAY_USER_ID: process.env.AI_GATEWAY_USER_ID,
	};
}

function generateAsapToken() {
	let privateKey = process.env.ASAP_PRIVATE_KEY;
	if (!privateKey) {
		throw new Error("ASAP_PRIVATE_KEY not found in environment");
	}

	debugLog("AUTH", `Processing ASAP_PRIVATE_KEY (length: ${privateKey.length}, starts with: ${privateKey.slice(0, 30)})`);

	if (privateKey.trim().startsWith("data:")) {
		debugLog("AUTH", "Detected data URI format, attempting to decode...");
		const match = privateKey.match(/^data:[^;]*;base64,(.+)$/is);
		if (match && match[1]) {
			try {
				privateKey = Buffer.from(match[1], "base64").toString("utf-8");
				debugLog("AUTH", "Successfully decoded data URI");
			} catch (e) {
				debugLog("AUTH", `Failed to decode base64: ${e.message}`);
			}
		}
	}

	privateKey = privateKey.replace(/\\n/g, "\n");
	privateKey = privateKey.trim();

	if (!privateKey.includes("-----BEGIN")) {
		debugLog("AUTH", `Key doesn't contain -----BEGIN. Trying base64 decode...`);
		try {
			const decoded = Buffer.from(privateKey, "base64").toString("utf-8");
			if (decoded.includes("-----BEGIN")) {
				privateKey = decoded;
				debugLog("AUTH", "Successfully decoded base64 to PEM format");
			}
		} catch {
			// Not base64, use as-is
		}
	}

	if (!privateKey.startsWith("-----BEGIN")) {
		throw new Error(`ASAP_PRIVATE_KEY is not in valid PEM format. Got: ${privateKey.slice(0, 50)}...`);
	}

	const config = {
		issuer: process.env.ASAP_ISSUER || process.env.AI_GATEWAY_USE_CASE_ID,
		kid: process.env.ASAP_KID,
		expiry: 60,
	};

	if (!config.issuer || !config.kid) {
		throw new Error("Missing ASAP configuration: ASAP_ISSUER and ASAP_KID must be set in .env.local");
	}

	const now = Math.floor(Date.now() / 1000);
	const payload = {
		iss: config.issuer,
		sub: config.issuer,
		aud: ["ai-gateway"],
		iat: now,
		exp: now + config.expiry,
		jti: `${config.issuer}-${now}-${Math.random().toString(36).substring(7)}`,
	};

	return jwt.sign(payload, privateKey, {
		algorithm: "RS256",
		keyid: config.kid,
	});
}

async function getAuthToken() {
	debugLog("AUTH", "Using ASAP authentication");
	return generateAsapToken();
}

function detectEndpointType(url) {
	const aiGatewayUrl = url || process.env.AI_GATEWAY_URL || "";
	if (/\/v1\/bedrock\/model\//.test(aiGatewayUrl) || /\/provider\/bedrock\//.test(aiGatewayUrl)) {
		return "bedrock";
	}
	if (/\/v1\/google\//.test(aiGatewayUrl)) {
		return "google";
	}
	return "openai";
}

function getModelId(gatewayUrl) {
	// Extract model from Google streamRawPredict URL before translation.
	// Check both the provided URL and the raw env var (in case the provided
	// URL has already been translated and lost the model info).
	// Try with :streamRawPredict suffix first, then without.
	const withSuffix = /\/v1\/google\/v1\/publishers\/[^/]+\/models\/(.+):streamRawPredict/;
	const withoutSuffix = /\/v1\/google\/v1\/publishers\/[^/]+\/models\/(.+?)$/;
	const urlsToCheck = [gatewayUrl, process.env.AI_GATEWAY_URL, process.env.AI_GATEWAY_URL_GOOGLE];
	for (const url of urlsToCheck) {
		const match = url?.match?.(withSuffix) || url?.match?.(withoutSuffix);
		if (match) {
			return match[1];
		}
	}

	const endpointType = detectEndpointType(gatewayUrl);
	return DEFAULT_MODELS[endpointType] || DEFAULT_MODELS.openai;
}

function getGatewayHeaders(envVars, token, stream = false) {
	const headers = {
		"Content-Type": "application/json",
		Authorization: `bearer ${token}`,
		"X-Atlassian-UseCaseId": envVars.AI_GATEWAY_USE_CASE_ID,
		"X-Atlassian-CloudId": envVars.AI_GATEWAY_CLOUD_ID,
		"X-Atlassian-UserId": envVars.AI_GATEWAY_USER_ID,
	};

	if (stream) {
		return {
			...headers,
			Accept: "text/event-stream",
		};
	}

	return headers;
}

/**
 * Translates a legacy Bedrock invoke-with-response-stream URL to the
 * OpenAI-compatible chat completions format.
 *
 * Old: .../v1/bedrock/model/anthropic.claude-3-5-haiku-20241022-v1:0/invoke-with-response-stream
 * New: .../provider/bedrock/format/openai/v1/chat/completions
 */
function translateBedrockUrl(gatewayUrl) {
	if (!gatewayUrl || typeof gatewayUrl !== "string") {
		return gatewayUrl;
	}

	const bedrockInvokePattern = /\/v1\/bedrock\/model\/[^/]+\/invoke-with-response-stream$/;
	if (!bedrockInvokePattern.test(gatewayUrl)) {
		return gatewayUrl;
	}

	const baseUrl = gatewayUrl.replace(/\/v1\/bedrock\/model\/[^/]+\/invoke-with-response-stream$/, "");
	return `${baseUrl}/provider/bedrock/format/openai/v1/chat/completions`;
}

/**
 * Translates a Google Vertex AI streamRawPredict URL to the appropriate
 * OpenAI-compatible chat completions format.
 *
 * - Anthropic models on Google are routed to Bedrock instead (Claude is
 *   only available via Bedrock, not the Google provider).
 * - Google-native models (e.g. Gemini) are routed to the Google
 *   OpenAI-compatible endpoint.
 *
 * Old: .../v1/google/v1/publishers/anthropic/models/claude-model:streamRawPredict
 * New (anthropic): .../provider/bedrock/format/openai/v1/chat/completions
 * New (google):    .../v1/google/publishers/google/v1/chat/completions
 */
function translateGoogleUrl(gatewayUrl) {
	if (!gatewayUrl || typeof gatewayUrl !== "string") {
		return gatewayUrl;
	}

	// Match URLs ending with :streamRawPredict or just the model path.
	// Model IDs can contain colons (e.g., "anthropic.claude-3-5-haiku-20241022-v1:0"),
	// so we first try matching with :streamRawPredict suffix, then without.
	const withSuffix = /\/v1\/google\/v1\/publishers\/([^/]+)\/models\/(.+):streamRawPredict$/;
	const withoutSuffix = /\/v1\/google\/v1\/publishers\/([^/]+)\/models\/(.+)$/;
	const match = gatewayUrl.match(withSuffix) || gatewayUrl.match(withoutSuffix);
	if (!match) {
		return gatewayUrl;
	}

	const [fullMatch, publisher, model] = match;
	const baseUrl = gatewayUrl.slice(0, gatewayUrl.length - fullMatch.length);

	if (publisher === "anthropic") {
		console.warn(
			`[AI_GATEWAY] Claude model "${model}" detected on Google endpoint. ` +
			`Routing to Bedrock instead. For Claude models, use: ` +
			`AI_GATEWAY_URL=...v1/bedrock/model/${model}/invoke-with-response-stream`
		);
		return `${baseUrl}/provider/bedrock/format/openai/v1/chat/completions`;
	}

	return `${baseUrl}/v1/google/publishers/google/v1/chat/completions`;
}

/**
 * Resolves the final gateway URL, auto-translating legacy Bedrock and
 * Google streamRawPredict URLs to OpenAI-compatible format.
 * Returns the URL ready for OpenAI-compatible requests (with /chat/completions).
 */
function resolveGatewayUrl(gatewayUrl) {
	if (!gatewayUrl) {
		return null;
	}

	let resolved = translateBedrockUrl(gatewayUrl);
	resolved = translateGoogleUrl(resolved);
	return resolved;
}

/**
 * Derives the base URL for the AI SDK provider by stripping the
 * /chat/completions suffix (the SDK appends it automatically).
 */
function resolveBaseURL(gatewayUrl) {
	const resolved = resolveGatewayUrl(gatewayUrl);
	if (!resolved) {
		return null;
	}

	return resolved.replace(/\/chat\/completions$/, "");
}

/**
 * Extracts inline image data from a parsed SSE chunk.
 * Gemini image responses via AI Gateway may arrive in several formats.
 * Returns an array of { mimeType, base64Data } objects, or an empty array.
 */
function extractGatewayImageData(parsedChunk) {
	const delta = parsedChunk?.choices?.[0]?.delta;
	if (!delta) {
		return [];
	}

	const images = [];

	if (delta.audio?.data && typeof delta.audio.data === "string") {
		let mimeType = "image/png";
		if (delta.audio.data.startsWith("/9j/")) {
			mimeType = "image/jpeg";
		} else if (delta.audio.data.startsWith("R0lGOD")) {
			mimeType = "image/gif";
		} else if (delta.audio.data.startsWith("UklGR")) {
			mimeType = "image/webp";
		}
		images.push({ mimeType, base64Data: delta.audio.data });
	}

	const content = delta.content;
	if (Array.isArray(content)) {
		for (const part of content) {
			if (!part || typeof part !== "object") {
				continue;
			}

			if (part.type === "image_url" && part.image_url?.url) {
				const dataUrlMatch = part.image_url.url.match(
					/^data:(image\/[^;]+);base64,(.+)$/s
				);
				if (dataUrlMatch) {
					images.push({ mimeType: dataUrlMatch[1], base64Data: dataUrlMatch[2] });
				} else {
					images.push({ mimeType: "image/png", url: part.image_url.url });
				}
				continue;
			}

			if (part.inline_data?.data) {
				images.push({
					mimeType: part.inline_data.mime_type || "image/png",
					base64Data: part.inline_data.data,
				});
				continue;
			}
		}
	}

	return images;
}

/**
 * Extracts text content from a parsed OpenAI-compatible SSE chunk.
 */
function extractGatewayTextDelta(parsedChunk) {
	const content =
		parsedChunk?.delta?.text ?? parsedChunk?.choices?.[0]?.delta?.content ?? null;
	if (Array.isArray(content)) {
		const textParts = content
			.filter((part) => part?.type === "text" && typeof part.text === "string")
			.map((part) => part.text)
			.join("");
		return textParts.length > 0 ? textParts : null;
	}
	return typeof content === "string" ? content : null;
}

/**
 * Streams a Bedrock/Claude gateway response with manual SSE parsing.
 *
 * Sends the Anthropic Messages API format directly to the legacy Bedrock
 * invoke-with-response-stream URL. This avoids URL translation to
 * /provider/bedrock/format/openai/ which may not be authorized by POCO.
 *
 * @param {object} options
 * @param {string} options.gatewayUrl - The Bedrock gateway URL
 * @param {object} options.envVars - Environment variables
 * @param {string} [options.system] - System prompt
 * @param {string} [options.prompt] - User prompt
 * @param {Array}  [options.messages] - Messages array in Anthropic format
 * @param {number} [options.maxOutputTokens] - Max output tokens
 * @param {function} [options.onTextDelta] - Called with (text) for each text delta
 */
async function streamBedrockGatewayManualSse({
	gatewayUrl,
	envVars,
	system,
	prompt,
	messages,
	maxOutputTokens,
	onTextDelta,
}) {
	const token = await getAuthToken();

	const resolvedMessages = [];
	if (Array.isArray(messages)) {
		resolvedMessages.push(...messages);
	}
	if (prompt) {
		resolvedMessages.push({
			role: "user",
			content: [{ type: "text", text: prompt }],
		});
	}

	const payload = {
		anthropic_version: "bedrock-2023-05-31",
		max_tokens: typeof maxOutputTokens === "number" ? maxOutputTokens : 2000,
		messages: resolvedMessages,
	};
	if (system) {
		payload.system = system;
	}

	debugLog("BEDROCK_SSE", `Streaming to: ${gatewayUrl}`);

	const response = await fetch(gatewayUrl, {
		method: "POST",
		headers: getGatewayHeaders(envVars, token, true),
		body: JSON.stringify(payload),
	});

	if (!response.ok) {
		const errorText = await response.text();
		throw new Error(`AI Gateway Bedrock error ${response.status}: ${errorText.slice(0, 300)}`);
	}

	const reader = response.body?.getReader();
	if (!reader) {
		throw new Error("AI Gateway Bedrock response body is empty");
	}

	const decoder = new TextDecoder();
	let buffer = "";
	let fullText = "";

	const processLine = (line) => {
		const trimmed = line.trim();
		if (!trimmed.startsWith("data:")) {
			return;
		}

		const dataContent = trimmed.slice(5).trim();
		if (!dataContent || dataContent === "[DONE]") {
			return;
		}

		let parsed;
		try {
			parsed = JSON.parse(dataContent);
		} catch {
			return;
		}

		// Anthropic Messages API streaming format
		if (parsed.type === "content_block_delta" && parsed.delta?.type === "text_delta") {
			const text = parsed.delta.text;
			if (text) {
				fullText += text;
				if (onTextDelta) {
					onTextDelta(text);
				}
			}
		}
	};

	while (true) {
		const { done, value } = await reader.read();
		if (done) {
			break;
		}

		buffer += decoder.decode(value, { stream: true });
		let newlineIndex = buffer.indexOf("\n");
		while (newlineIndex !== -1) {
			const line = buffer.slice(0, newlineIndex);
			buffer = buffer.slice(newlineIndex + 1);
			processLine(line);
			newlineIndex = buffer.indexOf("\n");
		}
	}

	if (buffer.length > 0) {
		processLine(buffer);
	}

	debugLog("BEDROCK_SSE", `Stream complete — ${fullText.length} chars text`);

	return { text: fullText };
}

/**
 * Streams a Google/Gemini gateway response with manual SSE parsing.
 *
 * The AI Gateway returns Gemini image data in non-standard SSE fields
 * (delta.audio.data, inline_data, image_url) that the OpenAI-compatible
 * SDK parser does not surface as file parts. This function parses the
 * raw SSE stream to capture both text deltas and image data.
 *
 * @param {object} options
 * @param {string} options.gatewayUrl - The Google gateway URL
 * @param {object} options.envVars - Environment variables
 * @param {string} options.model - The model ID
 * @param {Array} options.messages - Messages array in OpenAI format
 * @param {string} [options.system] - System prompt
 * @param {string} [options.prompt] - User prompt (alternative to messages)
 * @param {number} [options.maxOutputTokens] - Max output tokens
 * @param {number} [options.temperature] - Temperature
 * @param {function} [options.onTextDelta] - Called with (text) for each text delta
 * @param {function} [options.onFile] - Called with ({ mediaType, base64 }) for each image
 */
async function streamGoogleGatewayManualSse({
	gatewayUrl,
	envVars,
	model,
	messages,
	system,
	prompt,
	maxOutputTokens,
	temperature,
	onTextDelta,
	onFile,
}) {
	const token = await getAuthToken();

	const resolvedMessages = [];
	if (system) {
		resolvedMessages.push({ role: "system", content: system });
	}
	if (Array.isArray(messages)) {
		resolvedMessages.push(...messages);
	}
	if (prompt) {
		resolvedMessages.push({ role: "user", content: prompt });
	}

	const payload = {
		model,
		messages: resolvedMessages,
		stream: true,
	};
	if (typeof maxOutputTokens === "number") {
		payload.max_completion_tokens = maxOutputTokens;
	}
	if (typeof temperature === "number") {
		payload.temperature = temperature;
	}

	const response = await fetch(gatewayUrl, {
		method: "POST",
		headers: getGatewayHeaders(envVars, token, true),
		body: JSON.stringify(payload),
	});

	if (!response.ok) {
		const errorText = await response.text();
		throw new Error(`AI Gateway Google error ${response.status}: ${errorText.slice(0, 300)}`);
	}

	const reader = response.body?.getReader();
	if (!reader) {
		throw new Error("AI Gateway Google response body is empty");
	}

	const decoder = new TextDecoder();
	let buffer = "";
	let fullText = "";

	let sseLineCount = 0;

	const processLine = async (line) => {
		const trimmed = line.trim();
		if (!trimmed.startsWith("data:")) {
			return;
		}

		sseLineCount++;
		const dataContent = trimmed.slice(5).trim();
		if (!dataContent || dataContent === "[DONE]") {
			debugLog("GOOGLE_SSE", `Line #${sseLineCount}: [DONE] or empty`);
			return;
		}

		let parsed;
		try {
			parsed = JSON.parse(dataContent);
		} catch {
			debugLog("GOOGLE_SSE", `Line #${sseLineCount}: JSON parse failed for: ${dataContent.slice(0, 100)}`);
			return;
		}

		// Log raw delta keys for debugging image detection
		const delta = parsed?.choices?.[0]?.delta;
		if (delta && sseLineCount <= 5) {
			debugLog("GOOGLE_SSE", `Line #${sseLineCount} delta keys: ${Object.keys(delta).join(", ")}`);
		}

		const textDelta = extractGatewayTextDelta(parsed);
		if (typeof textDelta === "string" && textDelta.length > 0) {
			fullText += textDelta;
			if (onTextDelta) {
				onTextDelta(textDelta);
			}
		}

		const images = extractGatewayImageData(parsed);
		if (images.length > 0) {
			debugLog("GOOGLE_SSE", `Line #${sseLineCount}: Found ${images.length} image(s) — mimeTypes: ${images.map((i) => i.mimeType).join(", ")}`);
		}
		for (const image of images) {
			if (onFile) {
				onFile({
					mediaType: image.mimeType,
					base64: image.base64Data,
				});
			}
		}
	};

	while (true) {
		const { done, value } = await reader.read();
		if (done) {
			break;
		}

		buffer += decoder.decode(value, { stream: true });
		let newlineIndex = buffer.indexOf("\n");
		while (newlineIndex !== -1) {
			const line = buffer.slice(0, newlineIndex);
			buffer = buffer.slice(newlineIndex + 1);
			await processLine(line);
			newlineIndex = buffer.indexOf("\n");
		}
	}

	if (buffer.length > 0) {
		await processLine(buffer);
	}

	debugLog("GOOGLE_SSE", `Stream complete — ${sseLineCount} SSE lines, ${fullText.length} chars text`);

	return { text: fullText };
}

module.exports = {
	DEFAULT_MODELS,
	getEnvVars,
	getAuthToken,
	detectEndpointType,
	getModelId,
	getGatewayHeaders,
	resolveGatewayUrl,
	resolveBaseURL,
	extractGatewayImageData,
	extractGatewayTextDelta,
	streamBedrockGatewayManualSse,
	streamGoogleGatewayManualSse,
};
