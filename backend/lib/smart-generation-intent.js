const SMART_GENERATION_INTENTS = new Set(["normal", "genui", "audio", "image", "both"]);

const CLASSIFIER_SYSTEM_PROMPT = `You are an intent router for a chat assistant.

Classify the latest user request into exactly one intent:
- normal: regular conversation, Q&A, or discussion with no generation action
- genui: request to generate/build/create UI, interface, layout, component, page, dashboard, mockup, JSON UI spec, or visual surface
- audio: request to generate voice/audio narration, read aloud, spoken version, TTS, or sound output
- image: request to generate/create/draw an image, illustration, photo, icon, logo, or visual asset
- both: request that explicitly needs both UI generation and audio generation in the same turn

Rules:
- Prefer genui when the request can reasonably be represented as a simple dynamic UI (charts, tables, dashboards, forms, timelines, lists, or structured summaries).
- Choose normal when the request requires fetching, querying, or accessing real data from external services or tools (e.g., Google Calendar events, Jira issues, Confluence pages, Slack messages, Google Drive files, email). These requests need tool access that genui does not provide.
- Choose normal when plain text clearly serves better (greetings, short conversational exchanges, opinion-only discussion, or simple direct Q&A with no structure).
- If the user asks for both kinds of output, choose both.
- Ignore previous assistant capabilities; classify only user intent.

Return strict JSON only:
{"intent":"normal|genui|audio|image|both","confidence":0.0,"reason":"short reason"}`;

function getNonEmptyString(value) {
	if (typeof value !== "string") {
		return null;
	}

	const trimmedValue = value.trim();
	return trimmedValue.length > 0 ? trimmedValue : null;
}

function normalizeIntent(value) {
	const normalized = getNonEmptyString(value)?.toLowerCase();
	if (!normalized) {
		return "normal";
	}

	if (SMART_GENERATION_INTENTS.has(normalized)) {
		return normalized;
	}

	if (normalized.includes("both")) {
		return "both";
	}
	if (normalized.includes("genui") || normalized.includes("ui")) {
		return "genui";
	}
	if (
		normalized.includes("image") ||
		normalized.includes("photo") ||
		normalized.includes("picture") ||
		normalized.includes("illustration") ||
		normalized.includes("logo")
	) {
		return "image";
	}
	if (normalized.includes("audio") || normalized.includes("voice") || normalized.includes("speech")) {
		return "audio";
	}
	return "normal";
}

function clampConfidence(value) {
	if (typeof value !== "number" || !Number.isFinite(value)) {
		return null;
	}

	if (value < 0) {
		return 0;
	}
	if (value > 1) {
		return 1;
	}
	return value;
}

function parseJsonFromText(rawText) {
	const text = getNonEmptyString(rawText);
	if (!text) {
		return null;
	}

	try {
		return JSON.parse(text);
	} catch {
		// Continue with fallback extraction.
	}

	const jsonMatch = text.match(/\{[\s\S]*\}/);
	if (!jsonMatch) {
		return null;
	}

	try {
		return JSON.parse(jsonMatch[0]);
	} catch {
		return null;
	}
}

function parseClassification(rawText) {
	const parsed = parseJsonFromText(rawText);
	if (parsed && typeof parsed === "object") {
		return {
			intent: normalizeIntent(parsed.intent),
			confidence: clampConfidence(parsed.confidence),
			reason: getNonEmptyString(parsed.reason),
		};
	}

	return {
		intent: normalizeIntent(rawText),
		confidence: null,
		reason: null,
	};
}

function buildClassifierPrompt({ latestUserMessage, conversationHistory }) {
	const lastMessage = getNonEmptyString(latestUserMessage) || "";
	const historyLines = Array.isArray(conversationHistory)
		? conversationHistory
				.slice(-6)
				.map((message) => {
					const role = message?.type === "assistant" ? "Assistant" : "User";
					const content = getNonEmptyString(message?.content);
					if (!content) {
						return null;
					}
					return `${role}: ${content}`;
				})
				.filter(Boolean)
		: [];

	return [
		"Conversation context:",
		historyLines.length > 0 ? historyLines.join("\n") : "(none)",
		"",
		`Latest user request: ${lastMessage}`,
		"",
		"Return JSON only.",
	].join("\n");
}

function withTimeout(promise, timeoutMs) {
	return new Promise((resolve, reject) => {
		const timer = setTimeout(() => {
			const timeoutError = new Error("smart-generation-classifier-timeout");
			timeoutError.code = "SMART_GENERATION_CLASSIFIER_TIMEOUT";
			reject(timeoutError);
		}, timeoutMs);

		Promise.resolve(promise)
			.then((value) => {
				clearTimeout(timer);
				resolve(value);
			})
			.catch((error) => {
				clearTimeout(timer);
				reject(error);
			});
	});
}

async function classifySmartGenerationIntent({
	latestUserMessage,
	conversationHistory,
	classify,
	timeoutMs = 800,
} = {}) {
	const prompt = getNonEmptyString(latestUserMessage);
	if (!prompt || typeof classify !== "function") {
		return {
			intent: "normal",
			confidence: null,
			reason: "missing-input",
			rawOutput: null,
			error: null,
			timedOut: false,
		};
	}

	try {
		const rawOutput = await withTimeout(
			classify({
				system: CLASSIFIER_SYSTEM_PROMPT,
				prompt: buildClassifierPrompt({ latestUserMessage: prompt, conversationHistory }),
			}),
			timeoutMs,
		);
		const parsed = parseClassification(rawOutput);
		return {
			intent: parsed.intent,
			confidence: parsed.confidence,
			reason: parsed.reason,
			rawOutput: getNonEmptyString(rawOutput),
			error: null,
			timedOut: false,
		};
	} catch (error) {
		const timedOut = error?.code === "SMART_GENERATION_CLASSIFIER_TIMEOUT";
		return {
			intent: "normal",
			confidence: null,
			reason: timedOut ? "timeout" : "classifier-error",
			rawOutput: null,
			error: error instanceof Error ? error.message : String(error),
			timedOut,
		};
	}
}

module.exports = {
	CLASSIFIER_SYSTEM_PROMPT,
	SMART_GENERATION_INTENTS,
	normalizeIntent,
	parseClassification,
	buildClassifierPrompt,
	classifySmartGenerationIntent,
};
