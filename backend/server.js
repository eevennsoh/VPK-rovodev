// Initialize console early for startup debugging
console.log("[STARTUP] Server process starting...");
console.error("[STARTUP] Startup initiated", new Date().toISOString());

// Try to load .env.local if it exists, but don't fail if it doesn't
try {
	require("dotenv").config({ path: require("path").join(__dirname, "..", ".env.local") });
	console.log("[STARTUP] .env.local loaded");
} catch {
	console.log("[STARTUP] .env.local not found, using environment variables only");
}

const express = require("express");
const cors = require("cors");
const path = require("path");
const { createUIMessageStream, pipeUIMessageStreamToResponse } = require("ai");
const { createRunManager } = require("./lib/plan-runs");
const { createRunManager: createMakerRunManager } = require("./lib/maker-runs");
const { createThreadManager } = require("./lib/plan-threads");
const { createThreadManager: createMakerThreadManager } = require("./lib/maker-threads");
const planFs = require("./lib/plan-filesystem");
const makerFs = require("./lib/maker-filesystem");
const { genuiChatHandler, generateGenuiFromRovodevResponse } = require("./lib/genui-chat-handler");
const {
	streamViaRovoDev,
	generateTextViaRovoDev,
	isChatInProgressError,
	initPool,
	setPinnedPortCount,
	WAIT_FOR_TURN_TIMEOUT_MS,
} = require("./lib/rovodev-gateway");
const { createAIGatewayProvider } = require("./lib/ai-gateway-provider");
const { getGenuiSystemPrompt } = require("./lib/genui-system-prompt");
const { analyzeGeneratedText, pickBestSpec } = require("./lib/genui-spec-utils");
const { buildFallbackGenuiSpecFromText, buildMinimalTextCardSpec } = require("./lib/genui-fallback-spec");
const { buildToolObservationFallback } = require("./lib/genui-tool-observation-fallback");
const { buildToolObservationStructuredFallback } = require("./lib/genui-tool-observation-structured-fallback");
const { buildGoogleStructuredFallback } = require("./lib/genui-google-tool-fallback");
const { buildFigmaStructuredFallback } = require("./lib/genui-figma-tool-fallback");
const { assessToolFirstGenuiQuality } = require("./lib/tool-first-genui-quality");
const { looksLikeInabilityResponse } = require("./lib/inability-response-detector");
const { classifySmartGenerationIntent, preClassifyMediaIntent } = require("./lib/smart-generation-intent");
const {
	buildSmartGenerationGatewayOptions,
} = require("./lib/smart-generation-gateway-options");
const {
	resolveToolFirstPolicy,
	TOOL_FIRST_ENFORCEMENT_MODE_SOFT_RETRY,
	createToolFirstExecutionState,
	recordToolFirstAttempt,
	recordToolThinkingEvent,
	isToolNameRelevant,
	hasRelevantToolSuccess,
	hasRelevantToolObservation,
	getToolFirstRetryDelayMs,
	buildToolFirstRetryInstruction,
	buildToolContextForGenui,
	buildToolFirstTextFallback,
	shouldSuppressToolFirstIntentStatus,
	stripToolFirstFailureNarrative,
	getPostClarificationDirective,
} = require("./lib/tool-first-genui-policy");
const {
	resolveToolFirstWidgetContentType,
	resolveToolFirstWidgetSource,
} = require("./lib/tool-first-widget-content-type");
const { resolveToolFirstRoutingFlags } = require("./lib/tool-first-routing-flags");
const {
	buildClassifierPrompt: buildSmartClarificationClassifierPrompt,
	parseClassifierOutput: parseSmartClarificationClassifierOutput,
	isVagueVisualizationRequest,
	shouldGateSmartClarification,
} = require("./lib/smart-clarification-gate");
const {
	resolveGoogleImageGatewayConfig,
	toImageWidgetErrorMessage,
	isUnsupportedModalitiesError,
} = require("./lib/image-generation-routing");
const { healthCheck: rovoDevHealthCheck, cancelChat: rovoDevCancelChat } = require("./lib/rovodev-client");
const { createRovoDevPool } = require("./lib/rovodev-pool");
const { createOrchestratorLog } = require("./lib/orchestrator-log");
const {
	resolveStrictRovoDevPortAssignment,
	buildRovoDevPortBindingInstruction,
} = require("./lib/rovodev-port-assignment");
const {
	createListeningPidReader,
	restartRovoDevPort,
	DEFAULT_RECOVERY_TIMEOUT_MS: DEFAULT_ROVODEV_PORT_RECOVERY_TIMEOUT_MS,
} = require("./lib/rovodev-port-recovery");
const {
	getEnvVars,
	detectEndpointType,
	resolveGatewayUrl,
	streamBedrockGatewayManualSse,
	streamGoogleGatewayManualSse,
} = require("./lib/ai-gateway-helpers");
const { synthesizeSound } = require("./lib/sound-generation");
const {
	isAudioRequestPrompt,
	resolveSmartAudioVoiceInput,
	stripConversationalFiller,
} = require("./lib/smart-audio-routing");
const {
	isAudioContextClarificationSession,
	resolveAudioContextVoiceInputFromClarification,
} = require("./lib/audio-context-resolution");
const {
	isImageContextClarificationSession,
	resolveImageContextFromClarification,
} = require("./lib/image-context-resolution");
const {
	resolveSmartImagePrompt,
	buildEnrichedImagePrompt,
} = require("./lib/smart-image-routing");
const {
	resolveSpeechPayloadFromAudioRequest,
} = require("./lib/audio-input-extractor");
const {
	GOOGLE_TRANSLATE_REQUIRED_TOOL_NAME,
	resolveTranslationRequestState,
	resolveTranslationRequestFromClarification,
	createTranslationClarificationSessionId,
	isTranslationClarificationSession,
	buildTranslationClarificationPayload,
	createTranslationToolExecutionPrompt,
	parseTranslationToolResult,
	parseTranslationModelOutput,
	buildTranslationTextSummary,
	buildTranslationGenuiSpec,
} = require("./lib/translation-card");
const {
	extractPlanWidgetPayloadFromText,
	extractProgressivePlanWidgetPayloadFromText,
	extractPlanWidgetPayloadFromStructuredText,
} = require("./lib/plan-widget-fallback");
const { detectPlanningIntent } = require("./lib/planning-intent");
const {
	shouldGatePlanningQuestionCard,
	isConversationalMessage,
	isTaskLikeMessage,
} = require("./lib/planning-question-gate");
const { resolvePlanMode } = require("./lib/plan-mode-resolution");
const {
	extractQuestionCardDefinitionFromAssistantText,
	resolveFallbackQuestionCardState,
	looksLikeClarificationResponse,
	MAX_LABEL_LENGTH: CLARIFICATION_MAX_LABEL_LENGTH,
} = require("./lib/question-card-extractor");
const {
	sanitizeQuestionCardPayload,
	buildQuestionCardPayloadFromRequestUserInput,
} = require("./lib/question-card-payload");
const {
	shouldGateToolFirstQuestionCard,
	buildToolFirstQuestionCardPayload,
	buildToolFirstClarificationInstruction,
} = require("./lib/tool-first-question-gate");
const {
	MAX_INLINE_ASSISTANT_JSON_CHARS,
	ASSISTANT_JSON_SUPPRESSION_TEXT,
	toPreview,
	isLikelyLargeJsonDump,
	sanitizeAssistantNarrative,
} = require("./lib/tool-output-sanitizer");

console.log("[STARTUP] Dependencies loaded");

// ─── RovoDev Serve Detection ─────────────────────────────────────────────────
// When `pnpm run rovodev` is used, `dev-rovodev.js` writes the serve port to
// `.dev-rovodev-port`. The backend reads this file to decide whether to route
// chat traffic through the local RovoDev agent loop instead of AI Gateway.

const ROVODEV_PORT_FILE = path.join(__dirname, "..", ".dev-rovodev-port");
const ROVODEV_PORTS_FILE = path.join(__dirname, "..", ".dev-rovodev-ports");

/** Cached availability state — refreshed on each request via the port file. */
let _rovoDevAvailable = false;
let _rovoDevChecked = false;
let _rovoDevLastRefresh = 0;
/** @type {import("./lib/rovodev-pool") | null} */
let _rovoDevPool = null;

/**
 * Read ports from the multi-port file (.dev-rovodev-ports) or fall back
 * to the single-port file (.dev-rovodev-port).
 * @returns {number[]} Array of valid port numbers, or empty array.
 */
function readRovoDevPorts() {
	const fs = require("fs");

	// Try JSON array file first
	if (fs.existsSync(ROVODEV_PORTS_FILE)) {
		try {
			const parsed = JSON.parse(fs.readFileSync(ROVODEV_PORTS_FILE, "utf8").trim());
			if (Array.isArray(parsed) && parsed.length > 0) {
				const validPorts = parsed.filter((p) => typeof p === "number" && p > 0);
				if (validPorts.length > 0) {
					return validPorts;
				}
			}
		} catch {
			// Ignore parse errors
		}
	}

	// Fall back to single port file
	if (fs.existsSync(ROVODEV_PORT_FILE)) {
		try {
			const portStr = fs.readFileSync(ROVODEV_PORT_FILE, "utf8").trim();
			const port = parseInt(portStr, 10);
			if (!isNaN(port) && port > 0) {
				return [port];
			}
		} catch {
			// Ignore read errors
		}
	}

	return [];
}

/**
 * Poll a RovoDev port until it's ready for new requests.
 * Uses a non-destructive healthcheck probe (no state mutation, no cancellation).
 * Resolves when ready; rejects if the port doesn't become ready within the
 * probe window (READY_PROBE_INTERVAL_MS × READY_PROBE_MAX_ATTEMPTS).
 *
 * @param {number} port
 * @returns {Promise<void>}
 */
async function waitForPortReady(port) {
	// Always wait the minimum cooldown first — RovoDev Serve needs a brief
	// moment after the SSE stream closes before it can accept new requests.
	await new Promise((resolve) => setTimeout(resolve, POST_STREAM_COOLDOWN_MS));

	for (let attempt = 0; attempt < READY_PROBE_MAX_ATTEMPTS; attempt++) {
		try {
			await rovoDevHealthCheck(port);
			// Healthcheck passed — port is alive and ready
			return;
		} catch {
			// Healthcheck failed — port is still clearing or unreachable
			await new Promise((resolve) => setTimeout(resolve, READY_PROBE_INTERVAL_MS));
		}
	}

	// Exhausted all probe attempts — port is not recovering
	throw new Error(`Port ${port} did not become ready after ${READY_PROBE_MAX_ATTEMPTS} probes`);
}

/**
 * Check whether a RovoDev Serve instance is reachable.
 * Reads the port files written by `dev-rovodev.js` and pings health endpoints.
 * Creates/updates the pool with all healthy ports.
 */
async function refreshRovoDevAvailability() {
	try {
		const ports = readRovoDevPorts();
		if (ports.length === 0) {
			if (_rovoDevPool) {
				_rovoDevPool.shutdown();
				_rovoDevPool = null;
				initPool(null);
			}
			_rovoDevAvailable = false;
			_rovoDevChecked = true;
			return false;
		}

		// Health-check each port
		const healthyPorts = [];
		for (const port of ports) {
			try {
				await rovoDevHealthCheck(port);
				healthyPorts.push(port);
			} catch (healthCheckErr) {
				// 401/403 means the server is running but requires auth — still healthy
				if (
					healthCheckErr.message.includes("status 401") ||
					healthCheckErr.message.includes("status 403")
				) {
					healthyPorts.push(port);
				} else {
					debugLog("ROVODEV", `Port ${port} health check failed`, { error: healthCheckErr.message });
				}
			}
		}

		if (healthyPorts.length === 0) {
			if (_rovoDevPool) {
				_rovoDevPool.shutdown();
				_rovoDevPool = null;
				initPool(null);
			}
			_rovoDevAvailable = false;
			_rovoDevChecked = true;
			return false;
		}

		// Set the env var for backward compat (first healthy port)
		process.env.ROVODEV_PORT = String(healthyPorts[0]);

		if (_rovoDevPool) {
			// In-place update: preserves busy handles instead of destroying them
			_rovoDevPool.updatePorts(healthyPorts);
		} else {
			_rovoDevPool = createRovoDevPool(healthyPorts, {
				waitForReady: waitForPortReady,
			});
			initPool(_rovoDevPool);
			setPinnedPortCount(PINNED_PORT_COUNT);
		}

		if (healthyPorts.length === 1) {
			console.log(`[ROVODEV] Serve available on port ${healthyPorts[0]}`);
		} else {
			console.log(`[ROVODEV] Pool initialized: ${healthyPorts.length} ports (${healthyPorts.join(", ")})`);
		}

		_rovoDevAvailable = true;
		_rovoDevChecked = true;
		return true;
	} catch (err) {
		_rovoDevAvailable = false;
		_rovoDevChecked = true;
		debugLog("ROVODEV", "Not available", { error: err.message });
		return false;
	}
}

/**
 * Returns true if RovoDev Serve is available. Uses cached result if already checked,
 * otherwise performs a fresh check. The port file is re-read on each call to detect
 * if RovoDev was started or stopped since last check.
 * 
 * Periodically refreshes the pool to pick up newly available ports.
 */
async function isRovoDevAvailable() {
	const fs = require("fs");
	const portsFileExists = fs.existsSync(ROVODEV_PORTS_FILE);
	const portFileExists = fs.existsSync(ROVODEV_PORT_FILE);

	// If both port files disappeared, RovoDev was stopped
	if (!portsFileExists && !portFileExists) {
		if (_rovoDevAvailable) {
			console.error("[ROVODEV] Port files removed — RovoDev Serve is no longer available");
			if (_rovoDevPool) {
				_rovoDevPool.shutdown();
				_rovoDevPool = null;
				initPool(null);
			}
		}
		_rovoDevAvailable = false;
		_rovoDevChecked = true;
		return false;
	}

	// If the port file appeared or we haven't checked yet, do a fresh health check
	if (!_rovoDevChecked || !_rovoDevAvailable) {
		return refreshRovoDevAvailability();
	}

	// Periodically refresh pool to pick up newly healthy ports (every 60 seconds)
	const now = Date.now();
	if (!_rovoDevLastRefresh) {
		_rovoDevLastRefresh = now;
	}
	if (now - _rovoDevLastRefresh > 60000) {
		_rovoDevLastRefresh = now;
		return refreshRovoDevAvailability();
	}

	return _rovoDevAvailable;
}

const app = express();
const port = process.env.PORT || 8080;
console.log(`[STARTUP] Port configured: ${port}`);
const aiGatewayProvider = createAIGatewayProvider({ logger: console });

// Debug logging
const DEBUG = process.env.DEBUG === "true";
function debugLog(section, message, data) {
	if (DEBUG) {
		console.log(`[DEBUG][${section}] ${message}`, data ? JSON.stringify(data, null, 2) : "");
	}
}

const CLARIFICATION_WIDGET_TYPE = "question-card";
const CLARIFICATION_MAX_ROUNDS = 3;
const CLARIFICATION_MAX_PRESET_OPTIONS = 8;
const CLARIFICATION_CUSTOM_OPTION_PLACEHOLDER = "Tell Rovo what to do...";
const PLANNING_GATE_SKIP_SOURCES = new Set([
	"clarification-submit",
	"plan-approval-submit",
	"plan-retry",
]);
const TOOL_FIRST_GATE_SKIP_SOURCES = new Set([
	"clarification-submit",
]);
const PLANNING_GATE_INTRO_TEXT =
	"Before I draft the plan, answer these quick questions.";
const DEFAULT_CONFLUENCE_BASE_URL = "https://venn-test.atlassian.net/wiki";
const MAX_SLACK_SUMMARY_CHARS = 35000;
const INTERACTIVE_CHAT_FALLBACK_ENABLED = false;
const INTERACTIVE_CHAT_FORCE_PORT_RECOVERY_MAX_ATTEMPTS = 2;
const INTERACTIVE_CHAT_FORCE_PORT_RECOVERY_TIMEOUT_MS =
	DEFAULT_ROVODEV_PORT_RECOVERY_TIMEOUT_MS;
const POST_STREAM_COOLDOWN_MS = 500;
const READY_PROBE_INTERVAL_MS = 100;
const READY_PROBE_MAX_ATTEMPTS = 20; // 100ms × 20 = 2s max
const PINNED_PORT_COUNT = 3;

/**
 * Tracks the latest request timestamp per portIndex.
 * Used to detect when a newer request has arrived for the same panel,
 * so post-stream tasks (e.g. suggestions) can be skipped for stale requests.
 * Map<number, number> — portIndex → timestamp of most recent request.
 */
const portIndexRequestTimestamps = new Map();
const AI_GATEWAY_ALLOWED_USE_CASES = ["image", "sound", "suggestions"];
const SUGGESTIONS_BACKEND_DEFAULT = "ai-gateway";
const SUGGESTIONS_BACKEND_VALUES = new Set(["ai-gateway", "rovodev", "dynamic"]);
const getListeningPidsForPort = createListeningPidReader();

function isTruthyFlag(value) {
	if (typeof value !== "string") {
		return false;
	}

	return ["1", "true", "yes", "on"].includes(value.trim().toLowerCase());
}

function isAIGatewayFallbackEnabled() {
	return isTruthyFlag(process.env.AUTO_FALLBACK_TO_AI_GATEWAY);
}

function resolveSuggestionsBackendPreference() {
	const rawValue = getNonEmptyString(process.env.SUGGESTIONS_BACKEND);
	if (!rawValue) {
		return SUGGESTIONS_BACKEND_DEFAULT;
	}

	const normalizedValue = rawValue.toLowerCase();
	return SUGGESTIONS_BACKEND_VALUES.has(normalizedValue)
		? normalizedValue
		: SUGGESTIONS_BACKEND_DEFAULT;
}

function shouldPreferRovoDevForDynamicSuggestions() {
	const poolStatus = _rovoDevPool?.getStatus?.();
	if (!poolStatus || !Array.isArray(poolStatus.ports) || poolStatus.ports.length === 0) {
		return false;
	}

	const totalPorts = poolStatus.ports.length;
	const unhealthyCount = poolStatus.ports.filter((entry) => entry?.status === "unhealthy").length;
	if (unhealthyCount > 0) {
		return false;
	}

	const busyLikeCount = poolStatus.ports.filter(
		(entry) => entry?.status === "busy" || entry?.status === "cooldown"
	).length;
	const utilization = busyLikeCount / totalPorts;
	return utilization < 0.5;
}

function resolveGatewayUrlForProvider(envVars, preferredProvider, providedGatewayUrl) {
	if (typeof providedGatewayUrl === "string" && providedGatewayUrl.trim().length > 0) {
		return providedGatewayUrl.trim();
	}

	if (preferredProvider === "google") {
		return envVars.AI_GATEWAY_URL_GOOGLE || envVars.AI_GATEWAY_URL;
	}

	return envVars.AI_GATEWAY_URL || envVars.AI_GATEWAY_URL_GOOGLE;
}

function getAIGatewayConfigReport(envVars = getEnvVars()) {
	return {
		AI_GATEWAY_URL: envVars.AI_GATEWAY_URL ? "SET" : "MISSING",
		AI_GATEWAY_URL_GOOGLE: envVars.AI_GATEWAY_URL_GOOGLE ? "SET" : "MISSING",
		AI_GATEWAY_USE_CASE_ID: envVars.AI_GATEWAY_USE_CASE_ID ? "SET" : "MISSING",
		AI_GATEWAY_CLOUD_ID: envVars.AI_GATEWAY_CLOUD_ID ? "SET" : "MISSING",
		AI_GATEWAY_USER_ID: envVars.AI_GATEWAY_USER_ID ? "SET" : "MISSING",
		ASAP_ISSUER: process.env.ASAP_ISSUER ? "SET" : "MISSING",
		ASAP_KID: process.env.ASAP_KID ? "SET" : "MISSING",
		ASAP_PRIVATE_KEY: process.env.ASAP_PRIVATE_KEY ? "SET" : "MISSING",
	};
}

function hasGatewayUrlConfigured(envVars = getEnvVars()) {
	return Boolean(envVars.AI_GATEWAY_URL || envVars.AI_GATEWAY_URL_GOOGLE);
}

function classifyAIGatewayFailureStage(error) {
	const message = error instanceof Error ? error.message : String(error ?? "");

	if (
		/AI Gateway URL is not configured|Server configuration error|AI_GATEWAY_URL|AI_GATEWAY_USE_CASE_ID|AI_GATEWAY_CLOUD_ID|AI_GATEWAY_USER_ID/i.test(message)
	) {
		return "config";
	}

	if (/ASAP_|authentication|Authorization|status 401|status 403|auth/i.test(message)) {
		return "auth";
	}

	if (/stream|SSE|response body is empty|timeout|timed out/i.test(message)) {
		return "stream";
	}

	return "request";
}

function createRovoDevUnavailableError() {
	const error = new Error(
		"RovoDev Serve is required but not available. " +
		"Please start RovoDev Serve with 'pnpm run rovodev' before using this feature."
	);
	error.code = "ROVODEV_UNAVAILABLE";
	error.backendSelected = "rovodev";
	error.failureStage = "unavailable";
	return error;
}

function normalizeAIGatewayError(error) {
	const normalizedError = error instanceof Error ? error : new Error(String(error));
	normalizedError.backendSelected = "ai-gateway";
	normalizedError.failureStage = classifyAIGatewayFailureStage(normalizedError);
	return normalizedError;
}

async function resolvePreferredBackend({ allowFallback = true } = {}) {
	const rovoDevAvailable = await isRovoDevAvailable();
	const fallbackEnabled = allowFallback && isAIGatewayFallbackEnabled();

	if (rovoDevAvailable) {
		return {
			backend: "rovodev",
			rovoDevAvailable,
			fallbackEnabled,
		};
	}

	if (fallbackEnabled) {
		return {
			backend: "ai-gateway",
			rovoDevAvailable,
			fallbackEnabled,
		};
	}

	return {
		backend: null,
		rovoDevAvailable,
		fallbackEnabled,
	};
}

function sendGatewayErrorResponse(res, error, fallbackErrorMessage) {
	if (error && error.code === "ROVODEV_UNAVAILABLE") {
		return res.status(503).json({
			error: "RovoDev Serve is required but not available",
			details: error.message,
			backendSelected: "rovodev",
			failureStage: "unavailable",
		});
	}

	if (
		error &&
		(error.code === "ROVODEV_CHAT_IN_PROGRESS_TIMEOUT" ||
			isChatInProgressError(error))
	) {
		return res.status(409).json({
			error: "RovoDev chat turn is still in progress",
			details:
				"Another request is still finishing for this chat session. Please wait a moment and try again.",
			code: "ROVODEV_CHAT_IN_PROGRESS",
			backendSelected: "rovodev",
			failureStage: "stream",
		});
	}

	if (error && error.backendSelected === "ai-gateway") {
		const stage = error.failureStage || classifyAIGatewayFailureStage(error);
		const statusCode = stage === "config" ? 500 : 502;
		return res.status(statusCode).json({
			error: fallbackErrorMessage || "AI Gateway request failed",
			details: error.message,
			backendSelected: "ai-gateway",
			failureStage: stage,
		});
	}

	return res.status(500).json({
		error: fallbackErrorMessage || "Internal server error",
		details: error instanceof Error ? error.message : String(error),
		backendSelected: "unknown",
		failureStage: "request",
	});
}

async function streamTextViaAIGateway({
	system,
	prompt,
	messages,
	maxOutputTokens = 2000,
	temperature = 1,
	provider,
	model,
	gatewayUrl,
	onTextDelta,
	onFile,
}) {
	const envVars = getEnvVars();
	const rawGatewayUrl = resolveGatewayUrlForProvider(
		envVars,
		typeof provider === "string" ? provider.trim() : null,
		gatewayUrl
	);

	if (!rawGatewayUrl) {
		throw new Error("AI Gateway URL is not configured.");
	}

	const resolvedGatewayUrl = resolveGatewayUrl(rawGatewayUrl) || rawGatewayUrl;
	const endpointType = detectEndpointType(resolvedGatewayUrl);

	if (endpointType === "bedrock") {
		return streamBedrockGatewayManualSse({
			gatewayUrl: resolvedGatewayUrl,
			envVars,
			system: typeof system === "string" ? system : undefined,
			prompt: typeof prompt === "string" ? prompt : undefined,
			maxOutputTokens,
			onTextDelta,
		});
	}

	const fallbackModel = endpointType === "openai" ? envVars.OPENAI_MODEL : envVars.GOOGLE_IMAGE_MODEL;
	return streamGoogleGatewayManualSse({
		gatewayUrl: resolvedGatewayUrl,
		envVars,
		model: typeof model === "string" && model.trim() ? model.trim() : fallbackModel,
		system: typeof system === "string" ? system : undefined,
		prompt: typeof prompt === "string" ? prompt : undefined,
		messages,
		maxOutputTokens,
		temperature,
		onTextDelta,
		onFile,
	});
}

app.use(cors());
app.use(express.json({ limit: "50mb" }));
app.use(express.text({ limit: "50mb", type: "text/markdown" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));
app.use((error, _req, res, next) => {
	if (error?.type === "entity.too.large" || error?.status === 413) {
		return res.status(413).json({
			error: "Request payload is too large.",
			reason: "payload_too_large",
			details:
				"The request included more data than this endpoint can process, often from inline image/file data in chat history. You can continue chatting after starting a new thread or trimming history.",
		});
	}

	return next(error);
});

console.log("[STARTUP] Middleware configured");

let buildUserMessage;
let buildQuestionCardSkipNotification;
try {
	let config;
	try {
		config = require("./rovo/config");
		console.log("[STARTUP] config loaded from ./rovo (Docker path)");
	} catch {
		config = require("../rovo/config");
		console.log("[STARTUP] config loaded from ../rovo (local dev path)");
	}
	buildUserMessage = config.buildUserMessage;
	buildQuestionCardSkipNotification = config.buildQuestionCardSkipNotification;
	console.log("[STARTUP] rovo config loaded successfully");
} catch (error) {
	console.warn("[STARTUP] rovo config failed to load:", error.message);
	console.warn("[STARTUP] Using fallback functions - config did not load!");
	buildUserMessage = (message) => message;
	buildQuestionCardSkipNotification = () => "[Question Card Dismissed]\nThe user skipped the clarification questions.\n[End Question Card Dismissed]";
}

/**
 * Generates text using the best available backend.
 */
async function generateTextViaGateway({
	system,
	prompt,
	messages,
	maxOutputTokens = 2000,
	temperature = 0.4,
	provider,
	gatewayUrl,
	signal,
	allowFallback = false,
	portIndex,
	excludePinnedPorts,
}) {
	const backendSelection = await resolvePreferredBackend({ allowFallback });
	if (backendSelection.backend === "rovodev") {
		debugLog("GENERATE", "Routing through RovoDev Serve");
		try {
			return await generateTextViaRovoDev({
				system,
				prompt,
				conflictPolicy: "wait-for-turn",
				timeoutMs: WAIT_FOR_TURN_TIMEOUT_MS,
				signal,
				portIndex,
				excludePinnedPorts,
			});
		} catch (rovoDevError) {
			const is409Timeout =
				rovoDevError?.code === "ROVODEV_CHAT_IN_PROGRESS_TIMEOUT" ||
				isChatInProgressError(rovoDevError);
			const canFallback =
				is409Timeout &&
				allowFallback &&
				isAIGatewayFallbackEnabled() &&
				hasGatewayUrlConfigured();
			if (!canFallback) {
				throw rovoDevError;
			}
			console.warn(
				"[generateTextViaGateway] RovoDev 409 timeout — falling back to AI Gateway"
			);
		}
	}

	if (backendSelection.backend !== "ai-gateway" && backendSelection.backend !== "rovodev") {
		throw createRovoDevUnavailableError();
	}
	if (!allowFallback) {
		throw createRovoDevUnavailableError();
	}

	debugLog("GENERATE", "Routing through AI Gateway fallback");
	try {
			return await aiGatewayProvider.generateText({
				system,
				prompt,
				messages,
				maxOutputTokens,
				temperature,
				provider,
				gatewayUrl,
				signal,
			});
	} catch (error) {
		throw normalizeAIGatewayError(error);
	}
}

function extractTextFromUiParts(parts) {
	if (!Array.isArray(parts)) {
		return "";
	}

	return parts
		.filter((part) => part?.type === "text" && typeof part.text === "string")
		.map((part) => part.text)
		.join("")
		.trim();
}

function mapUiMessagesToConversation(messages) {
	if (!Array.isArray(messages)) {
		return { message: "", conversationHistory: [] };
	}

	const conversation = messages
		.map((message) => {
			if (!message || (message.role !== "user" && message.role !== "assistant")) {
				return null;
			}

			const content = extractTextFromUiParts(message.parts);
			if (!content) {
				return null;
			}

			return {
				type: message.role,
				content,
			};
		})
		.filter(Boolean);

	let currentUserMessageIndex = -1;
	for (let index = conversation.length - 1; index >= 0; index--) {
		if (conversation[index].type === "user") {
			currentUserMessageIndex = index;
			break;
		}
	}

	if (currentUserMessageIndex === -1) {
		return { message: "", conversationHistory: conversation };
	}

	return {
		message: conversation[currentUserMessageIndex].content,
		conversationHistory: conversation.slice(0, currentUserMessageIndex),
	};
}

const GENUI_META_PREFIX = "[genui-meta]";
const SMART_ROUTE_TARGET_SURFACES = new Set([
	"multiports",
	"sidebar",
	"fullscreen",
]);
const SMART_INTENT_TIMEOUT_MS = 1500;
const SMART_WIDGET_TYPE_GENUI = "genui-preview";
const SMART_WIDGET_TYPE_AUDIO = "audio-preview";
const SMART_WIDGET_TYPE_IMAGE = "image-preview";
const SMART_VOICE_INPUT_MAX_CHARS = 4000;
const SMART_IMAGE_PROMPT_MAX_CHARS = 4000;
const SOUND_GENERATION_INPUT_MAX_CHARS = 4096;
const CLASSIFIER_JSON_ALLOWED_KEYS = new Set(["intent", "confidence", "reason"]);
const CLASSIFIER_JSON_BUFFER_MAX_CHARS = 320;
const MAX_ASSISTANT_TEXT_WITH_TOOL_CALLS_CHARS = 1400;
const SMART_IMAGE_REQUEST_PATTERN =
	/\b(generate|create|draw|make|design|render|show)\b[\s\S]{0,80}\b(image|photo|picture|illustration|icon|logo|wallpaper|art)\b|\b(image|photo|picture|illustration|icon|logo)\b[\s\S]{0,80}\b(generate|create|draw|make|design|render|show)\b/i;
const SMART_UI_REQUEST_PATTERN =
	/\b(ui|interface|layout|component|page|dashboard|mockup|wireframe|widget|json\s*spec|json-render|chart|charts|graph|graphs|plot|plots|table|tables|kanban|board|timeline|roadmap|form|visuali[sz]e|infographic)\b/i;
const GENUI_FALLBACK_ERROR_TEXT =
	"I couldn't generate an interactive card right now. Please try again later.";
const SMART_WIDTH_CLASS_VALUES = new Set(["compact", "regular", "wide"]);

function getSmartWidthClass(value) {
	const normalizedValue = getNonEmptyString(value);
	if (!normalizedValue) {
		return null;
	}

	const lowerValue = normalizedValue.toLowerCase();
	return SMART_WIDTH_CLASS_VALUES.has(lowerValue) ? lowerValue : null;
}

function inferSmartWidthClass({ containerWidthPx, viewportWidthPx, surface }) {
	const widthSource = containerWidthPx ?? viewportWidthPx;
	if (typeof widthSource === "number") {
		if (widthSource <= 520) {
			return "compact";
		}
		if (widthSource <= 900) {
			return "regular";
		}
		return "wide";
	}

	if (surface === "sidebar" || surface === "multiports") {
		return "compact";
	}
	if (surface === "fullscreen") {
		return "wide";
	}

	return null;
}

function normalizeSmartGenerationOptions(value) {
	if (!value || typeof value !== "object") {
		return {
			enabled: false,
			surface: null,
			containerWidthPx: null,
			viewportWidthPx: null,
			widthClass: null,
		};
	}

	const enabled = value.enabled === true;
	const surface = getNonEmptyString(value.surface);
	const containerWidthPx = getPositiveInteger(value.containerWidthPx);
	const viewportWidthPx = getPositiveInteger(value.viewportWidthPx);
	const explicitWidthClass = getSmartWidthClass(value.widthClass);
	const inferredWidthClass = inferSmartWidthClass({
		containerWidthPx,
		viewportWidthPx,
		surface,
	});

	return {
		enabled,
		surface,
		containerWidthPx: containerWidthPx ?? null,
		viewportWidthPx: viewportWidthPx ?? null,
		widthClass: explicitWidthClass ?? inferredWidthClass,
	};
}

function isSmartGenerationEnabled(value) {
	const normalized = normalizeSmartGenerationOptions(value);
	return (
		normalized.enabled &&
		typeof normalized.surface === "string" &&
		SMART_ROUTE_TARGET_SURFACES.has(normalized.surface)
	);
}

function inferSmartIntentFromPrompt(prompt) {
	const text = getNonEmptyString(prompt);
	if (!text) {
		return "normal";
	}
	if (isConversationalMessage(text)) {
		return "normal";
	}

	const isTaskLikeRequest = isTaskLikeMessage(text);

	const wantsImage = SMART_IMAGE_REQUEST_PATTERN.test(text);
	if (wantsImage) {
		return "image";
	}

	const wantsUi = SMART_UI_REQUEST_PATTERN.test(text);
	const wantsAudio = isAudioRequestPrompt(text);
	if (wantsUi && wantsAudio && isTaskLikeRequest) {
		return "both";
	}
	if (wantsUi && isTaskLikeRequest) {
		return "genui";
	}
	if (wantsAudio) {
		return "audio";
	}

	return "normal";
}

function shouldPreferGenuiWhenPossible(prompt) {
	const text = getNonEmptyString(prompt);
	if (!text) {
		return false;
	}

	return isTaskLikeMessage(text);
}

function isCreateIntentRequest(prompt) {
	const text = getNonEmptyString(prompt);
	if (!text) {
		return false;
	}

	return /^\s*(?:please\s+)?(?:(?:can|could|would)\s+you\s+)?(?:create|build|generate|make|design|draft)\b/i.test(
		text
	);
}

function mapUiMessagesToRoleContent(messages) {
	if (!Array.isArray(messages)) {
		return [];
	}

	return messages
		.map((message) => {
			if (!message || (message.role !== "assistant" && message.role !== "user")) {
				return null;
			}

			const content = extractTextFromUiParts(message.parts);
			if (!content) {
				return null;
			}

			return {
				role: message.role === "assistant" ? "assistant" : "user",
				content,
			};
		})
		.filter(Boolean);
}

function parseGenuiMetaAndBody(rawText) {
	if (typeof rawText !== "string" || rawText.length === 0) {
		return { meta: null, body: "" };
	}

	const lines = rawText.split("\n");
	const firstLine = lines[0]?.trim() ?? "";
	if (!firstLine.startsWith(GENUI_META_PREFIX)) {
		return { meta: null, body: rawText };
	}

	const maybeJson = firstLine.slice(GENUI_META_PREFIX.length).trim();
	try {
		return {
			meta: JSON.parse(maybeJson),
			body: lines.slice(1).join("\n").trimStart(),
		};
	} catch {
		return { meta: null, body: rawText };
	}
}

function stripSpecBlocks(value) {
	if (typeof value !== "string" || value.length === 0) {
		return "";
	}

	return value
		.replace(/```spec[\s\S]*?```/gi, "")
		.replace(/\n{3,}/g, "\n\n")
		.trim();
}

function buildAudioDataUrl(audioBytes, contentType) {
	const mimeType = getNonEmptyString(contentType) || "audio/mpeg";
	const base64 = Buffer.from(audioBytes).toString("base64");
	return `data:${mimeType};base64,${base64}`;
}

async function generateSmartGenuiResult({
	roleMessages,
	provider,
	gatewayUrl,
	layoutContext,
	signal,
}) {
	const systemPrompt = getGenuiSystemPrompt({
		strict: true,
		layoutContext,
	});
	const conversationPrompt = roleMessages
		.map((message) => `[${message.role === "assistant" ? "Assistant" : "User"}]\n${message.content}`)
		.join("\n\n");

	const rawText = await generateTextViaGateway({
		system: systemPrompt,
		prompt: conversationPrompt,
		maxOutputTokens: 3500,
		temperature: 0.3,
		signal,
		...buildSmartGenerationGatewayOptions({
			provider,
			excludePinnedPorts: true,
		}),
		gatewayUrl,
	});

	const { meta, body } = parseGenuiMetaAndBody(rawText);
	const analysis = analyzeGeneratedText(body);
	const bestSpec = pickBestSpec(analysis);
	const qualityAssessment = assessToolFirstGenuiQuality({
		analysis,
		spec: bestSpec,
	});
	return {
		rawText,
		meta,
		spec: bestSpec,
		narrative: stripSpecBlocks(body),
		quality: qualityAssessment.quality,
		analysisSummary: {
			synthesizedChildCount: qualityAssessment.synthesizedChildCount,
			missingChildKeyCount: qualityAssessment.missingChildKeyCount,
			usedSynthesizedSpec: qualityAssessment.usedSynthesizedSpec,
			hasRecoveredPlaceholderSection:
				qualityAssessment.hasRecoveredPlaceholderSection,
			reasons: qualityAssessment.reasons,
		},
	};
}

function getLatestVisibleUserMessage(messages) {
	if (!Array.isArray(messages)) {
		return null;
	}

	for (let index = messages.length - 1; index >= 0; index -= 1) {
		const message = messages[index];
		if (!message || message.role !== "user") {
			continue;
		}

		const visibility = getNonEmptyString(message?.metadata?.visibility);
		if (visibility === "hidden") {
			continue;
		}

		const text = extractTextFromUiParts(message.parts);
		if (!text) {
			continue;
		}

		return {
			text,
			source: getNonEmptyString(message?.metadata?.source) || null,
		};
	}

	return null;
}

function getLatestUserMessageSource(messages) {
	if (!Array.isArray(messages)) {
		return null;
	}

	for (let index = messages.length - 1; index >= 0; index -= 1) {
		const message = messages[index];
		if (!message || message.role !== "user") {
			continue;
		}

		const source = getNonEmptyString(message?.metadata?.source);
		if (source) {
			return source;
		}
	}

	return null;
}

function buildPlanningQuestionCardSessionId(planRequestId) {
	const rawRequestId = getNonEmptyString(planRequestId);
	if (!rawRequestId) {
		return createClarificationSessionId();
	}

	const normalizedRequestId = rawRequestId
		.replace(/[^A-Za-z0-9_-]+/g, "-")
		.replace(/-+/g, "-")
		.replace(/^-|-$/g, "");
	if (!normalizedRequestId) {
		return createClarificationSessionId();
	}

	return `agent-team-${normalizedRequestId}`;
}

function buildSmartClarificationSessionId({ planRequestId, surface }) {
	const normalizedSurface = typeof surface === "string" ? surface.trim().toLowerCase() : "";
	const safeSurface = normalizedSurface ? normalizedSurface : "smart";

	const rawRequestId = getNonEmptyString(planRequestId);
	if (rawRequestId) {
		const normalizedRequestId = rawRequestId
			.replace(/[^A-Za-z0-9_-]+/g, "-")
			.replace(/-+/g, "-")
			.replace(/^-|-$/g, "");
		if (normalizedRequestId) {
			return `smart-${safeSurface}-${normalizedRequestId}`;
		}
	}

	return `smart-${safeSurface}-${createClarificationSessionId()}`;
}

const planConfigManager = planFs.createConfigManagerCompat();

const planRunManager = createRunManager({
	baseDir: path.join(__dirname, "data"),
	buildSystemPrompt: null, // Not used in RovoDev-only mode
	configManager: planConfigManager,
	logger: console,
	isRovoDevAvailable,
	isAIGatewayFallbackEnabled: () => false,
});

const planThreadManager = createThreadManager({
	baseDir: path.join(__dirname, "data"),
	logger: console,
});

const makerConfigManager = makerFs.createConfigManagerCompat();

const makerRunManager = createMakerRunManager({
	baseDir: path.join(__dirname, "data", "maker"),
	buildSystemPrompt: null, // Not used in RovoDev-only mode
	configManager: makerConfigManager,
	logger: console,
	isRovoDevAvailable,
	isAIGatewayFallbackEnabled: () => false,
});

const makerThreadManager = createMakerThreadManager({
	baseDir: path.join(__dirname, "data", "maker"),
	logger: console,
});

const orchestratorLog = createOrchestratorLog({
	baseDir: path.join(__dirname, "data"),
	logger: console,
});

function createSuggestedQuestionsPrompt(message, conversationHistory, assistantResponse) {
	const conversationContext =
		Array.isArray(conversationHistory) && conversationHistory.length > 0
			? conversationHistory
					.map((conversationMessage) =>
						`${conversationMessage.type === "user" ? "User" : "Assistant"}: ${conversationMessage.content}`
					)
					.join("\\n")
			: "No previous conversation.";

	return `You are a helpful assistant. Based on this conversation, generate exactly 3 concise follow-up questions that the user might want to ask next.

Previous conversation:
${conversationContext}

User's last message: ${message}

Assistant's response: ${assistantResponse}

Generate 3 short follow-up questions (20-40 characters each). Return ONLY a JSON array of strings, nothing else.
Format: ["Question 1?", "Question 2?", "Question 3?"]`;
}

function parseSuggestedQuestions(rawText) {
	const normalizeQuestions = (value) => {
		if (!Array.isArray(value)) {
			return [];
		}

		return value.filter(
			(question) => typeof question === "string" && question.trim().length > 0
		);
	};

	try {
		return normalizeQuestions(JSON.parse(rawText));
	} catch {
		const jsonArrayMatch = rawText.match(/\[[\s\S]*\]/);
		if (!jsonArrayMatch) {
			return [];
		}

		try {
			return normalizeQuestions(JSON.parse(jsonArrayMatch[0]));
		} catch (error) {
			console.error("[SUGGESTIONS] Failed to parse questions:", error);
			return [];
		}
	}
}

// RovoDev-only mode - no local clarification/approval logic

function getNonEmptyString(value) {
	if (typeof value !== "string") {
		return null;
	}

	const trimmedValue = value.trim();
	return trimmedValue.length > 0 ? trimmedValue : null;
}

const IMAGE_PROXY_TIMEOUT_MS = 15_000;
const FIGMA_MCP_ASSET_PATH_PREFIX = "/api/mcp/asset/";
const IMAGE_PROXY_ALLOWED_HOSTS = new Set(["figma.com", "www.figma.com"]);

function parseImageProxyTarget(value) {
	const normalizedValue = getNonEmptyString(value);
	if (!normalizedValue) {
		return {
			error: "Missing required query parameter: src",
		};
	}

	let parsedUrl;
	try {
		parsedUrl = new URL(normalizedValue);
	} catch {
		return {
			error: "Invalid src URL",
		};
	}

	const protocol = parsedUrl.protocol.toLowerCase();
	if (protocol !== "https:" && protocol !== "http:") {
		return {
			error: "Only http(s) image URLs are supported",
		};
	}

	const hostname = parsedUrl.hostname.toLowerCase();
	if (!IMAGE_PROXY_ALLOWED_HOSTS.has(hostname)) {
		return {
			error: "Image host is not allowed",
		};
	}

	if (!parsedUrl.pathname.startsWith(FIGMA_MCP_ASSET_PATH_PREFIX)) {
		return {
			error: "Only Figma MCP asset URLs are supported",
		};
	}

	return { targetUrl: parsedUrl };
}

function isRequiredGoogleTranslateToolCall({ toolName, toolInput } = {}) {
	const normalizedToolName = getNonEmptyString(toolName)?.toLowerCase();
	if (normalizedToolName === GOOGLE_TRANSLATE_REQUIRED_TOOL_NAME) {
		return true;
	}

	const nestedToolName = getNonEmptyString(toolInput?.tool_name)?.toLowerCase();
	return nestedToolName === GOOGLE_TRANSLATE_REQUIRED_TOOL_NAME;
}

function hasRequiredGoogleTranslateProjectArg(toolInput) {
	if (!toolInput || typeof toolInput !== "object") {
		return false;
	}

	const projectCandidates = [
		toolInput.project,
		toolInput?.tool_input?.project,
		toolInput?.input?.project,
		toolInput?.arguments?.project,
		toolInput?.payload?.project,
	];
	return projectCandidates.some((candidate) => Boolean(getNonEmptyString(candidate)));
}

function getPositiveInteger(value) {
	if (typeof value === "number" && Number.isInteger(value) && value > 0) {
		return value;
	}

	if (typeof value === "string") {
		const parsedValue = Number.parseInt(value, 10);
		if (Number.isInteger(parsedValue) && parsedValue > 0) {
			return parsedValue;
		}
	}

	return null;
}

function normalizeClientTimeZone(value) {
	const timeZone = getNonEmptyString(value);
	if (!timeZone || timeZone.length > 100) {
		return null;
	}

	try {
		new Intl.DateTimeFormat("en-US", { timeZone }).format(new Date());
		return timeZone;
	} catch {
		return null;
	}
}

function buildGoogleCalendarDateContext(clientTimeZone) {
	const nowUtcIso = new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
	const lines = [
		"[Google Calendar Date Context]",
		`Current UTC timestamp: ${nowUtcIso}`,
		clientTimeZone
			? `User timezone: ${clientTimeZone}`
			: "User timezone: unavailable (use best-effort locale inference).",
		"Interpret relative date phrases in the user's timezone when available, then convert `timeMin` and `timeMax` to strict UTC ISO 8601 (`YYYY-MM-DDTHH:mm:ssZ`).",
		"[End Google Calendar Date Context]",
	];

	return lines.join("\n");
}

const TOOL_OBSERVATION_RAW_MAX_DEPTH = 5;
const TOOL_OBSERVATION_RAW_MAX_ARRAY_ITEMS = 40;
const TOOL_OBSERVATION_RAW_MAX_OBJECT_KEYS = 60;
const TOOL_OBSERVATION_RAW_MAX_STRING_CHARS = 4000;

function truncateObservationString(value) {
	if (typeof value !== "string") {
		return value;
	}

	if (value.length <= TOOL_OBSERVATION_RAW_MAX_STRING_CHARS) {
		return value;
	}

	return `${value.slice(0, TOOL_OBSERVATION_RAW_MAX_STRING_CHARS - 1)}…`;
}

function isPlainObject(value) {
	return Object.prototype.toString.call(value) === "[object Object]";
}

function toBoundedToolObservationRawOutput(value, depth = 0, seen = new WeakSet()) {
	if (value === null || value === undefined) {
		return value;
	}

	if (typeof value === "string") {
		return truncateObservationString(value);
	}

	if (typeof value === "number" || typeof value === "boolean") {
		return value;
	}

	if (typeof value !== "object") {
		return truncateObservationString(String(value));
	}

	if (seen.has(value)) {
		return "[Circular]";
	}

	if (depth >= TOOL_OBSERVATION_RAW_MAX_DEPTH) {
		if (Array.isArray(value)) {
			return `[Array(${value.length})]`;
		}
		return "[Object]";
	}

	seen.add(value);
	try {
		if (Array.isArray(value)) {
			const boundedArray = value
				.slice(0, TOOL_OBSERVATION_RAW_MAX_ARRAY_ITEMS)
				.map((entry) =>
					toBoundedToolObservationRawOutput(entry, depth + 1, seen)
				);
			if (value.length > TOOL_OBSERVATION_RAW_MAX_ARRAY_ITEMS) {
				boundedArray.push(
					`[+${value.length - TOOL_OBSERVATION_RAW_MAX_ARRAY_ITEMS} more items]`
				);
			}
			return boundedArray;
		}

		if (isPlainObject(value)) {
			const entries = Object.entries(value);
			const boundedObject = {};
			for (const [key, nestedValue] of entries.slice(0, TOOL_OBSERVATION_RAW_MAX_OBJECT_KEYS)) {
				boundedObject[key] = toBoundedToolObservationRawOutput(
					nestedValue,
					depth + 1,
					seen
				);
			}
			if (entries.length > TOOL_OBSERVATION_RAW_MAX_OBJECT_KEYS) {
				boundedObject.__truncated__ = `+${entries.length - TOOL_OBSERVATION_RAW_MAX_OBJECT_KEYS} more keys`;
			}
			return boundedObject;
		}

		return truncateObservationString(String(value));
	} finally {
		seen.delete(value);
	}
}

function safeJsonParse(rawValue) {
	if (typeof rawValue !== "string") {
		return null;
	}

	try {
		return JSON.parse(rawValue);
	} catch {
		return null;
	}
}

function extractClassifierJsonCandidate(rawText) {
	const text = getNonEmptyString(rawText);
	if (!text) {
		return null;
	}

	const fencedMatch = text.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
	if (fencedMatch && fencedMatch[1]) {
		return fencedMatch[1].trim();
	}

	if (text.startsWith("{") && text.endsWith("}")) {
		return text;
	}

	return null;
}

function parseClassifierIntentPayload(rawText) {
	const jsonCandidate = extractClassifierJsonCandidate(rawText);
	if (!jsonCandidate) {
		return null;
	}

	const parsed = safeJsonParse(jsonCandidate);
	if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
		return null;
	}

	const keys = Object.keys(parsed);
	if (!keys.includes("intent")) {
		return null;
	}
	if (!keys.every((key) => CLASSIFIER_JSON_ALLOWED_KEYS.has(key))) {
		return null;
	}

	const intent = getNonEmptyString(parsed.intent)?.toLowerCase();
	if (!intent || !["normal", "genui", "audio", "image", "both"].includes(intent)) {
		return null;
	}

	if (Object.prototype.hasOwnProperty.call(parsed, "confidence")) {
		if (typeof parsed.confidence !== "number" || !Number.isFinite(parsed.confidence)) {
			return null;
		}
		if (parsed.confidence < 0 || parsed.confidence > 1) {
			return null;
		}
	}

	if (Object.prototype.hasOwnProperty.call(parsed, "reason")) {
		if (getNonEmptyString(parsed.reason) === null) {
			return null;
		}
	}

	return {
		intent,
		confidence:
			typeof parsed.confidence === "number" && Number.isFinite(parsed.confidence)
				? parsed.confidence
				: null,
		reason: getNonEmptyString(parsed.reason),
	};
}

function isClassifierIntentLeakCandidate(value) {
	if (typeof value !== "string") {
		return false;
	}

	const trimmed = value.trimStart();
	return trimmed.startsWith("{") || trimmed.startsWith("```");
}

function createHttpError(status, message) {
	const error = new Error(message);
	error.status = status;
	return error;
}

function truncateText(value, maxChars) {
	if (typeof value !== "string" || value.length <= maxChars) {
		return value;
	}

	return `${value.slice(0, maxChars - 1)}…`;
}

function escapeHtml(value) {
	return String(value)
		.replaceAll("&", "&amp;")
		.replaceAll("<", "&lt;")
		.replaceAll(">", "&gt;")
		.replaceAll('"', "&quot;")
		.replaceAll("'", "&#39;");
}

function normalizeConfluenceBaseUrl(value) {
	const trimmed = getNonEmptyString(value);
	if (!trimmed) {
		return null;
	}

	const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
	try {
		const normalizedUrl = new URL(withProtocol);
		return normalizedUrl.toString().replace(/\/+$/, "");
	} catch {
		return null;
	}
}

function getRunShareTitle(run) {
	if (!run || typeof run !== "object") {
		return "Agents team run summary";
	}

	const plan = run.plan && typeof run.plan === "object" ? run.plan : null;
	return getNonEmptyString(plan?.title) || "Agents team run summary";
}

function resolveSummaryTimestamp(run, summary) {
	return (
		getNonEmptyString(summary?.createdAt) ||
		getNonEmptyString(run?.updatedAt) ||
		getNonEmptyString(run?.createdAt) ||
		new Date().toISOString()
	);
}

function buildConfluenceStorageBody(run, summary, summaryContent) {
	const runTitle = escapeHtml(getRunShareTitle(run));
	const runId = escapeHtml(getNonEmptyString(run?.runId) || "unknown");
	const createdAt = escapeHtml(resolveSummaryTimestamp(run, summary));
	const content = escapeHtml(summaryContent);

	return [
		`<h1>${runTitle}</h1>`,
		`<p><strong>Run ID:</strong> <code>${runId}</code></p>`,
		`<p><strong>Generated:</strong> ${createdAt}</p>`,
		"<hr />",
		`<pre>${content}</pre>`,
	].join("");
}

function buildSlackSummaryText(run, summary, summaryContent) {
	const runTitle = getRunShareTitle(run);
	const runId = getNonEmptyString(run?.runId) || "unknown";
	const createdAt = resolveSummaryTimestamp(run, summary);
	const trimmedSummary = truncateText(summaryContent, MAX_SLACK_SUMMARY_CHARS);

	return [
		`*${runTitle}*`,
		`Run ID: \`${runId}\``,
		`Generated: ${createdAt}`,
		"",
		trimmedSummary,
	].join("\n");
}

function parseExternalErrorMessage(payload, rawText) {
	if (payload && typeof payload === "object") {
		const errorPayload = payload;
		if (typeof errorPayload.error === "string" && errorPayload.error.trim()) {
			return errorPayload.error.trim();
		}
		if (typeof errorPayload.message === "string" && errorPayload.message.trim()) {
			return errorPayload.message.trim();
		}
		if (
			errorPayload.data &&
			typeof errorPayload.data === "object" &&
			typeof errorPayload.data.message === "string" &&
			errorPayload.data.message.trim()
		) {
			return errorPayload.data.message.trim();
		}
	}

	const trimmedText = getNonEmptyString(rawText);
	if (trimmedText) {
		return truncateText(trimmedText, 240);
	}

	return null;
}

function resolveConfluencePageUrl(baseUrl, payload) {
	if (!payload || typeof payload !== "object") {
		return null;
	}

	const links = payload._links && typeof payload._links === "object" ? payload._links : null;
	const webUiPath =
		getNonEmptyString(links?.webui) ||
		getNonEmptyString(links?.tinyui) ||
		getNonEmptyString(payload.webui);
	if (webUiPath) {
		try {
			const linksBase = getNonEmptyString(links?.base) || baseUrl;
			return new URL(webUiPath, linksBase).toString();
		} catch {
			// Ignore invalid URL payloads and use fallback below.
		}
	}

	const pageId = getNonEmptyString(payload.id);
	if (!pageId) {
		return null;
	}

	return `${baseUrl}/pages/viewpage.action?pageId=${encodeURIComponent(pageId)}`;
}

async function createConfluenceSummaryPage({
	run,
	summary,
	summaryContent,
	confluence,
}) {
	const baseUrl =
		normalizeConfluenceBaseUrl(confluence?.baseUrl) ||
		normalizeConfluenceBaseUrl(process.env.CONFLUENCE_BASE_URL) ||
		DEFAULT_CONFLUENCE_BASE_URL;
	const spaceKey =
		getNonEmptyString(confluence?.spaceKey) ||
		getNonEmptyString(process.env.CONFLUENCE_DEFAULT_SPACE_KEY);
	const title =
		getNonEmptyString(confluence?.title) || `${getRunShareTitle(run)} summary`;
	const parentPageId =
		getNonEmptyString(confluence?.parentPageId) ||
		getNonEmptyString(process.env.CONFLUENCE_PARENT_PAGE_ID);
	const email = getNonEmptyString(process.env.CONFLUENCE_USER_EMAIL);
	const apiToken = getNonEmptyString(process.env.CONFLUENCE_API_TOKEN);

	if (!email || !apiToken) {
		throw createHttpError(
			500,
			"Confluence sharing is not configured. Set CONFLUENCE_USER_EMAIL and CONFLUENCE_API_TOKEN."
		);
	}
	if (!spaceKey) {
		throw createHttpError(
			400,
			"Confluence space key is required. Provide it in the request or set CONFLUENCE_DEFAULT_SPACE_KEY."
		);
	}

	const payload = {
		type: "page",
		title,
		space: { key: spaceKey },
		body: {
			storage: {
				value: buildConfluenceStorageBody(run, summary, summaryContent),
				representation: "storage",
			},
		},
	};
	if (parentPageId) {
		payload.ancestors = [{ id: parentPageId }];
	}

	const response = await fetch(`${baseUrl}/rest/api/content`, {
		method: "POST",
		headers: {
			Authorization: `Basic ${Buffer.from(`${email}:${apiToken}`).toString("base64")}`,
			"Content-Type": "application/json",
			Accept: "application/json",
		},
		body: JSON.stringify(payload),
	});

	const rawText = await response.text();
	const responsePayload = safeJsonParse(rawText);
	if (!response.ok) {
		const details =
			parseExternalErrorMessage(responsePayload, rawText) || `status ${response.status}`;
		throw createHttpError(
			502,
			`Failed to create Confluence page: ${details}`
		);
	}

	return {
		externalUrl: resolveConfluencePageUrl(baseUrl, responsePayload),
	};
}

async function callSlackApi(endpoint, token, body) {
	const response = await fetch(`https://slack.com/api/${endpoint}`, {
		method: "POST",
		headers: {
			Authorization: `Bearer ${token}`,
			"Content-Type": "application/json; charset=utf-8",
		},
		body: JSON.stringify(body),
	});

	const rawText = await response.text();
	const responsePayload = safeJsonParse(rawText);
	if (!response.ok) {
		const details =
			parseExternalErrorMessage(responsePayload, rawText) || `status ${response.status}`;
		throw createHttpError(502, `Slack API request failed: ${details}`);
	}

	if (!responsePayload || responsePayload.ok !== true) {
		const details =
			parseExternalErrorMessage(responsePayload, rawText) || "Unknown Slack API error.";
		throw createHttpError(502, `Slack API request failed: ${details}`);
	}

	return responsePayload;
}

async function sendSlackSummaryDm({ run, summary, summaryContent }) {
	const slackToken = getNonEmptyString(process.env.SLACK_BOT_TOKEN);
	const slackUserId = getNonEmptyString(process.env.SLACK_DM_USER_ID);

	if (!slackToken || !slackUserId) {
		throw createHttpError(
			500,
			"Slack sharing is not configured. Set SLACK_BOT_TOKEN and SLACK_DM_USER_ID."
		);
	}

	const openPayload = await callSlackApi("conversations.open", slackToken, {
		users: slackUserId,
	});
	const channelId = getNonEmptyString(openPayload.channel?.id);
	if (!channelId) {
		throw createHttpError(502, "Slack API did not return a direct-message channel.");
	}

	const messagePayload = await callSlackApi("chat.postMessage", slackToken, {
		channel: channelId,
		text: buildSlackSummaryText(run, summary, summaryContent),
		unfurl_links: false,
		unfurl_media: false,
	});

	return {
		messageTs: getNonEmptyString(messagePayload.ts) || undefined,
	};
}

function createClarificationSessionId() {
	return `clarification-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function isRequestUserInputTool(toolName) {
	const normalizedToolName = getNonEmptyString(toolName)?.toLowerCase();
	if (!normalizedToolName) {
		return false;
	}

	return (
		normalizedToolName === "request_user_input" ||
		normalizedToolName === "ask_user_questions" ||
		normalizedToolName === "ask_user_question" ||
		normalizedToolName.endsWith(".request_user_input") ||
		normalizedToolName.endsWith(".ask_user_questions") ||
		normalizedToolName.endsWith(".ask_user_question")
	);
}

function normalizeClarificationAnswerValue(value) {
	if (typeof value === "string") {
		const normalizedValue = value.trim();
		return normalizedValue.length > 0 ? normalizedValue : null;
	}

	if (!Array.isArray(value)) {
		return null;
	}

	const normalizedValues = value
		.map((item) => (typeof item === "string" ? item.trim() : ""))
		.filter((item) => item.length > 0);
	return normalizedValues.length > 0 ? normalizedValues : null;
}

function normalizeClarificationAnswers(value) {
	if (!value || typeof value !== "object") {
		return {};
	}

	return Object.entries(value).reduce((result, [questionId, answerValue]) => {
		const normalizedQuestionId = getNonEmptyString(questionId);
		const normalizedAnswerValue = normalizeClarificationAnswerValue(answerValue);
		if (!normalizedQuestionId || !normalizedAnswerValue) {
			return result;
		}

		result[normalizedQuestionId] = normalizedAnswerValue;
		return result;
	}, {});
}

function normalizeClarificationSubmission(value) {
	if (!value || typeof value !== "object") {
		return null;
	}

	const sessionId = getNonEmptyString(value.sessionId);
	const round = getPositiveInteger(value.round);
	if (!sessionId || !round) {
		return null;
	}

	return {
		sessionId,
		round,
		completed: Boolean(value.completed),
		answers: normalizeClarificationAnswers(value.answers),
	};
}

const {
	adaptClarificationAnswers: _adaptClarificationAnswersCore,
} = require("./lib/ask-user-questions-adapter");

// Module-level store for request-user-input question metadata.
// Populated during streaming, consumed during answer serialization.
/** @type {Map<string, Array<{id: string, label: string}>>} */
const _requestUserInputQuestionMetaStore = new Map();

/**
 * Adapts clarification answers for the ask_user_questions tool contract.
 * Wraps the core adapter with the module-level metadata store lookup.
 */
function adaptClarificationAnswersForToolContract(sessionId, answers) {
	const questionMeta = _requestUserInputQuestionMetaStore.get(sessionId) || null;
	return _adaptClarificationAnswersCore(sessionId, answers, questionMeta);
}

function normalizePlanTasks(value) {
	if (!Array.isArray(value)) {
		return [];
	}

	return value
		.map((task) => {
			if (typeof task === "string") {
				const label = getNonEmptyString(task);
				return label ? { id: "", label, agent: undefined, blockedBy: [] } : null;
			}

			if (task && typeof task === "object") {
				const label = getNonEmptyString(task.label);
				if (!label) return null;

				return {
					id: getNonEmptyString(task.id) || "",
					label,
					agent: getNonEmptyString(task.agent) || undefined,
					blockedBy: Array.isArray(task.blockedBy)
						? task.blockedBy
								.map((item) => getNonEmptyString(item))
								.filter(Boolean)
						: [],
				};
			}

			return null;
		})
		.filter(Boolean)
		.slice(0, 20);
}

function hasCompleteMermaidDiagram(value) {
	if (typeof value !== "string" || value.length === 0) {
		return false;
	}

	return /```mermaid\b[\s\S]*?```/.test(value);
}

function hasMermaidDependencyEdges(value) {
	if (typeof value !== "string" || value.length === 0) {
		return false;
	}

	const mermaidBlocks = value.match(/```mermaid\b[\s\S]*?```/gi);
	if (!mermaidBlocks || mermaidBlocks.length === 0) {
		return false;
	}

	const edgePattern =
		/\b[A-Za-z0-9_-]+\s*(?:-->|==>|-.->)\s*(?:\|[^|\n]+\|\s*)?[A-Za-z0-9_-]+\b/;
	return mermaidBlocks.some((block) => edgePattern.test(block));
}

function hasValidMermaidDiagram(value) {
	return hasCompleteMermaidDiagram(value) && hasMermaidDependencyEdges(value);
}

function hasUnclosedMermaidFence(value) {
	if (typeof value !== "string" || value.length === 0) {
		return false;
	}

	const markerIndex = value.lastIndexOf("```mermaid");
	if (markerIndex === -1) {
		return false;
	}

	const closingFenceIndex = value.indexOf("```", markerIndex + "```mermaid".length);
	return closingFenceIndex === -1;
}

function parsePlanWidgetPayload(value) {
	if (!value || typeof value !== "object") {
		return null;
	}

	const record =
		value.payload && typeof value.payload === "object"
			? value.payload
			: value;
	const tasks = normalizePlanTasks(
		Array.isArray(record.tasks)
			? record.tasks
			: Array.isArray(record.steps)
				? record.steps
				: null
	);

	if (tasks.length === 0) {
		return null;
	}

	return {
		title:
			getNonEmptyString(record.title) ||
			getNonEmptyString(record.name) ||
			"Plan",
		tasks,
	};
}

function sanitizeMermaidNodeId(value) {
	const normalizedValue = (value || "").toLowerCase().replace(/[^a-z0-9_]/g, "_");
	if (!normalizedValue) {
		return "task";
	}

	return /^[a-z_]/.test(normalizedValue) ? normalizedValue : `task_${normalizedValue}`;
}

function createUniqueMermaidNodeId(baseId, usedNodeIds) {
	if (!usedNodeIds.has(baseId)) {
		usedNodeIds.add(baseId);
		return baseId;
	}

	let duplicateIndex = 2;
	let candidateId = `${baseId}_${duplicateIndex}`;
	while (usedNodeIds.has(candidateId)) {
		duplicateIndex += 1;
		candidateId = `${baseId}_${duplicateIndex}`;
	}

	usedNodeIds.add(candidateId);
	return candidateId;
}

function escapeMermaidLabel(label) {
	return label.replace(/#/g, "#35;").replace(/"/g, "#quot;");
}

function generateMermaidFromPlan(planPayload) {
	const parsedPlan = parsePlanWidgetPayload(planPayload);
	if (!parsedPlan) {
		return "";
	}

	const usedNodeIds = new Set();
	const taskIdToNodeId = new Map();
	const nodeEntries = parsedPlan.tasks.map((task, index) => {
		const taskId = getNonEmptyString(task.id) || `${index + 1}`;
		const fallbackNodeId = `task_${index + 1}`;
		const sanitizedNodeId = sanitizeMermaidNodeId(taskId) || fallbackNodeId;
		const nodeId = createUniqueMermaidNodeId(sanitizedNodeId, usedNodeIds);
		if (!taskIdToNodeId.has(taskId)) {
			taskIdToNodeId.set(taskId, nodeId);
		}

		return {
			nodeId,
			taskId,
			label: task.label,
			blockedBy: task.blockedBy,
		};
	});

	const edgeLines = [];
	const seenEdges = new Set();
	for (const node of nodeEntries) {
		for (const dependencyId of node.blockedBy) {
			const fromNodeId = taskIdToNodeId.get(dependencyId);
			if (!fromNodeId) {
				continue;
			}

			const edgeKey = `${fromNodeId}->${node.nodeId}`;
			if (seenEdges.has(edgeKey)) {
				continue;
			}

			seenEdges.add(edgeKey);
			edgeLines.push(`  ${fromNodeId} --> ${node.nodeId}`);
		}
	}

	// Ensure the diagram still represents dependencies when blockedBy metadata is absent.
	if (edgeLines.length === 0 && nodeEntries.length > 1) {
		for (let index = 1; index < nodeEntries.length; index += 1) {
			const fromNodeId = nodeEntries[index - 1].nodeId;
			const toNodeId = nodeEntries[index].nodeId;
			const edgeKey = `${fromNodeId}->${toNodeId}`;
			if (seenEdges.has(edgeKey)) {
				continue;
			}

			seenEdges.add(edgeKey);
			edgeLines.push(`  ${fromNodeId} --> ${toNodeId}`);
		}
	}

	const lines = [
		"```mermaid",
		"graph TD",
		...nodeEntries.map((node) => `  ${node.nodeId}["${escapeMermaidLabel(node.label)}"]`),
		...edgeLines,
		"```",
	];

	return lines.join("\n");
}

function normalizeApprovalDecision(value) {
	const normalizedDecision = getNonEmptyString(value);
	if (!normalizedDecision || !APPROVAL_DECISIONS.has(normalizedDecision)) {
		return null;
	}

	return normalizedDecision;
}

function normalizeApprovalSubmission(value) {
	if (!value || typeof value !== "object") {
		return null;
	}

	const decision =
		normalizeApprovalDecision(value.decision) ||
		normalizeApprovalDecision(value.choice) ||
		normalizeApprovalDecision(value.selection);
	if (!decision) {
		return null;
	}

	return {
		decision,
		customInstruction:
			getNonEmptyString(value.customInstruction) ||
			getNonEmptyString(value.note) ||
			undefined,
		planTitle:
			getNonEmptyString(value.planTitle) ||
			getNonEmptyString(value.title) ||
			undefined,
		planTasks: normalizePlanTasks(value.planTasks || value.tasks),
	};
}

function getApprovalDecisionLabel(decision) {
	if (decision === "auto-accept") {
		return "Yes, let's start cooking";
	}

	if (decision === "continue-planning") {
		return "No, keep planning";
	}

	return "Custom instruction";
}

function buildApprovalSummary(approvalSubmission) {
	if (!approvalSubmission) {
		return "";
	}

	const lines = [
		`Decision: ${getApprovalDecisionLabel(approvalSubmission.decision)}`,
	];

	if (approvalSubmission.planTitle) {
		lines.push(`Plan title: ${approvalSubmission.planTitle}`);
	}

	if (approvalSubmission.customInstruction) {
		lines.push(`Additional instruction: ${approvalSubmission.customInstruction}`);
	}

	if (approvalSubmission.planTasks.length > 0) {
		lines.push("Plan tasks:");
		for (const task of approvalSubmission.planTasks) {
			const agentSuffix = task.agent ? ` [Agent: ${task.agent}]` : "";
			const blockedSuffix = task.blockedBy.length > 0 ? ` (blockedBy: ${task.blockedBy.join(", ")})` : "";
			lines.push(`  - id="${task.id}" ${task.label}${agentSuffix}${blockedSuffix}`);
		}
	}

	lines.push(
		"This approval applies to the existing generated plan. Continue from it.",
		"Do not ask clarification questions again unless the user explicitly requests a new plan.",
		"Begin executing the plan now by emitting AGENT_EXECUTION: markers as described in the Widget Protocol."
	);

	return lines.join("\n");
}

function getLatestAssistantWidgetPayload(messages) {
	if (!Array.isArray(messages)) {
		return null;
	}

	for (let messageIndex = messages.length - 1; messageIndex >= 0; messageIndex--) {
		const message = messages[messageIndex];
		if (!message || message.role !== "assistant" || !Array.isArray(message.parts)) {
			continue;
		}

		for (let partIndex = message.parts.length - 1; partIndex >= 0; partIndex--) {
			const part = message.parts[partIndex];
			if (part?.type !== "data-widget-data" || !part.data) {
				continue;
			}

			const widgetType = getNonEmptyString(part.data.type);
			if (!widgetType) {
				continue;
			}

			return {
				type: widgetType,
				payload: part.data.payload,
			};
		}
	}

	return null;
}

function getActiveQuestionCardPayload(messages) {
	const latestWidgetPayload = getLatestAssistantWidgetPayload(messages);
	if (!latestWidgetPayload || latestWidgetPayload.type !== CLARIFICATION_WIDGET_TYPE) {
		return null;
	}

	return sanitizeQuestionCardPayload(latestWidgetPayload.payload, {
		widgetType: CLARIFICATION_WIDGET_TYPE,
		maxRounds: CLARIFICATION_MAX_ROUNDS,
		maxPresetOptions: CLARIFICATION_MAX_PRESET_OPTIONS,
		customOptionPlaceholder: CLARIFICATION_CUSTOM_OPTION_PLACEHOLDER,
		maxLabelLength: CLARIFICATION_MAX_LABEL_LENGTH,
	});
}

function hasAnswerForQuestion(question, answers) {
	const answerValue = answers[question.id];
	if (question.kind === "multi-select") {
		return Array.isArray(answerValue) && answerValue.length > 0;
	}

	return typeof answerValue === "string" && answerValue.trim().length > 0;
}

function hasRequiredClarificationAnswers(questionCard, answers) {
	return questionCard.questions.every((question) => {
		if (!question.required) {
			return true;
		}

		return hasAnswerForQuestion(question, answers);
	});
}

function sanitizeAnswersForQuestionCard(questionCard, answers) {
	return questionCard.questions.reduce((result, question) => {
		const normalizedAnswerValue = normalizeClarificationAnswerValue(
			answers[question.id]
		);
		if (!normalizedAnswerValue) {
			return result;
		}

		result[question.id] = normalizedAnswerValue;
		return result;
	}, {});
}

function formatClarificationAnswerValue(value) {
	return Array.isArray(value) ? value.join(", ") : value;
}

function resolveAnswerOptionLabel(question, answer) {
	if (!question || typeof answer !== "string") {
		return answer;
	}

	const matchingOption = question.options.find((option) => option.id === answer);
	return matchingOption?.label || answer;
}

function formatClarificationAnswer(question, value) {
	if (Array.isArray(value)) {
		return value
			.map((answer) => resolveAnswerOptionLabel(question, answer))
			.join(", ");
	}

	return resolveAnswerOptionLabel(question, value);
}

function buildClarificationSummary(questionCard, answers) {
	if (!questionCard) {
		const answerLines = Object.entries(answers)
			.map(([questionId, answerValue]) => `- ${questionId}: ${formatClarificationAnswerValue(answerValue)}`);
		return answerLines.join("\n");
	}

	return questionCard.questions
		.map((question) => {
			const answerValue = answers[question.id];
			if (!answerValue) {
				return null;
			}

			return `- ${question.label}: ${formatClarificationAnswer(question, answerValue)}`;
		})
			.filter(Boolean)
			.join("\n");
}

// Keep utility helpers available for rapid feature toggles without tripping lint.
function markLintKeepalive() {}
markLintKeepalive(
	streamTextViaAIGateway,
	buildApprovalSummary,
	hasRequiredClarificationAnswers,
	sanitizeAnswersForQuestionCard,
	buildClarificationSummary
);

function parseJsonFromText(rawText) {
	try {
		return JSON.parse(rawText);
	} catch {
		const objectMatch = rawText.match(/\{[\s\S]*\}/);
		if (!objectMatch) {
			return null;
		}

		try {
			return JSON.parse(objectMatch[0]);
		} catch {
			return null;
		}
	}
}

function extractQuestionCardPayloadFromAssistantText(rawText, defaults = {}) {
	const extractedPayload = extractQuestionCardDefinitionFromAssistantText(
		rawText,
		defaults
	);
	if (!extractedPayload) {
		return null;
	}

	return sanitizeQuestionCardPayload(extractedPayload, {
		...defaults,
		widgetType: CLARIFICATION_WIDGET_TYPE,
		maxRounds: CLARIFICATION_MAX_ROUNDS,
		maxPresetOptions: CLARIFICATION_MAX_PRESET_OPTIONS,
		customOptionPlaceholder: CLARIFICATION_CUSTOM_OPTION_PLACEHOLDER,
		maxLabelLength: CLARIFICATION_MAX_LABEL_LENGTH,
		createSessionId: createClarificationSessionId,
	});
}

function createClarificationQuestionPrompt({
	latestUserMessage,
	conversationHistory,
	previousQuestionCard,
	submission,
	round,
	maxRounds,
	intentHint,
}) {
	const conversationContext =
		Array.isArray(conversationHistory) && conversationHistory.length > 0
			? conversationHistory
					.map((message) => `${message.type === "user" ? "User" : "Assistant"}: ${message.content}`)
					.join("\n")
			: "No prior context.";
	const previousQuestions = previousQuestionCard
		? JSON.stringify(previousQuestionCard.questions)
		: "[]";
	const previousAnswers = submission
		? JSON.stringify(submission.answers)
		: "{}";

	const intentGuidance = intentHint === "visualization"
		? `
Visualization-specific guidance:
- Ask about chart type (bar, line, pie, area, radar, etc.)
- Ask about the data source or metrics to visualize (revenue, users, conversions, etc.)
- Ask about the grouping dimension (by region, by month, by product, etc.)
- Ask about the time range or period (last 30 days, 2024, Q1-Q4, etc.)
`
		: "";

	return `You generate structured clarification question cards for planning and problem-solving requests.
Return ONLY valid JSON and no markdown.

Target schema:
{
  "type": "question-card",
  "title": "string",
  "description": "string",
  "questions": [
    {
      "id": "string",
      "label": "string",
      "description": "string",
      "required": true,
      "kind": "single-select | multi-select",
      "placeholder": "string",
      "options": [
        { "id": "string", "label": "string", "description": "string", "recommended": true }
      ]
    }
  ]
}

Rules:
- Generate 2-4 questions total.
- Keep questions short and decision-focused.
- At least 2 questions must be required.
- Every question must be either "single-select" or "multi-select".
- Use "multi-select" only when picking multiple answers is genuinely useful; otherwise prefer "single-select".
- Every question must include 1-3 options.
- Each option MUST be a specific, concrete answer to its question — not a generic category or meta-label.
- Do not include a custom free-text option in the JSON options.
- The UI automatically appends a "Tell Rovo what to do..." free-text field after the generated options.
- Do not generate a plan or task list.
- This is round ${round} of ${maxRounds}.
- If previous answers are partial, ask only missing/high-impact follow-ups.

Option quality:
- BAD options (generic meta-labels): "Quick recommendation", "Balanced approach", "Detailed plan", "Basic", "Advanced"
- GOOD options (specific answers): For "Which site?" → "Marketing site", "Developer docs", "Customer portal". For "What framework?" → "React", "Vue", "Angular".
- Each option must directly answer the question it belongs to.
${intentGuidance}
Conversation context:
${conversationContext}

Latest user request:
${latestUserMessage}

Previous question set:
${previousQuestions}

Submitted answers:
${previousAnswers}`;
}

async function generateClarificationQuestionCard({
	latestUserMessage,
	conversationHistory,
	previousQuestionCard,
	submission,
	round,
	maxRounds,
	sessionId,
	intentHint,
	gatewayOptions,
}) {
	const promptText = createClarificationQuestionPrompt({
		latestUserMessage,
		conversationHistory,
		previousQuestionCard,
		submission,
		round,
		maxRounds,
		intentHint,
	});

	try {
		const text = await generateTextViaGateway({
			system: "You output strict JSON for clarification question cards.",
			prompt: promptText,
			maxOutputTokens: 700,
			temperature: 0.3,
			...gatewayOptions,
		});

		const parsedJson = parseJsonFromText(text);
		const sanitizedPayload = sanitizeQuestionCardPayload(parsedJson, {
			sessionId,
			round,
			maxRounds,
			widgetType: CLARIFICATION_WIDGET_TYPE,
			maxPresetOptions: CLARIFICATION_MAX_PRESET_OPTIONS,
			customOptionPlaceholder: CLARIFICATION_CUSTOM_OPTION_PLACEHOLDER,
			maxLabelLength: CLARIFICATION_MAX_LABEL_LENGTH,
			createSessionId: createClarificationSessionId,
		});
		if (sanitizedPayload) {
			return sanitizedPayload;
		}
	} catch (error) {
		console.error("[CLARIFICATION] Gateway error:", error.message || error);
	}

	return null;
}

function streamQuestionCardWidget({ res, payload, introText }) {
	const stream = createUIMessageStream({
		execute: async ({ writer }) => {
			const widgetId = `widget-${Date.now()}`;

			if (introText) {
				const textId = `text-${Date.now()}`;
				writer.write({ type: "text-start", id: textId });
				writer.write({ type: "text-delta", id: textId, delta: introText });
				writer.write({ type: "text-end", id: textId });
			}

			writer.write({
				type: "data-widget-loading",
				id: widgetId,
				data: {
					type: CLARIFICATION_WIDGET_TYPE,
					loading: true,
				},
			});

			writer.write({
				type: "data-widget-data",
				id: widgetId,
				data: {
					type: CLARIFICATION_WIDGET_TYPE,
					payload,
				},
			});

			writer.write({
				type: "data-widget-loading",
				id: widgetId,
				data: {
					type: CLARIFICATION_WIDGET_TYPE,
					loading: false,
				},
			});

			writer.write({
				type: "data-turn-complete",
				data: { timestamp: new Date().toISOString() },
			});
		},
		onError: (error) =>
			error instanceof Error
				? error.message
				: "Failed to stream clarification question card",
	});

	pipeUIMessageStreamToResponse({
		response: res,
		stream,
	});
}

async function generateSuggestedQuestions({
	message,
	conversationHistory,
	assistantResponse,
	port,
	portIndex,
}) {
	if (!assistantResponse || !assistantResponse.trim()) {
		return [];
	}

	const promptText = createSuggestedQuestionsPrompt(
		message,
		conversationHistory,
		assistantResponse
	);

	const backendPreference = resolveSuggestionsBackendPreference();
	const useRovoDevFirst =
		backendPreference === "rovodev" ||
		(backendPreference === "dynamic" &&
			shouldPreferRovoDevForDynamicSuggestions());
	const backendsToTry = useRovoDevFirst
		? ["rovodev", "ai-gateway"]
		: ["ai-gateway", "rovodev"];
	let lastError = null;

	for (const backend of backendsToTry) {
		if (backend === "ai-gateway") {
			if (!hasGatewayUrlConfigured()) {
				console.info("[SUGGESTIONS] Skipping AI Gateway (not configured)");
				continue;
			}

			try {
				const text = await aiGatewayProvider.generateText({
					system: "You are a helpful assistant that generates follow-up questions.",
					prompt: promptText,
					maxOutputTokens: 200,
					temperature: 0.7,
				});
				console.info("[SUGGESTIONS] Generated via AI Gateway");
				return parseSuggestedQuestions(text);
			} catch (error) {
				lastError = normalizeAIGatewayError(error);
				console.warn(
					"[SUGGESTIONS] AI Gateway attempt failed, falling back",
					lastError?.message || lastError
				);
				continue;
			}
		}

		try {
			// When a portIndex is provided, use the panel's own pinned port
			// (it will be available after the stream releases and cooldown).
			// Otherwise use the background pool with excludePinnedPorts.
			const portOpts =
				typeof portIndex === "number" && portIndex >= 0
					? { portIndex }
					: typeof port === "number" && port > 0
						? { port }
						: { excludePinnedPorts: true };
			const text = await generateTextViaRovoDev({
				system: "You are a helpful assistant that generates follow-up questions.",
				prompt: promptText,
				conflictPolicy: "wait-for-turn",
				timeoutMs: WAIT_FOR_TURN_TIMEOUT_MS,
				...portOpts,
			});
			console.info(
				typeof portIndex === "number"
					? `[SUGGESTIONS] Generated via RovoDev on pinned port index ${portIndex}`
					: typeof port === "number" && port > 0
						? `[SUGGESTIONS] Generated via RovoDev on port ${port}`
						: "[SUGGESTIONS] Generated via RovoDev background pool"
			);
			return parseSuggestedQuestions(text);
		} catch (error) {
			lastError = error;
			console.warn(
				"[SUGGESTIONS] RovoDev attempt failed",
				error instanceof Error ? error.message : error
			);
		}
	}

	console.error("SUGGESTIONS generation failed on all backends:", lastError?.message || lastError);
	return [];
}

app.post("/api/chat-title", async (req, res) => {
	try {
		const { message } = req.body || {};

		if (!message || typeof message !== "string" || !message.trim()) {
			return res.status(400).json({ error: "A message is required" });
		}

		const titlePrompt = `Generate a very short title (3-6 words) that summarizes this user message. Return ONLY the title text, nothing else. No quotes, no punctuation at the end, no explanation.

User message: ${message.trim()}`;

		const text = await generateTextViaGateway({
			system: "You generate concise chat titles. Respond with only the title, 3-6 words.",
			prompt: titlePrompt,
			maxOutputTokens: 30,
			temperature: 0.7,
		});

		let title = text.trim().replace(/^["']|["']$/g, "").replace(/\.+$/, "").trim();

		if (!title) {
			return res.status(500).json({ error: "Empty title generated" });
		}

		return res.json({ title });
	} catch (error) {
		console.error("Chat title API error:", error);
		return sendGatewayErrorResponse(res, error, "Failed to generate chat title");
	}
});

app.post("/api/chat-sdk", async (req, res) => {
	try {
		const {
			messages,
			contextDescription: rawContextDescription,
			clientTimeZone: rawClientTimeZone,
			provider,
			model: rawModel,
			clarification: rawClarification,
			approval: rawApproval,
			planMode: rawPlanMode,
			planModeSource: rawPlanModeSource,
			planRequestId,
			creationMode,
			smartGeneration: rawSmartGeneration,
			hasQueuedPrompts: rawHasQueuedPrompts,
			portIndex: rawPortIndex,
		} = req.body || {};
		const clientTimeZone = normalizeClientTimeZone(rawClientTimeZone);
		const portIndex = typeof rawPortIndex === "number" && Number.isInteger(rawPortIndex) && rawPortIndex >= 0
			? rawPortIndex
			: undefined;
		let strictPortAssignment = null;
		if (typeof portIndex === "number") {
			try {
				await isRovoDevAvailable();
				const poolStatus = _rovoDevPool?.getStatus?.();
				const poolPorts = Array.isArray(poolStatus?.ports)
					? poolStatus.ports
							.map((entry) => entry?.port)
							.filter((port) => typeof port === "number" && Number.isInteger(port) && port > 0)
					: readRovoDevPorts();
				strictPortAssignment = resolveStrictRovoDevPortAssignment(portIndex, {
					activePorts: poolPorts,
					poolStatus,
				});
			} catch (portAssignmentError) {
				return res.status(400).json({
					error: portAssignmentError.message,
					code:
						typeof portAssignmentError?.code === "string"
							? portAssignmentError.code
							: "INVALID_ROVODEV_PORT_INDEX",
				});
			}
		}
		const hasQueuedPrompts = Boolean(rawHasQueuedPrompts);

		// Track the request timestamp for this portIndex so post-stream tasks
		// (suggestions) can detect when a newer request has superseded this one.
		const requestTimestamp = Date.now();
		if (typeof portIndex === "number") {
			portIndexRequestTimestamps.set(portIndex, requestTimestamp);
		}

		const resolvedPlanMode = resolvePlanMode({
			planMode: rawPlanMode,
			planModeSource: rawPlanModeSource,
		});
		const planMode = resolvedPlanMode.enabled;
		if (resolvedPlanMode.rejected) {
			console.info(
				"[PLAN-MODE] Rejected plan mode request without trusted source",
				{
					source: resolvedPlanMode.source,
				}
			);
		}

		// If creationMode is set, load the skill content and prepend to contextDescription
		let contextDescription = rawContextDescription;
		if (creationMode === "skill" || creationMode === "agent") {
			const skillName = creationMode === "skill" ? "skill-development" : "agent-development";
			const skill = planFs.getSkillByName(skillName);
			if (skill && skill.content) {
				const prefix = `[${creationMode.toUpperCase()} CREATION MODE]\nYou are in ${creationMode} creation mode. Help the user create a new ${creationMode} definition file.\nThis is a local ${creationMode} definition — not a Confluence page, Jira ticket, or any Atlassian product content.\nAll the ${creationMode} creation instructions you need are provided below.\nOnce ready, call POST /api/plan/${creationMode}s to persist it.\n[END ${creationMode.toUpperCase()} CREATION MODE]\n\n---\n\n${skill.content}`;
				contextDescription = contextDescription ? `${prefix}\n\n${contextDescription}` : prefix;
			} else {
				console.error(`[CHAT-SDK] Skill "${skillName}" not found in skill system`);
			}
		}

		const latestVisibleUserMessage = getLatestVisibleUserMessage(messages);
		const latestUserMessageSource = getLatestUserMessageSource(messages);
		const isPostClarificationTurn =
			latestUserMessageSource === "clarification-submit";
		const clarificationSubmission = normalizeClarificationSubmission(rawClarification);
		const approvalSubmission = normalizeApprovalSubmission(rawApproval);
		const {
			message: latestUserMessage,
			conversationHistory,
		} = mapUiMessagesToConversation(messages);

		if (!latestUserMessage) {
			return res.status(400).json({ error: "A user message is required" });
		}

		const latestVisiblePromptText =
			getNonEmptyString(latestVisibleUserMessage?.text) || latestUserMessage;
		const translationRequestState = clarificationSubmission
			? resolveTranslationRequestFromClarification({
				clarificationSubmission,
				latestVisibleUserMessage: latestVisiblePromptText,
			})
			: resolveTranslationRequestState(latestVisiblePromptText);
		const isTranslationClarificationTurn =
			clarificationSubmission &&
			isTranslationClarificationSession(clarificationSubmission.sessionId);
		const isTranslationSkipTurn =
			latestUserMessageSource === "clarification-submit" &&
			!clarificationSubmission;

		if (
			translationRequestState.isTranslationRequest ||
			isTranslationClarificationTurn
		) {
			if (translationRequestState.needsClarification && !isTranslationSkipTurn) {
				const translationQuestionCardPayload = sanitizeQuestionCardPayload(
					buildTranslationClarificationPayload({
						sourceText: translationRequestState.sourceText,
						targetLanguage: translationRequestState.targetLanguage,
						sessionId: clarificationSubmission?.sessionId,
						round: clarificationSubmission?.round || 1,
					}),
					{
						widgetType: CLARIFICATION_WIDGET_TYPE,
						maxRounds: CLARIFICATION_MAX_ROUNDS,
						maxPresetOptions: CLARIFICATION_MAX_PRESET_OPTIONS,
						customOptionPlaceholder: CLARIFICATION_CUSTOM_OPTION_PLACEHOLDER,
						maxLabelLength: CLARIFICATION_MAX_LABEL_LENGTH,
						createSessionId: createTranslationClarificationSessionId,
					}
				);

					if (translationQuestionCardPayload) {
						streamQuestionCardWidget({
							res,
							payload: translationQuestionCardPayload,
							introText:
								"I need three details before translating: the text, target language, and GCP project ID.",
						});
						return;
					}
				}

			if (
				!translationRequestState.sourceText ||
				!translationRequestState.targetLanguage
			) {
				const stream = createUIMessageStream({
					execute: async ({ writer }) => {
						const textId = `translation-unresolved-${Date.now()}`;
						writer.write({ type: "text-start", id: textId });
						writer.write({
							type: "text-delta",
							id: textId,
							delta:
								"I still need the exact text, target language, and GCP project ID before I can translate.",
						});
						writer.write({ type: "text-end", id: textId });
						writer.write({
							type: "data-turn-complete",
							data: { timestamp: new Date().toISOString() },
						});
					},
					onError: (error) =>
						error instanceof Error
							? error.message
							: "Failed to resolve translation clarification",
				});
				pipeUIMessageStreamToResponse({ response: res, stream });
				return;
			}

			const translationProject = getNonEmptyString(translationRequestState.project);
			if (!translationProject) {
				const stream = createUIMessageStream({
					execute: async ({ writer }) => {
						const textId = `translation-project-missing-${Date.now()}`;
						writer.write({ type: "text-start", id: textId });
						writer.write({
							type: "text-delta",
							id: textId,
							delta:
								"Translation requires a valid GCP project ID before I can run the Google Translate tool.",
						});
						writer.write({ type: "text-end", id: textId });
						writer.write({
							type: "data-route-decision",
							data: {
								reason: "intent_translation_missing_project",
								experience: "text",
								timestamp: new Date().toISOString(),
								toolsDetected: false,
							},
						});
						writer.write({
							type: "data-turn-complete",
							data: { timestamp: new Date().toISOString() },
						});
					},
					onError: (error) =>
						error instanceof Error
							? error.message
							: "Missing translation project configuration",
				});
				pipeUIMessageStreamToResponse({ response: res, stream });
				return;
			}

			const stream = createUIMessageStream({
				execute: async ({ writer }) => {
					const writeAssistantText = (text) => {
						const normalizedText = getNonEmptyString(text);
						if (!normalizedText) {
							return;
						}

						const textId = `translation-text-${Date.now()}`;
						writer.write({ type: "text-start", id: textId });
						writer.write({
							type: "text-delta",
							id: textId,
							delta: normalizedText,
						});
						writer.write({ type: "text-end", id: textId });
					};

					const runTranslationAttempt = async () => {
						const executionPrompt = createTranslationToolExecutionPrompt({
							sourceText: translationRequestState.sourceText,
							targetLanguage: translationRequestState.targetLanguage,
							project: translationProject,
						});
						if (!executionPrompt) {
							throw new Error("Missing translation input details.");
						}

						let assistantText = "";
						let sawRequiredToolCall = false;
						let sawRequiredToolProjectArg = false;
						let sawRequiredToolResult = false;
						let requiredToolResultRaw = null;
						let requiredToolResultPreview = null;
						let requiredToolErrorText = null;

						await streamViaRovoDev({
							message: executionPrompt,
							onTextDelta: (delta) => {
								if (typeof delta === "string" && delta.length > 0) {
									assistantText += delta;
								}
							},
							onToolCallStart: (toolCall) => {
								if (isRequiredGoogleTranslateToolCall(toolCall)) {
									sawRequiredToolCall = true;
									if (hasRequiredGoogleTranslateProjectArg(toolCall?.toolInput)) {
										sawRequiredToolProjectArg = true;
									}
								}
							},
							onToolCallInputResolved: (toolCall) => {
								if (!isRequiredGoogleTranslateToolCall(toolCall)) {
									return;
								}

								sawRequiredToolCall = true;
								if (hasRequiredGoogleTranslateProjectArg(toolCall?.toolInput)) {
									sawRequiredToolProjectArg = true;
								}
							},
							onToolCallResult: (toolCallResult) => {
								if (!isRequiredGoogleTranslateToolCall(toolCallResult)) {
									return;
								}

								sawRequiredToolCall = true;
								sawRequiredToolResult = true;
								requiredToolResultRaw =
									toolCallResult?.toolOutputRaw ?? null;
								requiredToolResultPreview =
									getNonEmptyString(toolCallResult?.toolOutputPreview) ||
									null;
							},
							onThinkingEvent: (thinkingEvent) => {
								if (!thinkingEvent || typeof thinkingEvent !== "object") {
									return;
								}

								const phase = getNonEmptyString(thinkingEvent.phase)?.toLowerCase();
								if (phase !== "error") {
									return;
								}

								if (
									!isRequiredGoogleTranslateToolCall({
										toolName: thinkingEvent.toolName,
									})
								) {
									return;
								}

								requiredToolErrorText =
									getNonEmptyString(thinkingEvent.errorText) ||
									getNonEmptyString(thinkingEvent.outputPreview) ||
									getNonEmptyString(thinkingEvent.output) ||
									requiredToolErrorText;
							},
							conflictPolicy: "wait-for-turn",
							timeoutMs: WAIT_FOR_TURN_TIMEOUT_MS,
							port: strictPortAssignment?.rovoPort,
							portIndex,
						});

						return {
							assistantText: getNonEmptyString(assistantText) || "",
							sawRequiredToolCall,
							sawRequiredToolProjectArg,
							sawRequiredToolResult,
							requiredToolResultRaw,
							requiredToolResultPreview,
							requiredToolErrorText,
						};
					};

					writer.write({
						type: "data-thinking-status",
						data: {
							label: "Translating text",
							activity: "results",
							source: "backend",
						},
					});

					const translationAttempt = await runTranslationAttempt();

					let translationPayload = parseTranslationModelOutput(
						translationAttempt.assistantText,
						{
							sourceText: translationRequestState.sourceText,
							targetLanguage: translationRequestState.targetLanguage,
						}
					);
					if (
						!translationPayload &&
						translationAttempt.requiredToolResultRaw !== null &&
						translationAttempt.requiredToolResultRaw !== undefined
					) {
						translationPayload = parseTranslationToolResult(
							translationAttempt.requiredToolResultRaw,
							{
								sourceText: translationRequestState.sourceText,
								targetLanguage: translationRequestState.targetLanguage,
							}
						);
					}
					if (
						!translationPayload &&
						translationAttempt.requiredToolResultPreview
					) {
						translationPayload = parseTranslationToolResult(
							translationAttempt.requiredToolResultPreview,
							{
								sourceText: translationRequestState.sourceText,
								targetLanguage: translationRequestState.targetLanguage,
							}
						);
					}

						if (!translationPayload) {
							let failureText =
								"I couldn't complete the translation using the Google Translate tool.";
							const toolErrorPreview = toPreview(
								translationAttempt.requiredToolErrorText || ""
							).text;
							if (!translationAttempt.sawRequiredToolCall) {
								failureText =
									"I couldn't verify a Google Translate tool call for this request. Please try again.";
							} else if (!translationAttempt.sawRequiredToolProjectArg) {
								failureText =
									"The Google Translate tool call did not include required `project` input.";
							} else if (
								/\bproject\b/i.test(
									toolErrorPreview ||
										translationAttempt.assistantText ||
										""
								)
							) {
								failureText = `Google Translate tool reported a project-related error for \`${translationProject}\`.`;
							} else if (toolErrorPreview) {
								failureText = `Google Translate tool failed: ${toolErrorPreview}`;
							}

						writeAssistantText(failureText);
						writer.write({
							type: "data-route-decision",
							data: {
								reason: "intent_translation_tool_failed",
								experience: "text",
								timestamp: new Date().toISOString(),
								toolsDetected: translationAttempt.sawRequiredToolCall,
							},
						});
						writer.write({
							type: "data-turn-complete",
							data: { timestamp: new Date().toISOString() },
						});
						return;
					}

					const summaryText = buildTranslationTextSummary(translationPayload);
					const translationSpec = buildTranslationGenuiSpec(translationPayload);
					if (translationSpec) {
						const widgetId = `widget-translation-${Date.now()}`;
						writer.write({
							type: "data-widget-loading",
							id: widgetId,
							data: { type: SMART_WIDGET_TYPE_GENUI, loading: true },
						});
						writer.write({
							type: "data-widget-data",
							id: widgetId,
							data: {
								type: SMART_WIDGET_TYPE_GENUI,
								payload: {
									spec: translationSpec,
									summary: summaryText,
									source: "translation-tool",
								},
							},
						});
						writer.write({
							type: "data-widget-loading",
							id: widgetId,
							data: { type: SMART_WIDGET_TYPE_GENUI, loading: false },
						});
					}

					writeAssistantText(summaryText);
					writer.write({
						type: "data-route-decision",
						data: {
							reason: "intent_translation_tool_success",
							experience: translationSpec ? "generative_ui" : "text",
							timestamp: new Date().toISOString(),
							toolsDetected: true,
						},
					});
					writer.write({
						type: "data-turn-complete",
						data: { timestamp: new Date().toISOString() },
					});
				},
				onError: (error) =>
					error instanceof Error
						? error.message
						: "Failed to complete translation request",
			});

			pipeUIMessageStreamToResponse({ response: res, stream });
			return;
		}

		if (
			clarificationSubmission &&
			isAudioContextClarificationSession(clarificationSubmission.sessionId)
		) {
			const latestVisiblePromptText =
				getNonEmptyString(latestVisibleUserMessage?.text) || latestUserMessage;
			const clarifiedAudioSelection = resolveAudioContextVoiceInputFromClarification({
				clarificationSubmission,
				messages,
				latestVisibleUserMessage: latestVisiblePromptText,
				maxChars: SMART_VOICE_INPUT_MAX_CHARS,
			});

			if (!clarifiedAudioSelection.voiceInput) {
				const unresolvedAudioSelection = resolveSmartAudioVoiceInput({
					intent: "audio",
					latestUserMessage: latestVisiblePromptText,
					latestVisibleUserMessage: latestVisiblePromptText,
					messages,
					generatedNarrative: null,
					maxChars: SMART_VOICE_INPUT_MAX_CHARS,
				});
				if (
					unresolvedAudioSelection.needsClarification &&
					unresolvedAudioSelection.clarificationPayload
				) {
					streamQuestionCardWidget({
						res,
						payload: unresolvedAudioSelection.clarificationPayload,
						introText: "I still need one quick choice before generating audio.",
					});
					return;
				}

				const stream = createUIMessageStream({
					execute: async ({ writer }) => {
						const textId = `audio-clarification-unresolved-${Date.now()}`;
						writer.write({ type: "text-start", id: textId });
						writer.write({
							type: "text-delta",
							id: textId,
							delta:
								"I couldn't determine which text to read aloud. Please paste the exact script.",
						});
						writer.write({ type: "text-end", id: textId });
						writer.write({
							type: "data-turn-complete",
							data: { timestamp: new Date().toISOString() },
						});
					},
					onError: (error) =>
						error instanceof Error
							? error.message
							: "Failed to resolve audio clarification answer",
				});

				pipeUIMessageStreamToResponse({ response: res, stream });
				return;
			}

			const stream = createUIMessageStream({
				execute: async ({ writer }) => {
					const audioWidgetId = `widget-audio-clarification-${Date.now()}`;
					const textId = `text-audio-clarification-${Date.now()}`;
					writer.write({
						type: "data-thinking-status",
						data: {
							label: "Generating audio",
							activity: "audio",
							source: "backend",
						},
					});
					writer.write({
						type: "data-widget-loading",
						id: audioWidgetId,
						data: { type: SMART_WIDGET_TYPE_AUDIO, loading: true },
					});

					try {
						const synthesisResult = await synthesizeSound({
							input: clarifiedAudioSelection.voiceInput,
							provider: "google",
							model: "tts-latest",
							responseFormat: "mp3",
						});

						writer.write({
							type: "data-widget-data",
							id: audioWidgetId,
							data: {
								type: SMART_WIDGET_TYPE_AUDIO,
								payload: {
									audioUrl: buildAudioDataUrl(
										synthesisResult.audioBytes,
										synthesisResult.contentType
									),
									mimeType: synthesisResult.contentType,
									transcript: stripConversationalFiller(clarifiedAudioSelection.voiceInput),
									source: "audio-context-clarification",
									inputSource: clarifiedAudioSelection.source || undefined,
								},
							},
						});
						writer.write({ type: "text-start", id: textId });
						writer.write({
							type: "text-delta",
							id: textId,
							delta: clarifiedAudioSelection.voiceInput,
						});
						writer.write({ type: "text-end", id: textId });
					} catch (audioError) {
						console.error("[AUDIO-CONTEXT] Audio synthesis failed:", audioError);
						writer.write({
							type: "data-widget-error",
							id: audioWidgetId,
							data: {
								type: SMART_WIDGET_TYPE_AUDIO,
								message: audioError instanceof Error
									? audioError.message
									: "Audio generation failed.",
								canRetry: true,
							},
						});
						writer.write({ type: "text-start", id: textId });
						writer.write({
							type: "text-delta",
							id: textId,
							delta: "I couldn't generate audio right now.",
						});
						writer.write({ type: "text-end", id: textId });
					} finally {
						writer.write({
							type: "data-widget-loading",
							id: audioWidgetId,
							data: { type: SMART_WIDGET_TYPE_AUDIO, loading: false },
						});
					}

					writer.write({
						type: "data-route-decision",
						data: {
							reason: "intent_media_audio",
							experience: "audio",
							timestamp: new Date().toISOString(),
							toolsDetected: false,
							classifierIntent: "audio",
						},
					});

					writer.write({
						type: "data-turn-complete",
						data: { timestamp: new Date().toISOString() },
					});
				},
				onError: (error) => {
					if (error instanceof Error) {
						return error.message;
					}
					return "Failed to generate audio from clarification";
				},
			});

			pipeUIMessageStreamToResponse({ response: res, stream });
			return;
		}

		if (
			clarificationSubmission &&
			isImageContextClarificationSession(clarificationSubmission.sessionId)
		) {
			const latestVisiblePromptText =
				getNonEmptyString(latestVisibleUserMessage?.text) || latestUserMessage;
			const clarifiedImageContext = resolveImageContextFromClarification({
				clarificationSubmission,
				messages,
				latestVisibleUserMessage: latestVisiblePromptText,
				maxChars: SMART_IMAGE_PROMPT_MAX_CHARS,
			});

			if (!clarifiedImageContext.contextText) {
				const stream = createUIMessageStream({
					execute: async ({ writer }) => {
						const textId = `image-clarification-unresolved-${Date.now()}`;
						writer.write({ type: "text-start", id: textId });
						writer.write({
							type: "text-delta",
							id: textId,
							delta:
								"I couldn't determine which context to use for the image. Please describe what you'd like illustrated.",
						});
						writer.write({ type: "text-end", id: textId });
						writer.write({
							type: "data-turn-complete",
							data: { timestamp: new Date().toISOString() },
						});
					},
					onError: (error) =>
						error instanceof Error
							? error.message
							: "Failed to resolve image clarification answer",
				});

				pipeUIMessageStreamToResponse({ response: res, stream });
				return;
			}

			const { prompt: enrichedPrompt, systemInstruction: enrichedSystem } =
				buildEnrichedImagePrompt({
					userMessage: latestVisiblePromptText,
					contextText: clarifiedImageContext.contextText,
				});

			const imageGatewayConfig = resolveGoogleImageGatewayConfig({
				envVars: getEnvVars(),
				requestedModel: rawModel,
				resolveGatewayUrl,
				detectEndpointType,
			});

			if (!imageGatewayConfig.ok) {
				return res.status(imageGatewayConfig.statusCode || 500).json({
					error: imageGatewayConfig.error || "Image generation not configured",
					details: imageGatewayConfig.details,
				});
			}

			const stream = createUIMessageStream({
				execute: async ({ writer }) => {
					const imageWidgetId = `widget-image-clarification-${Date.now()}`;
					const generatedImages = [];

					writer.write({
						type: "data-thinking-status",
						data: {
							label: "Generating image",
							activity: "image",
							source: "backend",
						},
					});
					writer.write({
						type: "data-widget-loading",
						id: imageWidgetId,
						data: { type: SMART_WIDGET_TYPE_IMAGE, loading: true },
					});

					try {
						const streamGoogleImage = async (withModalities) => {
							await streamGoogleGatewayManualSse({
								gatewayUrl: imageGatewayConfig.gatewayUrl,
								envVars: imageGatewayConfig.envVars,
								model: imageGatewayConfig.model,
								system: enrichedSystem || undefined,
								prompt: enrichedPrompt || latestVisiblePromptText,
								maxOutputTokens: 1800,
								temperature: 1,
								responseModalities: withModalities ? ["image"] : undefined,
								onFile: ({ mediaType, base64 }) => {
									if (typeof base64 !== "string" || base64.length === 0) {
										return;
									}
									const resolvedMediaType =
										typeof mediaType === "string" && mediaType.trim()
											? mediaType
											: "image/png";
									if (!resolvedMediaType.startsWith("image/")) {
										return;
									}
									generatedImages.push({
										url: `data:${resolvedMediaType};base64,${base64}`,
										mimeType: resolvedMediaType,
									});
									writer.write({
										type: "data-widget-data",
										id: imageWidgetId,
										data: {
											type: SMART_WIDGET_TYPE_IMAGE,
											payload: {
												images: [...generatedImages],
												prompt: latestUserMessage,
												source: "image-context-clarification",
												inputSource: clarifiedImageContext.source || undefined,
											},
										},
									});
								},
							});
						};

						try {
							await streamGoogleImage(true);
						} catch (modalitiesError) {
							if (!isUnsupportedModalitiesError(modalitiesError)) {
								throw modalitiesError;
							}
							await streamGoogleImage(false);
						}

						if (generatedImages.length === 0) {
							writer.write({
								type: "data-widget-error",
								id: imageWidgetId,
								data: {
									type: SMART_WIDGET_TYPE_IMAGE,
									message: "I couldn't generate an image for this request.",
									canRetry: true,
								},
							});
						}
					} catch (imageError) {
						console.error("[IMAGE-CONTEXT] Image generation failed:", imageError);
						writer.write({
							type: "data-widget-error",
							id: imageWidgetId,
							data: {
								type: SMART_WIDGET_TYPE_IMAGE,
								message: imageError instanceof Error
									? imageError.message
									: "Image generation failed.",
								canRetry: true,
							},
						});
					} finally {
						writer.write({
							type: "data-widget-loading",
							id: imageWidgetId,
							data: { type: SMART_WIDGET_TYPE_IMAGE, loading: false },
						});
					}

					writer.write({
						type: "data-route-decision",
						data: {
							reason: "intent_media_image_clarification",
							experience: "image",
							timestamp: new Date().toISOString(),
							toolsDetected: false,
							classifierIntent: "image",
						},
					});

					writer.write({
						type: "data-turn-complete",
						data: { timestamp: new Date().toISOString() },
					});
				},
				onError: (error) => {
					if (error instanceof Error) {
						return error.message;
					}
					return "Failed to generate image from clarification";
				},
			});

			pipeUIMessageStreamToResponse({ response: res, stream });
			return;
		}

		const toolFirstPolicy = resolveToolFirstPolicy({
			prompt: latestUserMessage,
		});
		const toolFirstRelevanceDomains =
			Array.isArray(toolFirstPolicy.relevanceDomains) &&
			toolFirstPolicy.relevanceDomains.length > 0
				? toolFirstPolicy.relevanceDomains
				: toolFirstPolicy.domains;
		if (toolFirstPolicy.matched) {
			console.info("[TOOL-FIRST] Matched tool-first domains", {
				domains: toolFirstPolicy.domains,
				relevanceDomains: toolFirstRelevanceDomains,
				domainLabels: toolFirstPolicy.domainLabels,
			});
		}
		const inferredPromptIntent = inferSmartIntentFromPrompt(latestUserMessage);
		const mediaPreClassification = preClassifyMediaIntent(latestUserMessage);
		const { isStrictToolFirstTurn } = resolveToolFirstRoutingFlags({
			toolFirstMatched: toolFirstPolicy.matched,
			inferredPromptIntent,
			preClassifiedIntent: mediaPreClassification.intent,
		});

		if (
			shouldGatePlanningQuestionCard({
				messages,
				planMode,
				latestVisibleUserMessage,
				latestUserMessageSource,
				planningGateSkipSources: PLANNING_GATE_SKIP_SOURCES,
				detectPlanningIntent,
				parsePlanPayload: parsePlanWidgetPayload,
			})
		) {
			const questionCardPayload = await generateClarificationQuestionCard({
				latestUserMessage: latestVisibleUserMessage?.text || latestUserMessage,
				conversationHistory,
				previousQuestionCard: null,
				submission: null,
				round: 1,
				maxRounds: CLARIFICATION_MAX_ROUNDS,
				sessionId: buildPlanningQuestionCardSessionId(planRequestId),
			});

			if (questionCardPayload) {
				streamQuestionCardWidget({
					res,
					payload: questionCardPayload,
					introText: PLANNING_GATE_INTRO_TEXT,
				});
				return;
			}
		}

		let toolFirstClarificationInstruction = null;
		if (isStrictToolFirstTurn && !clarificationSubmission) {
			const { shouldGate, unsatisfiedHints } = shouldGateToolFirstQuestionCard({
				prompt: latestUserMessage,
				toolFirstPolicy,
				latestUserMessageSource,
				gateSkipSources: TOOL_FIRST_GATE_SKIP_SOURCES,
			});
			if (shouldGate) {
				const toolFirstQuestionCardPayload = buildToolFirstQuestionCardPayload({
					unsatisfiedHints,
					domainLabels: toolFirstPolicy.domainLabels,
					sessionId: createClarificationSessionId(),
					directive: getPostClarificationDirective(toolFirstPolicy.domains),
				});
				if (toolFirstQuestionCardPayload) {
					const domainLabel = Array.isArray(toolFirstPolicy.domainLabels)
						? toolFirstPolicy.domainLabels.join(", ")
						: "this task";
					streamQuestionCardWidget({
						res,
						payload: toolFirstQuestionCardPayload,
						introText: `I need a couple details before I can help with ${domainLabel}.`,
					});
					return;
				}

				toolFirstClarificationInstruction =
					buildToolFirstClarificationInstruction({
						unsatisfiedHints,
						domainLabels: toolFirstPolicy.domainLabels,
					});
			}
		}

		let enrichedContextDescription = contextDescription;
		if (clarificationSubmission) {
			const serialized = JSON.stringify(
				adaptClarificationAnswersForToolContract(
					clarificationSubmission.sessionId,
					clarificationSubmission.answers
				)
			);
			enrichedContextDescription = enrichedContextDescription
				? `${enrichedContextDescription}\n\nClarification answers: ${serialized}`
				: `Clarification answers: ${serialized}`;
		}
		if (approvalSubmission) {
			const serialized = JSON.stringify({
				decision: approvalSubmission.decision,
				customInstruction: approvalSubmission.customInstruction,
			});
			enrichedContextDescription = enrichedContextDescription
				? `${enrichedContextDescription}\n\nPlan approval: ${serialized}`
				: `Plan approval: ${serialized}`;
		}

		const googleCalendarDateContext = isStrictToolFirstTurn
			&& Array.isArray(toolFirstPolicy.domains)
			&& toolFirstPolicy.domains.includes("google-calendar")
				? buildGoogleCalendarDateContext(clientTimeZone)
				: null;
		const toolFirstPromptInstruction = isStrictToolFirstTurn
			? [
				toolFirstPolicy.instruction,
				toolFirstClarificationInstruction,
				googleCalendarDateContext,
			]
				.filter((entry) => typeof entry === "string" && entry.trim().length > 0)
				.join("\n\n")
			: null;
		const effectiveContextDescription = isStrictToolFirstTurn
			? enrichedContextDescription
				? [
					enrichedContextDescription,
					toolFirstPromptInstruction,
				]
					.filter((entry) => typeof entry === "string" && entry.trim().length > 0)
					.join("\n\n")
				: toolFirstPromptInstruction
			: enrichedContextDescription;
		const effectiveContextWithPortBinding = strictPortAssignment
			? effectiveContextDescription
				? `${effectiveContextDescription}\n\n${buildRovoDevPortBindingInstruction(strictPortAssignment)}`
				: buildRovoDevPortBindingInstruction(strictPortAssignment)
			: effectiveContextDescription;

		const userMessageText = buildUserMessage(
			latestUserMessage,
			conversationHistory,
			effectiveContextWithPortBinding
		);

		const smartGeneration = normalizeSmartGenerationOptions(rawSmartGeneration);
			const smartLayoutContext = {
				surface: smartGeneration.surface,
				containerWidthPx: smartGeneration.containerWidthPx,
				viewportWidthPx: smartGeneration.viewportWidthPx,
				widthClass: smartGeneration.widthClass,
			};
			const smartGenerationActive = isSmartGenerationEnabled(smartGeneration);
			const isTaskLikeRequest = isTaskLikeMessage(latestUserMessage);
			const prefersGenuiCardExperience =
				shouldPreferGenuiWhenPossible(latestUserMessage);
			const isCreateIntentRequestPrompt =
				isCreateIntentRequest(latestUserMessage);
			const forceSmartAudioRoute =
				!smartGenerationActive && inferredPromptIntent === "audio";
			const smartRoutingActive = smartGenerationActive || forceSmartAudioRoute;
			if (smartGeneration.enabled || smartGeneration.surface) {
				console.info("[SMART-GENERATION] Route gating", {
					enabled: smartGeneration.enabled,
					surface: smartGeneration.surface,
					active: smartGenerationActive,
					forcedAudioRoute: forceSmartAudioRoute,
					containerWidthPx: smartGeneration.containerWidthPx,
					viewportWidthPx: smartGeneration.viewportWidthPx,
					widthClass: smartGeneration.widthClass,
					allowedSurfaces: Array.from(SMART_ROUTE_TARGET_SURFACES),
				});
			}
			if (forceSmartAudioRoute) {
				console.info("[SMART-GENERATION] Forcing smart audio route for explicit audio request");
			}
				let smartIntentResult = null;
				if (smartRoutingActive && !isStrictToolFirstTurn) {
					const heuristicIntent = inferredPromptIntent;
					if (heuristicIntent !== "normal") {
						smartIntentResult = {
							intent: heuristicIntent,
							confidence: 1,
							reason: "heuristic",
							rawOutput: null,
							error: null,
							timedOut: false,
						};
					} else {
						const classificationStartMs = Date.now();
						smartIntentResult = await classifySmartGenerationIntent({
							latestUserMessage,
							conversationHistory,
							timeoutMs: SMART_INTENT_TIMEOUT_MS,
							classify: ({ system, prompt, signal }) =>
								generateTextViaGateway({
									system,
									prompt,
									maxOutputTokens: 120,
									temperature: 0,
									...buildSmartGenerationGatewayOptions({
										provider,
										excludePinnedPorts: true,
										signal,
									}),
								}),
						});
						console.info("[SMART-GENERATION] Intent classification", {
							intent: smartIntentResult.intent,
							confidence: smartIntentResult.confidence,
							reason: smartIntentResult.reason,
							latencyMs: Date.now() - classificationStartMs,
							timedOut: smartIntentResult.timedOut,
							error: smartIntentResult.error,
						});
					}
				}

				if (
					smartRoutingActive &&
					!isStrictToolFirstTurn &&
					smartIntentResult &&
					smartIntentResult.intent === "normal" &&
					prefersGenuiCardExperience
				) {
					const previousReason = getNonEmptyString(smartIntentResult.reason);
					smartIntentResult = {
						...smartIntentResult,
						intent: "genui",
						confidence:
							typeof smartIntentResult.confidence === "number"
								? smartIntentResult.confidence
								: 0.51,
						reason: previousReason
							? `${previousReason}+auto-genui`
							: "auto-genui",
					};
					console.info("[SMART-GENERATION] Auto-upgraded intent to genui", {
						reason: smartIntentResult.reason,
						confidence: smartIntentResult.confidence,
					});
				}

				if (
					smartRoutingActive &&
					!isStrictToolFirstTurn &&
					smartIntentResult &&
					(smartIntentResult.intent === "genui" || smartIntentResult.intent === "both") &&
					!isTaskLikeRequest
				) {
					smartIntentResult = {
						...smartIntentResult,
						intent: "normal",
						reason: getNonEmptyString(smartIntentResult.reason)
							? `${smartIntentResult.reason}+task-gate-text`
							: "task-gate-text",
					};
					console.info("[SMART-GENERATION] Downgraded intent to normal due to non-task request", {
						reason: smartIntentResult.reason,
					});
				}

				if (smartRoutingActive && !isStrictToolFirstTurn) {
					const vagueVisualization = isVagueVisualizationRequest(latestUserMessage);

					const smartClarificationClassifierPrompt =
						smartIntentResult && smartIntentResult.intent !== "normal"
							? buildSmartClarificationClassifierPrompt({
									latestUserMessage,
									conversationHistory,
									smartIntentHint: smartIntentResult.intent,
									layoutContext: smartLayoutContext,
								})
							: buildSmartClarificationClassifierPrompt({
									latestUserMessage,
									conversationHistory,
									smartIntentHint: "normal",
									layoutContext: smartLayoutContext,
								});

					let smartClarificationDecision = null;
					if (vagueVisualization && smartIntentResult && (smartIntentResult.intent === "genui" || smartIntentResult.intent === "both")) {
						// Heuristic fast-path: skip the LLM classifier entirely for vague
						// visualization requests to avoid port contention hangs.
						smartClarificationDecision = {
							needsClarification: true,
							confidence: 1,
							reason: "heuristic-vague-visualization",
						};
						console.info("[SMART-CLARIFICATION] Heuristic fast-path: vague visualization request");
					} else if (smartIntentResult?.timedOut) {
						console.info(
							"[SMART-CLARIFICATION] Skipping classifier after smart-intent timeout"
						);
					} else {
						try {
							const classifierText = await generateTextViaGateway({
								system: "You output strict JSON indicating if clarification is needed.",
								prompt: smartClarificationClassifierPrompt,
								maxOutputTokens: 120,
								temperature: 0,
								...buildSmartGenerationGatewayOptions({
									provider,
									excludePinnedPorts: true,
								}),
							});
							smartClarificationDecision = parseSmartClarificationClassifierOutput(
								classifierText
							);
						} catch (error) {
							console.warn(
								"[SMART-CLARIFICATION] Classifier failed; continuing without smart gate",
								error instanceof Error ? error.message : error
							);
						}
					}

					const shouldGateClarification = shouldGateSmartClarification({
						latestUserMessage,
						latestUserMessageSource,
						smartGenerationActive: smartRoutingActive,
						smartIntentResult,
						classifierResult: smartClarificationDecision,
					});

					if (shouldGateClarification) {
						const clarificationAbort = new AbortController();
						const clarificationTimeout = setTimeout(() => clarificationAbort.abort(), 15_000);
						try {
							const questionCardPayload = await generateClarificationQuestionCard({
								latestUserMessage: latestVisibleUserMessage?.text || latestUserMessage,
								conversationHistory,
								previousQuestionCard: null,
								submission: null,
								round: 1,
								maxRounds: CLARIFICATION_MAX_ROUNDS,
								sessionId: buildSmartClarificationSessionId({
									planRequestId,
									surface: smartGeneration.surface,
								}),
								intentHint: vagueVisualization ? "visualization" : undefined,
								gatewayOptions: {
									...buildSmartGenerationGatewayOptions({
										provider,
										excludePinnedPorts: true,
									}),
									signal: clarificationAbort.signal,
								},
							});

							if (questionCardPayload) {
								streamQuestionCardWidget({
									res,
									payload: questionCardPayload,
									introText:
										"A couple quick questions so I can generate the right output.",
								});
								return;
							}
						} finally {
							clearTimeout(clarificationTimeout);
						}
					}
				}

			if (
				smartRoutingActive &&
				!isStrictToolFirstTurn &&
				smartIntentResult &&
				smartIntentResult.intent !== "normal"
			) {
				console.info("[SMART-GENERATION] Executing smart route", {
					intent: smartIntentResult.intent,
					forcedAudioRoute: forceSmartAudioRoute,
					surface: smartGeneration.surface,
					portIndex: typeof portIndex === "number" ? portIndex : null,
					rovoPort:
						typeof strictPortAssignment?.rovoPort === "number"
							? strictPortAssignment.rovoPort
							: null,
				});
				const roleMessages = mapUiMessagesToRoleContent(messages);
				const smartRouteAbortController = new AbortController();
				req.on("close", () => {
					if (!smartRouteAbortController.signal.aborted) {
						console.log("[SMART-GENERATION] Client disconnected, aborting smart route");
						smartRouteAbortController.abort();
					}
				});

				const isSmartRouteAbortError = (error) => {
					if (!error || typeof error !== "object") {
						return false;
					}
					return error.name === "AbortError" || error.code === "ABORT_ERR";
				};

				const throwIfSmartRouteAborted = () => {
					if (!smartRouteAbortController.signal.aborted) {
						return;
					}

					const abortError = new Error("Smart generation request aborted");
					abortError.name = "AbortError";
					abortError.code = "ABORT_ERR";
					throw abortError;
				};

				const stream = createUIMessageStream({
					execute: async ({ writer }) => {
						const textId = `text-${Date.now()}`;
						const imageWidgetId = `widget-image-${Date.now()}`;
						const genuiWidgetId = `widget-genui-${Date.now()}`;
						const audioWidgetId = `widget-audio-${Date.now()}`;
						let textStarted = false;
						let generatedNarrative = null;
						let emittedAudioClarificationCard = false;
						let emittedImageClarificationCard = false;
						const sanitizeThinkingLabel = (value) => {
							if (typeof value !== "string") {
								return "";
							}
							return value.replace(/(?:\s*(?:\.{3}|…))+$/u, "").trim();
						};

						const emitTextDelta = (delta) => {
							if (typeof delta !== "string" || delta.length === 0) {
								return;
							}

							if (!textStarted) {
								writer.write({ type: "text-start", id: textId });
								textStarted = true;
							}

							writer.write({ type: "text-delta", id: textId, delta });
						};

						const emitWidgetLoading = (id, type, loading) => {
							writer.write({
								type: "data-widget-loading",
								id,
								data: { type, loading },
							});
						};

						const emitWidgetData = (id, type, payload) => {
							writer.write({
								type: "data-widget-data",
								id,
								data: { type, payload },
							});
						};

						const emitWidgetError = (id, type, message) => {
							writer.write({
								type: "data-widget-error",
								id,
								data: {
									type,
									message,
									canRetry: true,
								},
							});
						};

						const emitThinkingStatus = (label, content) => {
							const normalizedLabel = sanitizeThinkingLabel(label);
							if (!normalizedLabel) {
								return;
							}

							const rawContent =
								typeof content === "string" ? content.trim() : "";
							writer.write({
								type: "data-thinking-status",
								data: {
									label: normalizedLabel,
									content: rawContent.length > 0 ? rawContent : undefined,
								},
							});
						};

						throwIfSmartRouteAborted();
						emitThinkingStatus(
							"Classifying request",
							`Detected intent: ${smartIntentResult.intent}`
						);
						emitThinkingStatus("Preparing generation");

						if (smartIntentResult.intent === "image") {
							const {
								imagePrompt: smartImagePrompt,
								systemInstruction: smartImageSystem,
								source: smartImageSource,
								resolutionType: smartImageResolutionType,
								needsClarification: needsImageClarification,
								clarificationPayload: imageClarificationPayload,
								confidence: smartImageConfidence,
								candidateCount: smartImageCandidateCount,
							} = resolveSmartImagePrompt({
								latestUserMessage,
								latestVisibleUserMessage: latestVisibleUserMessage?.text || latestUserMessage,
								messages,
								maxChars: SMART_IMAGE_PROMPT_MAX_CHARS,
							});

							console.info("[SMART-GENERATION] Selected image input source", {
								intent: smartIntentResult.intent,
								source: smartImageSource || null,
								resolutionType: smartImageResolutionType || null,
								confidence:
									typeof smartImageConfidence === "number"
										? smartImageConfidence
										: null,
								candidateCount:
									typeof smartImageCandidateCount === "number"
										? smartImageCandidateCount
										: null,
								hasSystemInstruction: Boolean(smartImageSystem),
							});

							if (needsImageClarification) {
								if (imageClarificationPayload) {
									const clarificationWidgetId = `widget-image-clarification-${Date.now()}`;
									emitThinkingStatus("Need clarification");
									emitWidgetLoading(
										clarificationWidgetId,
										CLARIFICATION_WIDGET_TYPE,
										true
									);
									emitWidgetData(
										clarificationWidgetId,
										CLARIFICATION_WIDGET_TYPE,
										imageClarificationPayload
									);
									emitWidgetLoading(
										clarificationWidgetId,
										CLARIFICATION_WIDGET_TYPE,
										false
									);
									writer.write({
										type: "data-route-decision",
										data: {
											reason: "intent_clarification",
											experience: "question_card",
											timestamp: new Date().toISOString(),
											toolsDetected: false,
										},
									});
									emittedImageClarificationCard = true;
									emitTextDelta(
										"I need one quick detail before generating the image."
									);
								} else {
									emitTextDelta(
										"I need a bit more detail about what to illustrate."
									);
								}
							} else {
								emitThinkingStatus("Generating image");
							emitWidgetLoading(imageWidgetId, SMART_WIDGET_TYPE_IMAGE, true);
							const generatedImages = [];
							let attemptedImageGeneration = false;
							const imageGatewayConfig = resolveGoogleImageGatewayConfig({
								envVars: getEnvVars(),
								requestedModel: rawModel,
								resolveGatewayUrl,
								detectEndpointType,
							});
							try {
								throwIfSmartRouteAborted();
								if (!imageGatewayConfig.ok) {
									emitWidgetError(
										imageWidgetId,
										SMART_WIDGET_TYPE_IMAGE,
										toImageWidgetErrorMessage(imageGatewayConfig)
											|| "I couldn't generate an image because Google image routing is not configured."
									);
								} else {
									attemptedImageGeneration = true;
									const streamGoogleImage = async (withModalities) => {
										throwIfSmartRouteAborted();
										await streamGoogleGatewayManualSse({
											gatewayUrl: imageGatewayConfig.gatewayUrl,
											envVars: imageGatewayConfig.envVars,
											model: imageGatewayConfig.model,
											system: smartImageSystem || undefined,
											prompt: smartImagePrompt || userMessageText,
											maxOutputTokens: 1800,
											temperature: 1,
											responseModalities: withModalities ? ["image"] : undefined,
											signal: smartRouteAbortController.signal,
											onFile: ({ mediaType, base64 }) => {
												if (smartRouteAbortController.signal.aborted) {
													return;
												}
												if (typeof base64 !== "string" || base64.length === 0) {
													return;
												}
												const resolvedMediaType =
													typeof mediaType === "string" && mediaType.trim()
														? mediaType
														: "image/png";
												if (!resolvedMediaType.startsWith("image/")) {
													return;
												}

												generatedImages.push({
													url: `data:${resolvedMediaType};base64,${base64}`,
													mimeType: resolvedMediaType,
												});
												emitWidgetData(imageWidgetId, SMART_WIDGET_TYPE_IMAGE, {
													images: [...generatedImages],
													prompt: latestUserMessage,
													source: "chat-sdk-google-image",
													inputSource: smartImageSource || undefined,
												});
											},
										});
										throwIfSmartRouteAborted();
									};

									try {
										await streamGoogleImage(true);
									} catch (modalitiesError) {
										if (!isUnsupportedModalitiesError(modalitiesError)) {
											throw modalitiesError;
										}
										console.warn(
											"[SMART-GENERATION] Google endpoint rejected modalities payload; retrying image request without modalities."
										);
										await streamGoogleImage(false);
									}
								}

								if (
									attemptedImageGeneration &&
									generatedImages.length === 0 &&
									!smartRouteAbortController.signal.aborted
								) {
									emitWidgetError(
										imageWidgetId,
										SMART_WIDGET_TYPE_IMAGE,
										"I couldn't generate an image for this request. The model returned no image data."
									);
								}
							} catch (imageError) {
								if (isSmartRouteAbortError(imageError)) {
									return;
								}
								console.error("[SMART-GENERATION] Image generation failed:", imageError);
								const errorMessage =
									imageError instanceof Error &&
									typeof imageError.message === "string" &&
									imageError.message.trim().length > 0
										? imageError.message.trim()
										: "I couldn't generate an image right now. Check AI_GATEWAY_URL_GOOGLE and GOOGLE_IMAGE_MODEL, then retry.";
								emitWidgetError(
									imageWidgetId,
									SMART_WIDGET_TYPE_IMAGE,
									errorMessage
								);
							} finally {
								if (!smartRouteAbortController.signal.aborted) {
									emitWidgetLoading(imageWidgetId, SMART_WIDGET_TYPE_IMAGE, false);
								}
							}
							}
						}

						if (
							smartIntentResult.intent === "genui" ||
							smartIntentResult.intent === "both"
						) {
							emitThinkingStatus("Generating results");
							emitWidgetLoading(genuiWidgetId, SMART_WIDGET_TYPE_GENUI, true);
							try {
								throwIfSmartRouteAborted();
								const genuiResult = await generateSmartGenuiResult({
									roleMessages,
									provider,
									layoutContext: smartLayoutContext,
									signal: smartRouteAbortController.signal,
								});
								throwIfSmartRouteAborted();
								const summaryText = getNonEmptyString(genuiResult.narrative);
								if (summaryText) {
									generatedNarrative = summaryText;
								}

								const fallbackSpec = summaryText
									? buildFallbackGenuiSpecFromText({
											text: summaryText,
											prompt: latestUserMessage,
										})
									: null;
								const resolvedSpec = genuiResult.spec || fallbackSpec;

								if (resolvedSpec) {
									const hasGeneratedSpec = Boolean(genuiResult.spec);
									emitWidgetData(genuiWidgetId, SMART_WIDGET_TYPE_GENUI, {
										spec: resolvedSpec,
										summary:
											summaryText && summaryText.length > 280
												? `${summaryText.slice(0, 279)}...`
												: summaryText || "Generated interactive preview",
										source: hasGeneratedSpec
											? "genui-chat"
											: "genui-chat-fallback",
									});
								} else {
									emitTextDelta(GENUI_FALLBACK_ERROR_TEXT);
								}
							} catch (genuiError) {
								if (isSmartRouteAbortError(genuiError)) {
									return;
								}
								console.error("[SMART-GENERATION] UI generation failed:", genuiError);
								emitTextDelta(GENUI_FALLBACK_ERROR_TEXT);
							} finally {
								if (!smartRouteAbortController.signal.aborted) {
									emitWidgetLoading(genuiWidgetId, SMART_WIDGET_TYPE_GENUI, false);
								}
							}
						}

						if (
							smartIntentResult.intent === "audio" ||
							smartIntentResult.intent === "both"
						) {
							try {
								throwIfSmartRouteAborted();
								const {
									voiceInput,
									source: voiceInputSource,
									extractionMode: voiceInputExtractionMode,
									resolutionType: voiceInputResolutionType,
									needsClarification: needsAudioClarification,
									clarificationPayload: audioClarificationPayload,
									confidence: voiceInputConfidence,
									candidateCount: voiceInputCandidateCount,
								} =
									resolveSmartAudioVoiceInput({
										intent: smartIntentResult.intent,
										latestUserMessage,
										latestVisibleUserMessage: latestVisibleUserMessage?.text || latestUserMessage,
										messages,
										generatedNarrative,
										maxChars: SMART_VOICE_INPUT_MAX_CHARS,
									});
								console.info("[SMART-GENERATION] Selected audio input source", {
									intent: smartIntentResult.intent,
									source: voiceInputSource,
									extractionMode: voiceInputExtractionMode || null,
									resolutionType: voiceInputResolutionType || null,
									confidence:
										typeof voiceInputConfidence === "number"
											? voiceInputConfidence
											: null,
									candidateCount:
										typeof voiceInputCandidateCount === "number"
											? voiceInputCandidateCount
											: null,
									forcedAudioRoute: forceSmartAudioRoute,
									hasInput: Boolean(voiceInput),
									payloadLength: typeof voiceInput === "string" ? voiceInput.length : 0,
								});

								if (needsAudioClarification) {
									if (audioClarificationPayload) {
										const clarificationWidgetId = `widget-audio-clarification-${Date.now()}`;
										emitThinkingStatus("Need clarification");
										emitWidgetLoading(
											clarificationWidgetId,
											CLARIFICATION_WIDGET_TYPE,
											true
										);
										emitWidgetData(
											clarificationWidgetId,
											CLARIFICATION_WIDGET_TYPE,
											audioClarificationPayload
										);
										emitWidgetLoading(
											clarificationWidgetId,
											CLARIFICATION_WIDGET_TYPE,
											false
										);
										emittedAudioClarificationCard = true;
										writer.write({
											type: "data-route-decision",
											data: {
												reason: "intent_clarification",
												experience: "question_card",
												timestamp: new Date().toISOString(),
												toolsDetected: false,
											},
										});
										if (smartIntentResult.intent === "audio") {
											emitTextDelta(
												"I need one quick detail before generating the audio clip."
											);
										}
									} else {
										emitTextDelta(
											"I need a bit more detail about which text to read aloud."
										);
									}
								} else {
									emitThinkingStatus("Generating audio");
									emitWidgetLoading(audioWidgetId, SMART_WIDGET_TYPE_AUDIO, true);
									if (!voiceInput) {
										throw new Error("No text available for audio synthesis");
									}

									const synthesisResult = await synthesizeSound({
										input: voiceInput,
										provider: "google",
										model: "tts-latest",
										responseFormat: "mp3",
										signal: smartRouteAbortController.signal,
									});
									throwIfSmartRouteAborted();

									emitWidgetData(audioWidgetId, SMART_WIDGET_TYPE_AUDIO, {
										audioUrl: buildAudioDataUrl(
											synthesisResult.audioBytes,
											synthesisResult.contentType
										),
										mimeType: synthesisResult.contentType,
										transcript: stripConversationalFiller(voiceInput),
										source: "sound-generation",
										inputSource: voiceInputSource || undefined,
									});

									if (smartIntentResult.intent === "audio") {
										emitTextDelta(voiceInput);
									}
								}
							} catch (audioError) {
								if (isSmartRouteAbortError(audioError)) {
									return;
								}
								console.error("[SMART-GENERATION] Audio generation failed:", audioError);
								emitWidgetError(
									audioWidgetId,
									SMART_WIDGET_TYPE_AUDIO,
									"I couldn't generate voice output right now."
								);
								emitTextDelta("I couldn't generate voice output right now.");
							} finally {
								if (
									!smartRouteAbortController.signal.aborted &&
									!emittedAudioClarificationCard
								) {
									emitWidgetLoading(audioWidgetId, SMART_WIDGET_TYPE_AUDIO, false);
								}
							}
						}

						throwIfSmartRouteAborted();
						emitThinkingStatus("Finalizing response");
						const shouldEmitDefaultNarrative =
							smartIntentResult.intent !== "image" &&
							smartIntentResult.intent !== "genui" &&
							smartIntentResult.intent !== "both" &&
							!emittedAudioClarificationCard &&
							!emittedImageClarificationCard;
						if (shouldEmitDefaultNarrative && !textStarted) {
							emitTextDelta("Completed smart generation request.");
						}

						if (textStarted) {
							writer.write({ type: "text-end", id: textId });
						}

						writer.write({
							type: "data-turn-complete",
							data: { timestamp: new Date().toISOString() },
						});
					},
					onError: (error) => {
						if (isSmartRouteAbortError(error)) {
							return "Smart generation request aborted";
						}
						if (error instanceof Error) {
							return error.message;
						}
						return "Failed to stream smart generation response";
					},
				});

				pipeUIMessageStreamToResponse({
					response: res,
					stream,
				});
				return;
			}

		// ── Output Routing: Media bypass pre-classification (BE-002, BE-003) ──
		// Use lightweight regex pre-classification to detect obvious media
		// generation intents BEFORE sending to RovoDev. This avoids the
		// RovoDev round-trip for clear-cut image/audio requests.
		if (
			mediaPreClassification.intent &&
			!isStrictToolFirstTurn
		) {
			console.info("[OUTPUT-ROUTING] Media bypass detected", {
				intent: mediaPreClassification.intent,
				confidence: mediaPreClassification.confidence,
				reason: mediaPreClassification.reason,
			});

			if (mediaPreClassification.intent === "image") {
				// BE-002: Route image queries to AI Gateway (bypass RovoDev)
				const {
					imagePrompt: mediaBypassImagePrompt,
					systemInstruction: mediaBypassImageSystem,
					source: mediaBypassImageSource,
					resolutionType: mediaBypassImageResolutionType,
					needsClarification: mediaBypassNeedsImageClarification,
					clarificationPayload: mediaBypassImageClarificationPayload,
					confidence: mediaBypassImageConfidence,
					candidateCount: mediaBypassImageCandidateCount,
				} = resolveSmartImagePrompt({
					latestUserMessage,
					latestVisibleUserMessage: latestVisibleUserMessage?.text || latestUserMessage,
					messages,
					maxChars: SMART_IMAGE_PROMPT_MAX_CHARS,
				});

				if (
					mediaBypassNeedsImageClarification &&
					mediaBypassImageClarificationPayload
				) {
					streamQuestionCardWidget({
						res,
						payload: mediaBypassImageClarificationPayload,
						introText: "I need one quick choice before generating the image.",
					});
					return;
				}

				const imageGatewayConfig = resolveGoogleImageGatewayConfig({
					envVars: getEnvVars(),
					requestedModel: rawModel,
					resolveGatewayUrl,
					detectEndpointType,
				});

				if (!imageGatewayConfig.ok) {
					return res.status(imageGatewayConfig.statusCode || 500).json({
						error: imageGatewayConfig.error || "Image generation not configured",
						details: imageGatewayConfig.details,
					});
				}

				console.info("[OUTPUT-ROUTING] Selected media bypass image input", {
					source: mediaBypassImageSource || null,
					resolutionType: mediaBypassImageResolutionType || null,
					confidence:
						typeof mediaBypassImageConfidence === "number"
							? mediaBypassImageConfidence
							: null,
					candidateCount:
						typeof mediaBypassImageCandidateCount === "number"
							? mediaBypassImageCandidateCount
							: null,
					hasSystemInstruction: Boolean(mediaBypassImageSystem),
				});

				const stream = createUIMessageStream({
					execute: async ({ writer }) => {
						const imageWidgetId = `widget-image-bypass-${Date.now()}`;
						const generatedImages = [];

						writer.write({
							type: "data-thinking-status",
							data: {
								label: "Generating image",
								activity: "image",
								source: "backend",
							},
						});
						writer.write({
							type: "data-widget-loading",
							id: imageWidgetId,
							data: { type: SMART_WIDGET_TYPE_IMAGE, loading: true },
						});

						try {
							const streamGoogleImage = async (withModalities) => {
								await streamGoogleGatewayManualSse({
									gatewayUrl: imageGatewayConfig.gatewayUrl,
									envVars: imageGatewayConfig.envVars,
									model: imageGatewayConfig.model,
									system: mediaBypassImageSystem || undefined,
									prompt: mediaBypassImagePrompt || userMessageText,
									maxOutputTokens: 1800,
									temperature: 1,
									responseModalities: withModalities ? ["image"] : undefined,
									onFile: ({ mediaType, base64 }) => {
										if (typeof base64 !== "string" || base64.length === 0) {
											return;
										}
										const resolvedMediaType =
											typeof mediaType === "string" && mediaType.trim()
												? mediaType
												: "image/png";
										if (!resolvedMediaType.startsWith("image/")) {
											return;
										}
										generatedImages.push({
											url: `data:${resolvedMediaType};base64,${base64}`,
											mimeType: resolvedMediaType,
										});
										writer.write({
											type: "data-widget-data",
											id: imageWidgetId,
											data: {
												type: SMART_WIDGET_TYPE_IMAGE,
												payload: {
													images: [...generatedImages],
													prompt: latestUserMessage,
													source: "media-bypass-image",
													inputSource: mediaBypassImageSource || undefined,
												},
											},
										});
									},
								});
							};

							try {
								await streamGoogleImage(true);
							} catch (modalitiesError) {
								if (!isUnsupportedModalitiesError(modalitiesError)) {
									throw modalitiesError;
								}
								await streamGoogleImage(false);
							}

							if (generatedImages.length === 0) {
								writer.write({
									type: "data-widget-error",
									id: imageWidgetId,
									data: {
										type: SMART_WIDGET_TYPE_IMAGE,
										message: "I couldn't generate an image for this request.",
										canRetry: true,
									},
								});
							}
						} catch (imageError) {
							console.error("[OUTPUT-ROUTING] Media bypass image generation failed:", imageError);
							writer.write({
								type: "data-widget-error",
								id: imageWidgetId,
								data: {
									type: SMART_WIDGET_TYPE_IMAGE,
									message: imageError instanceof Error
										? imageError.message
										: "Image generation failed.",
									canRetry: true,
								},
							});
						} finally {
							writer.write({
								type: "data-widget-loading",
								id: imageWidgetId,
								data: { type: SMART_WIDGET_TYPE_IMAGE, loading: false },
							});
						}

						// Emit route-decision for observability
						writer.write({
							type: "data-route-decision",
							data: {
								reason: "intent_media_image",
								experience: "image",
								timestamp: new Date().toISOString(),
								toolsDetected: false,
								classifierIntent: "image",
							},
						});

						writer.write({
							type: "data-turn-complete",
							data: { timestamp: new Date().toISOString() },
						});
					},
					onError: (error) => {
						if (error instanceof Error) {
							return error.message;
						}
						return "Failed to generate image";
					},
				});

				pipeUIMessageStreamToResponse({ response: res, stream });
				return;
			}

			if (mediaPreClassification.intent === "audio") {
				const {
					voiceInput: mediaBypassVoiceInput,
					source: mediaBypassVoiceInputSource,
					extractionMode: mediaBypassExtractionMode,
					resolutionType: mediaBypassResolutionType,
					needsClarification: mediaBypassNeedsClarification,
					clarificationPayload: mediaBypassClarificationPayload,
					confidence: mediaBypassConfidence,
					candidateCount: mediaBypassCandidateCount,
				} = resolveSmartAudioVoiceInput({
					intent: "audio",
					latestUserMessage,
					latestVisibleUserMessage: latestVisibleUserMessage?.text || latestUserMessage,
					messages,
					generatedNarrative: null,
					maxChars: SMART_VOICE_INPUT_MAX_CHARS,
				});

				if (
					mediaBypassNeedsClarification &&
					mediaBypassClarificationPayload
				) {
					streamQuestionCardWidget({
						res,
						payload: mediaBypassClarificationPayload,
						introText: "I need one quick choice before generating the audio clip.",
					});
					return;
				}

				// BE-003: Route audio queries to AI Gateway (bypass RovoDev)
				const stream = createUIMessageStream({
					execute: async ({ writer }) => {
						const audioWidgetId = `widget-audio-bypass-${Date.now()}`;
						const textId = `text-bypass-${Date.now()}`;

						writer.write({
							type: "data-thinking-status",
							data: {
								label: "Generating audio",
								activity: "audio",
								source: "backend",
							},
						});
						writer.write({
							type: "data-widget-loading",
							id: audioWidgetId,
							data: { type: SMART_WIDGET_TYPE_AUDIO, loading: true },
						});

						try {
							console.info("[OUTPUT-ROUTING] Selected media bypass audio input", {
								source: mediaBypassVoiceInputSource || null,
								extractionMode: mediaBypassExtractionMode || null,
								resolutionType: mediaBypassResolutionType || null,
								confidence:
									typeof mediaBypassConfidence === "number"
										? mediaBypassConfidence
										: null,
								candidateCount:
									typeof mediaBypassCandidateCount === "number"
										? mediaBypassCandidateCount
										: null,
								hasInput: Boolean(mediaBypassVoiceInput),
								payloadLength:
									typeof mediaBypassVoiceInput === "string"
										? mediaBypassVoiceInput.length
										: 0,
							});

							if (!mediaBypassVoiceInput) {
								throw new Error("No text available for audio synthesis");
							}

							const synthesisResult = await synthesizeSound({
								input: mediaBypassVoiceInput,
								provider: "google",
								model: "tts-latest",
								responseFormat: "mp3",
							});

							writer.write({
								type: "data-widget-data",
								id: audioWidgetId,
								data: {
									type: SMART_WIDGET_TYPE_AUDIO,
									payload: {
										audioUrl: buildAudioDataUrl(
											synthesisResult.audioBytes,
											synthesisResult.contentType
										),
										mimeType: synthesisResult.contentType,
										transcript: stripConversationalFiller(mediaBypassVoiceInput),
										source: "media-bypass-audio",
										inputSource: mediaBypassVoiceInputSource || undefined,
									},
								},
							});

							writer.write({ type: "text-start", id: textId });
							writer.write({
								type: "text-delta",
								id: textId,
								delta: mediaBypassVoiceInput,
							});
							writer.write({ type: "text-end", id: textId });
						} catch (audioError) {
							console.error("[OUTPUT-ROUTING] Media bypass audio generation failed:", audioError);
							writer.write({
								type: "data-widget-error",
								id: audioWidgetId,
								data: {
									type: SMART_WIDGET_TYPE_AUDIO,
									message: audioError instanceof Error
										? audioError.message
										: "Audio generation failed.",
									canRetry: true,
								},
							});

							writer.write({ type: "text-start", id: textId });
							writer.write({
								type: "text-delta",
								id: textId,
								delta: "I couldn't generate audio right now.",
							});
							writer.write({ type: "text-end", id: textId });
						} finally {
							writer.write({
								type: "data-widget-loading",
								id: audioWidgetId,
								data: { type: SMART_WIDGET_TYPE_AUDIO, loading: false },
							});
						}

						// Emit route-decision for observability
						writer.write({
							type: "data-route-decision",
							data: {
								reason: "intent_media_audio",
								experience: "audio",
								timestamp: new Date().toISOString(),
								toolsDetected: false,
								classifierIntent: "audio",
							},
						});

						writer.write({
							type: "data-turn-complete",
							data: { timestamp: new Date().toISOString() },
						});
					},
					onError: (error) => {
						if (error instanceof Error) {
							return error.message;
						}
						return "Failed to generate audio";
					},
				});

				pipeUIMessageStreamToResponse({ response: res, stream });
				return;
			}
		}

		const directGoogleIntent = inferSmartIntentFromPrompt(latestUserMessage);
		if (
			provider === "google" &&
			!isStrictToolFirstTurn &&
			directGoogleIntent === "image"
		) {
			const googleImageConfig = resolveGoogleImageGatewayConfig({
				envVars: getEnvVars(),
				requestedModel: rawModel,
				resolveGatewayUrl,
				detectEndpointType,
			});
			if (!googleImageConfig.ok) {
				return res.status(googleImageConfig.statusCode).json({
					error: googleImageConfig.error,
					details: googleImageConfig.details,
				});
			}

			const stream = createUIMessageStream({
				execute: async ({ writer }) => {
					const textId = `text-${Date.now()}`;
					let textStarted = false;
					const prefersImageModalities =
						inferSmartIntentFromPrompt(latestUserMessage) === "image";

					const emitTextDelta = (delta) => {
						if (typeof delta !== "string" || delta.length === 0) {
							return;
						}

						if (!textStarted) {
							writer.write({ type: "text-start", id: textId });
							textStarted = true;
						}

						writer.write({ type: "text-delta", id: textId, delta });
					};

					const streamGoogleTextOrImage = async (withModalities) => {
						await streamGoogleGatewayManualSse({
							gatewayUrl: googleImageConfig.gatewayUrl,
							envVars: googleImageConfig.envVars,
							model: googleImageConfig.model,
							prompt: userMessageText,
							maxOutputTokens: 2000,
							temperature: 1,
							responseModalities:
								withModalities && prefersImageModalities ? ["image"] : undefined,
							onTextDelta: emitTextDelta,
							onFile: ({ mediaType, base64 }) => {
								if (typeof base64 !== "string" || base64.length === 0) {
									return;
								}

								const resolvedMediaType =
									typeof mediaType === "string" && mediaType.trim()
										? mediaType
										: "image/png";
								writer.write({
									type: "file",
									mediaType: resolvedMediaType,
									url: `data:${resolvedMediaType};base64,${base64}`,
								});
							},
						});
					};

					try {
						await streamGoogleTextOrImage(true);
					} catch (modalitiesError) {
						if (
							!prefersImageModalities
							|| !isUnsupportedModalitiesError(modalitiesError)
						) {
							throw modalitiesError;
						}
						console.warn(
							"[CHAT-SDK] Google endpoint rejected modalities payload; retrying without modalities."
						);
						await streamGoogleTextOrImage(false);
					}

					if (textStarted) {
						writer.write({ type: "text-end", id: textId });
					}
				},
				onError: (error) => {
					if (error instanceof Error) {
						return error.message;
					}
					return "Failed to stream Google AI response";
				},
			});

			pipeUIMessageStreamToResponse({
				response: res,
				stream,
			});
			return;
		}

		const backendSelection = await resolvePreferredBackend({
			allowFallback: INTERACTIVE_CHAT_FALLBACK_ENABLED,
		});

		if (backendSelection.backend !== "rovodev") {
			return sendGatewayErrorResponse(
				res,
				createRovoDevUnavailableError(),
				"Failed to stream chat response"
			);
		}

		if (strictPortAssignment) {
			const poolStatus = _rovoDevPool?.getStatus?.();
			if (!poolStatus) {
				return res.status(503).json({
					error:
						"Strict multiport routing requires an active RovoDev pool. Restart with `pnpm run rovodev`.",
					code: "ROVODEV_POOL_UNAVAILABLE",
					portIndex: strictPortAssignment.portIndex,
					requiredPort: strictPortAssignment.rovoPort,
				});
			}

			let requiredEntry = poolStatus.ports.find(
				(entry) => entry.port === strictPortAssignment.rovoPort
			);
			if (!requiredEntry && Array.isArray(poolStatus.ports) && poolStatus.ports.length > 0) {
				try {
					const resolvedFromPool = resolveStrictRovoDevPortAssignment(
						strictPortAssignment.portIndex,
						{
							activePorts: poolStatus.ports.map((entry) => entry.port),
							poolStatus,
						}
					);
					strictPortAssignment = resolvedFromPool;
					requiredEntry = poolStatus.ports.find(
						(entry) => entry.port === strictPortAssignment.rovoPort
					);
				} catch {
					// Keep the original assignment and fall through to the strict error response.
				}
			}
			if (!requiredEntry) {
				return res.status(503).json({
					error: `Required RovoDev port ${strictPortAssignment.rovoPort} for chat panel index ${strictPortAssignment.portIndex} is not available in the current pool.`,
					code: "ROVODEV_STRICT_PORT_MISSING",
					portIndex: strictPortAssignment.portIndex,
					requiredPort: strictPortAssignment.rovoPort,
					availablePorts: poolStatus.ports.map((entry) => entry.port),
				});
			}

			if (requiredEntry.status === "unhealthy") {
				return res.status(503).json({
					error: `Required RovoDev port ${strictPortAssignment.rovoPort} for chat panel index ${strictPortAssignment.portIndex} is unhealthy.`,
					code: "ROVODEV_STRICT_PORT_UNHEALTHY",
					portIndex: strictPortAssignment.portIndex,
					requiredPort: strictPortAssignment.rovoPort,
				});
			}
		}

		// Create an AbortController so we can cancel the RovoDev stream when
		// the client disconnects (e.g. user clicks Stop).
		const abortController = new AbortController();
		req.on("close", () => {
			if (!abortController.signal.aborted) {
				console.log("[CHAT-SDK] Client disconnected, aborting RovoDev stream");
				abortController.abort();
			}
		});
		const shouldForceCardFirstGenui =
			smartGenerationActive &&
			prefersGenuiCardExperience &&
			!isStrictToolFirstTurn;

		const stream = createUIMessageStream({
			execute: async ({ writer }) => {
				const widgetLoadingPrefix = "WIDGET_LOADING:";
				const widgetDataPrefix = "WIDGET_DATA:";
				const thinkingStatusPrefix = "THINKING_STATUS:";
				const agentExecutionPrefix = "AGENT_EXECUTION:";
				const partialMarkerBufferLength =
					Math.max(
						widgetLoadingPrefix.length,
						widgetDataPrefix.length,
						thinkingStatusPrefix.length,
						agentExecutionPrefix.length
					) - 1;
				let textBuffer = "";
				const textId = `text-${Date.now()}`;
				const widgetId = `widget-${Date.now()}`;
				let textStarted = false;
				let assistantText = "";
				let widgetType = null;
				let latestPlanPayload = null;
				let resolvedRovoDevPort = null;
				let hasEmittedQuestionCard = false;
				let hasEmittedPlanWidget = false;
				let hasEmittedGenuiWidget = false;
					let hasSeenPlanWidgetSignal = false;
					let hasEmittedPlanLoadingState = false;
					let latestProgressivePlanFingerprint = null;
					let hasExplicitPlanPayload = false;
					/** @type {Map<string, {widgetId: string; richnessScore: number}>} */
					const emittedQuestionCardToolCalls = new Map();
					/** @type {Map<string, Array<{id: string, label: string}>>} */
					const requestUserInputQuestionMeta = new Map();
					let pendingQuestionCardLoadingWidgetId = null;
					let hasSuppressedLargeAssistantJson = false;
					let hasObservedToolExecution = false;
					// ── Output Routing: Two-step GenUI state ──
					// Track whether non-question-card tool calls were observed during
					// the RovoDev stream. When true, post-stream processing triggers
					// the two-step GenUI flow (BE-001).
					let hasObservedActionableToolCall = false;
					let hasObservedRelevantActionableToolCall = false;
						const toolFirstExecutionState = createToolFirstExecutionState(
							toolFirstPolicy
						);
						const toolFirstFullOutputs = [];
						const toolObservationEntries = [];
						const toolFirstSoftRetryEnabled =
							isStrictToolFirstTurn &&
							toolFirstPolicy?.enforcement?.mode ===
							TOOL_FIRST_ENFORCEMENT_MODE_SOFT_RETRY;
					const shouldDeferToolFirstText = toolFirstSoftRetryEnabled;
					let deferredToolFirstText = "";
					const suppressStreamingTextForCardFirstGenui =
						shouldForceCardFirstGenui;

					let bufferedAssistantText = "";
					const removeToolFirstFailureNarrative = () => {
						if (!isStrictToolFirstTurn) {
							return;
						}

						const sanitizedAssistant = stripToolFirstFailureNarrative(assistantText);
						if (sanitizedAssistant.replaced) {
							assistantText = sanitizedAssistant.text;
						}

						if (deferredToolFirstText.length > 0) {
							const sanitizedDeferred =
								stripToolFirstFailureNarrative(deferredToolFirstText);
							if (sanitizedDeferred.replaced) {
								deferredToolFirstText = sanitizedDeferred.text;
							}
						}
					};

					const flushDeferredToolFirstText = () => {
						if (!shouldDeferToolFirstText || deferredToolFirstText.length === 0) {
							return;
						}

						if (!textStarted) {
							writer.write({ type: "text-start", id: textId });
							textStarted = true;
						}

						writer.write({
							type: "text-delta",
							id: textId,
							delta: deferredToolFirstText,
						});
						deferredToolFirstText = "";
					};

					const emitTextDeltaRaw = (delta) => {
						if (!delta) {
							return;
						}

						if (shouldDeferToolFirstText) {
							deferredToolFirstText += delta;
							return;
						}
						if (suppressStreamingTextForCardFirstGenui) {
							return;
						}

						if (!textStarted) {
							writer.write({ type: "text-start", id: textId });
							textStarted = true;
						}

						writer.write({ type: "text-delta", id: textId, delta });
					};

				const flushBufferedAssistantText = ({ force = false } = {}) => {
					if (!bufferedAssistantText) {
						return;
					}

					if (!force && isClassifierIntentLeakCandidate(bufferedAssistantText)) {
						if (bufferedAssistantText.length <= CLASSIFIER_JSON_BUFFER_MAX_CHARS) {
							return;
						}

						const parsedClassifierPayload = parseClassifierIntentPayload(
							bufferedAssistantText
						);
						if (parsedClassifierPayload) {
							return;
						}
					}

					const chunk = bufferedAssistantText;
					bufferedAssistantText = "";
					emitTextDeltaRaw(chunk);
				};

				const finalizeBufferedAssistantText = () => {
					if (!bufferedAssistantText) {
						return null;
					}

					const parsedClassifierPayload = parseClassifierIntentPayload(
						bufferedAssistantText
					);
					if (parsedClassifierPayload) {
						bufferedAssistantText = "";
						return parsedClassifierPayload;
					}

					flushBufferedAssistantText({ force: true });
					return null;
				};

				const emitTextDelta = (delta) => {
					if (!delta) {
						return;
					}

					if (hasSuppressedLargeAssistantJson) {
						return;
					}

					const nextAssistantText = assistantText + delta;
					if (
						hasObservedToolExecution &&
						nextAssistantText.length > MAX_ASSISTANT_TEXT_WITH_TOOL_CALLS_CHARS
					) {
						hasSuppressedLargeAssistantJson = true;
						const suppressionNotice = `\n\n${ASSISTANT_JSON_SUPPRESSION_TEXT}`;
						assistantText += suppressionNotice;
						bufferedAssistantText += suppressionNotice;
						flushBufferedAssistantText({ force: true });
						return;
					}
					// When a tool has been executed, check with a much lower
					// threshold so that the LLM echoing raw tool-result JSON
					// is caught early — before hundreds of chars are streamed.
					// We check both the full text (via sanitizeAssistantNarrative
					// with a low threshold) and the substring starting at the
					// first JSON-like character, since the JSON often follows a
					// short natural-language preamble like "Here are your events."
					if (hasObservedToolExecution && nextAssistantText.length >= 300) {
						let earlyJsonDetected = false;

						// Fast path: check if assistant text contains a JSON
						// blob after a natural-language prefix
						const jsonObjectIdx = nextAssistantText.indexOf("{");
						if (jsonObjectIdx > -1) {
							const jsonPortion = nextAssistantText.slice(jsonObjectIdx);
							if (jsonPortion.length >= 200 && isLikelyLargeJsonDump(jsonPortion, { minChars: 200 })) {
								earlyJsonDetected = true;
							}
						}

						// Also try the full-text sanitizer with a lower threshold
						if (!earlyJsonDetected) {
							const earlyNarrativeSuppression = sanitizeAssistantNarrative(
								nextAssistantText,
								{
									maxChars: 400,
									replacement: ASSISTANT_JSON_SUPPRESSION_TEXT,
								}
							);
							if (earlyNarrativeSuppression.replaced) {
								earlyJsonDetected = true;
							}
						}

						if (earlyJsonDetected) {
							hasSuppressedLargeAssistantJson = true;
							if (textStarted) {
								// We already emitted some text — just append
								// the suppression notice for the remaining part
								const suppressionNotice = `\n\n${ASSISTANT_JSON_SUPPRESSION_TEXT}`;
								assistantText += suppressionNotice;
								bufferedAssistantText += suppressionNotice;
							} else {
								// Nothing emitted yet — emit any natural-language
								// prefix before the JSON, plus the suppression notice
								const prefix = jsonObjectIdx > -1
									? nextAssistantText.slice(0, jsonObjectIdx).trim()
									: "";
								const sanitizedOutput = prefix
									? `${prefix}\n\n${ASSISTANT_JSON_SUPPRESSION_TEXT}`
									: ASSISTANT_JSON_SUPPRESSION_TEXT;
								assistantText = sanitizedOutput;
								bufferedAssistantText = sanitizedOutput;
							}
							flushBufferedAssistantText({ force: true });
							return;
						}
					}
					const narrativeSuppression = sanitizeAssistantNarrative(
						nextAssistantText,
						{
							maxChars: MAX_INLINE_ASSISTANT_JSON_CHARS,
							replacement: ASSISTANT_JSON_SUPPRESSION_TEXT,
						}
					);
					if (narrativeSuppression.replaced) {
						hasSuppressedLargeAssistantJson = true;
						const suppressionNotice = `\n\n${ASSISTANT_JSON_SUPPRESSION_TEXT}`;
						assistantText += suppressionNotice;
						bufferedAssistantText += suppressionNotice;
						flushBufferedAssistantText({ force: true });
						return;
					}

					assistantText = nextAssistantText;
					bufferedAssistantText += delta;

					if (!isClassifierIntentLeakCandidate(bufferedAssistantText)) {
						flushBufferedAssistantText({ force: true });
						return;
					}

					if (bufferedAssistantText.length <= CLASSIFIER_JSON_BUFFER_MAX_CHARS) {
						return;
					}

					const parsedClassifierPayload = parseClassifierIntentPayload(
						bufferedAssistantText
					);
					if (!parsedClassifierPayload) {
						flushBufferedAssistantText({ force: true });
					}
				};

					const emitForcedTextDelta = (delta) => {
						if (typeof delta !== "string" || delta.length === 0) {
							return;
						}

						assistantText += delta;
						bufferedAssistantText += delta;
						flushBufferedAssistantText({ force: true });
					};

					const emitBufferedAssistantTextForTextRoute = () => {
						if (
							!suppressStreamingTextForCardFirstGenui ||
							textStarted ||
							assistantText.trim().length === 0
						) {
							return;
						}

						writer.write({ type: "text-start", id: textId });
						textStarted = true;
						writer.write({ type: "text-delta", id: textId, delta: assistantText });
					};

					const emitGenuiErrorTextFallback = (message = GENUI_FALLBACK_ERROR_TEXT) => {
						const normalizedMessage = getNonEmptyString(message);
						if (!normalizedMessage) {
							return;
						}

						if (!textStarted) {
							writer.write({ type: "text-start", id: textId });
							textStarted = true;
						}

						writer.write({
							type: "text-delta",
							id: textId,
							delta: normalizedMessage,
						});
						assistantText = normalizedMessage;
						bufferedAssistantText = "";
					};

					const resetAssistantTextForRetryAttempt = () => {
						textBuffer = "";
						assistantText = "";
						bufferedAssistantText = "";
						hasSuppressedLargeAssistantJson = false;
						if (shouldDeferToolFirstText) {
							deferredToolFirstText = "";
						}
					};

					const waitForRetryDelay = async (delayMs) =>
						new Promise((resolve) => {
							if (
								typeof delayMs !== "number" ||
								delayMs <= 0 ||
								abortController.signal.aborted
							) {
								resolve();
								return;
							}
							let settled = false;
							const onAbort = () => {
								clearTimeout(timer);
								finish();
							};
							const finish = () => {
								if (settled) {
									return;
								}
								settled = true;
								abortController.signal.removeEventListener("abort", onAbort);
								resolve();
							};
							const timer = setTimeout(finish, delayMs);
							abortController.signal.addEventListener("abort", onAbort, {
								once: true,
							});
						});

					const sanitizeThinkingLabel = (value) => {
						if (typeof value !== "string") {
							return "";
						}

						return value.replace(/(?:\s*(?:\.{3}|…))+$/u, "").trim();
					};

					const sanitizeThinkingActivity = (value) => {
						if (
							value === "image" ||
							value === "audio" ||
							value === "ui" ||
							value === "data" ||
							value === "results"
						) {
							return value;
						}

						return undefined;
					};

					const sanitizeThinkingSource = (value) => {
						if (value === "backend" || value === "fallback") {
							return value;
						}

						return undefined;
					};

				const normalizeThinkingPhase = (value) => {
					if (value === "start" || value === "result" || value === "error") {
						return value;
					}
					return null;
				};

						const sanitizeThinkingEvent = (value) => {
							if (!value || typeof value !== "object") {
								return null;
							}

					const phase = normalizeThinkingPhase(value.phase);
					if (!phase) {
						return null;
					}
					hasObservedToolExecution = true;

					const toolName = getNonEmptyString(value.toolName) ?? "Tool";
					const eventId =
						getNonEmptyString(value.eventId) ??
						`thinking-event-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
					const timestamp =
						getNonEmptyString(value.timestamp) ?? new Date().toISOString();
					const toolCallId = getNonEmptyString(value.toolCallId) ?? undefined;

					const payload = {
						eventId,
						phase,
						toolName,
						timestamp,
					};

					if (toolCallId) {
						payload.toolCallId = toolCallId;
					}

					if (phase === "start" && value.input !== undefined) {
						const inputPreview = toPreview(value.input);
						if (inputPreview.text) {
							payload.input = inputPreview.text;
						}
					}

					const outputCandidate =
						value.outputPreview !== undefined ? value.outputPreview : value.output;
					const outputPreview =
						outputCandidate !== undefined ? toPreview(outputCandidate) : null;
					const outputBytes =
						typeof value.outputBytes === "number" && Number.isFinite(value.outputBytes)
							? value.outputBytes
							: outputPreview?.bytes;
					const outputTruncated =
						Boolean(value.outputTruncated) || Boolean(outputPreview?.truncated);

					if (phase === "result" && outputPreview?.text) {
						payload.output = outputPreview.text;
						payload.outputPreview = outputPreview.text;
						if (outputTruncated) {
							payload.outputTruncated = true;
							payload.suppressedRawOutput = true;
						}
						if (typeof outputBytes === "number" && Number.isFinite(outputBytes)) {
							payload.outputBytes = outputBytes;
						}
					}

					if (phase === "error") {
						const errorCandidate =
							getNonEmptyString(value.errorText) ?? outputPreview?.text ?? null;
						if (errorCandidate) {
							const errorPreview = toPreview(errorCandidate);
							if (errorPreview.text) {
								payload.errorText = errorPreview.text;
							}
						}

						if (outputPreview?.text) {
							payload.output = outputPreview.text;
							payload.outputPreview = outputPreview.text;
						}
						if (outputTruncated || Boolean(value.suppressedRawOutput)) {
							payload.outputTruncated = true;
							payload.suppressedRawOutput = true;
						}
						if (typeof outputBytes === "number" && Number.isFinite(outputBytes)) {
							payload.outputBytes = outputBytes;
						}
					}

							return payload;
						};

						const recordToolObservation = ({
							phase,
							toolName,
							text,
							toolCallId,
							source,
							rawOutput,
							outputTruncated,
							outputBytes,
						}) => {
							const normalizedPhase =
								phase === "result" || phase === "error" ? phase : null;
							if (!normalizedPhase) {
								return;
							}

							const normalizedText = getNonEmptyString(text);
							if (!normalizedText) {
								return;
							}

							toolObservationEntries.push({
								phase: normalizedPhase,
								toolName: getNonEmptyString(toolName) || "Tool",
								text: normalizedText,
								toolCallId: getNonEmptyString(toolCallId) || null,
								source: getNonEmptyString(source) || null,
								rawOutput: toBoundedToolObservationRawOutput(rawOutput),
								outputTruncated: outputTruncated === true,
								outputBytes:
									typeof outputBytes === "number" && Number.isFinite(outputBytes)
										? outputBytes
										: null,
							});
							if (toolObservationEntries.length > 200) {
								toolObservationEntries.shift();
							}
						};

						const hasToolObservationEntries = () => toolObservationEntries.length > 0;

						const resolveDeterministicGenuiFallback = ({
							text,
							prompt,
							title,
							description,
							defaultSummary = "Generated interactive summary from tool results.",
							defaultSource = "genui-fallback",
							observationSource = "tool-observation-fallback",
							observations,
							allowTextFallback = true,
						} = {}) => {
							const resolvedObservations = Array.isArray(observations)
								? observations
								: toolObservationEntries;

							const googleStructuredFallback = buildGoogleStructuredFallback({
								observations: resolvedObservations,
								prompt,
								title,
								description,
							});
							if (googleStructuredFallback) {
								return {
									spec: googleStructuredFallback.spec,
									summary: googleStructuredFallback.summary || defaultSummary,
									source: googleStructuredFallback.source || observationSource,
									observationUsed: true,
									observationCount: googleStructuredFallback.observationCount ?? 0,
									resultCount: googleStructuredFallback.resultCount ?? 0,
									errorCount: googleStructuredFallback.errorCount ?? 0,
								};
							}

							const figmaStructuredFallback = buildFigmaStructuredFallback({
								observations: resolvedObservations,
								prompt,
								title,
								description,
							});
							if (figmaStructuredFallback) {
								return {
									spec: figmaStructuredFallback.spec,
									summary: figmaStructuredFallback.summary || defaultSummary,
									source: figmaStructuredFallback.source || observationSource,
									observationUsed: true,
									observationCount: figmaStructuredFallback.observationCount ?? 0,
									resultCount: figmaStructuredFallback.resultCount ?? 0,
									errorCount: figmaStructuredFallback.errorCount ?? 0,
								};
							}

							const structuredToolFallback = buildToolObservationStructuredFallback({
								observations: resolvedObservations,
								prompt,
								title,
								description,
							});
							if (structuredToolFallback) {
								return {
									spec: structuredToolFallback.spec,
									summary: structuredToolFallback.summary || defaultSummary,
									source: structuredToolFallback.source || observationSource,
									observationUsed: true,
									observationCount: structuredToolFallback.observationCount ?? 0,
									resultCount: structuredToolFallback.resultCount ?? 0,
									errorCount: structuredToolFallback.errorCount ?? 0,
								};
							}

							const observationFallback = buildToolObservationFallback({
								observations: resolvedObservations,
							});
							if (observationFallback.hasObservations) {
								const observationSpec =
									buildFallbackGenuiSpecFromText({
										text: observationFallback.text,
										prompt,
										title: title || observationFallback.title,
										description: description || observationFallback.description,
									}) ||
									buildMinimalTextCardSpec({
										text: observationFallback.text,
										title: title || observationFallback.title || "Tool results",
									});
								return {
									spec: observationSpec,
									summary: observationFallback.summary || defaultSummary,
									source: observationSource,
									observationUsed: true,
									observationCount: observationFallback.observationCount,
									resultCount: observationFallback.resultCount,
									errorCount: observationFallback.errorCount,
								};
							}

							if (!allowTextFallback) {
								return null;
							}

							const fallbackSpec = buildFallbackGenuiSpecFromText({
								text,
								prompt,
								title,
								description,
							});
							if (!fallbackSpec) {
								return null;
							}

							return {
								spec: fallbackSpec,
								summary: defaultSummary,
								source: defaultSource,
								observationUsed: false,
								observationCount: 0,
								resultCount: 0,
								errorCount: 0,
							};
						};

						const tryEmitCreateIntentDirectGenuiWidget = async ({
							widgetId,
							roleMessages,
							source = "create-intent-direct-genui",
						} = {}) => {
							if (!isCreateIntentRequestPrompt || abortController.signal.aborted) {
								return false;
							}

							const normalizedRoleMessages = Array.isArray(roleMessages)
								? roleMessages
								: mapUiMessagesToRoleContent(messages);
							if (normalizedRoleMessages.length === 0) {
								return false;
							}

							try {
								const directGenuiResult = await generateSmartGenuiResult({
									roleMessages: normalizedRoleMessages,
									provider,
									layoutContext: smartLayoutContext,
									signal: abortController.signal,
								});
								if (!directGenuiResult?.spec) {
									return false;
								}

								const summaryText = getNonEmptyString(directGenuiResult.narrative);
								writer.write({
									type: "data-widget-data",
									id: widgetId,
									data: {
										type: SMART_WIDGET_TYPE_GENUI,
										payload: withRouteWidgetContentType({
											spec: directGenuiResult.spec,
											summary: summaryText
												? summaryText.length > 280
													? `${summaryText.slice(0, 279)}...`
													: summaryText
												: "Generated interactive view",
											source,
										}),
									},
								});
								hasEmittedGenuiWidget = true;
								return true;
							} catch (directGenuiError) {
								console.warn(
									"[OUTPUT-ROUTING] Create-intent direct GenUI generation failed:",
									directGenuiError
								);
								return false;
							}
						};

						const emitPlanWidgetLoading = (loading) => {
							writer.write({
							type: "data-widget-loading",
						id: widgetId,
						data: {
							type: "plan",
							loading,
						},
					});
					hasSeenPlanWidgetSignal = true;
					hasEmittedPlanLoadingState = loading;
				};

				const emitPlanWidgetData = (payload) => {
					writer.write({
						type: "data-widget-data",
						id: widgetId,
						data: {
							type: "plan",
							payload,
						},
					});
					hasSeenPlanWidgetSignal = true;
				};

				const emitWidgetError = ({
					type,
					message,
					canRetry = true,
					id = widgetId,
				}) => {
					if (typeof type !== "string" || !type.trim()) {
						return;
					}
					if (typeof message !== "string" || !message.trim()) {
						return;
					}

					writer.write({
						type: "data-widget-error",
						id,
						data: {
							type,
							message: message.trim(),
							canRetry: Boolean(canRetry),
						},
					});
				};

				const maybeEmitProgressivePlanUpdate = () => {
					if (hasEmittedQuestionCard || hasExplicitPlanPayload) {
						return;
					}

					const progressivePlanPayload = extractProgressivePlanWidgetPayloadFromText(
						assistantText,
						{
							minTasks: 1,
							requireActionItemsHeading: true,
						}
					);
					if (!progressivePlanPayload) {
						return;
					}

					let nextFingerprint = null;
					try {
						nextFingerprint = JSON.stringify(progressivePlanPayload);
					} catch {
						nextFingerprint = null;
					}

					if (
						nextFingerprint &&
						nextFingerprint === latestProgressivePlanFingerprint
					) {
						return;
					}

					latestProgressivePlanFingerprint = nextFingerprint;
					latestPlanPayload = progressivePlanPayload;
					hasEmittedPlanWidget = true;
					hasSeenPlanWidgetSignal = true;
					widgetType = "plan";

					if (!hasEmittedPlanLoadingState) {
						emitPlanWidgetLoading(true);
					}

					emitPlanWidgetData(progressivePlanPayload);
				};

				const getQuestionCardRichnessScore = (payload) => {
					if (!payload || typeof payload !== "object") {
						return 0;
					}

					const questions = Array.isArray(payload.questions)
						? payload.questions
						: [];
					if (questions.length === 0) {
						return 0;
					}

					const optionCount = questions.reduce((count, question) => {
						if (!question || typeof question !== "object") {
							return count;
						}
						const options = Array.isArray(question.options)
							? question.options
							: [];
						return count + options.length;
					}, 0);

					return questions.length * 100 + optionCount;
				};

				const emitRequestUserInputQuestionCard = ({
					toolName,
					toolCallId,
					questionInput,
					source = "request_user_input_tool_input",
				}) => {
					if (!isRequestUserInputTool(toolName)) {
						return false;
					}

					const normalizedToolCallId = getNonEmptyString(toolCallId);
					let dedupeKey = normalizedToolCallId
						? `request-user-input:${normalizedToolCallId}`
						: null;
					if (!dedupeKey) {
						try {
							const serializedInput = JSON.stringify(questionInput);
							if (serializedInput && serializedInput !== "null") {
								dedupeKey = `request-user-input:${serializedInput}`;
							}
						} catch {
							dedupeKey = null;
						}
					}

					const payload = buildQuestionCardPayloadFromRequestUserInput(
						questionInput,
						{
							sessionId: normalizedToolCallId
								? `request-user-input-${normalizedToolCallId}`
								: createClarificationSessionId(),
							round: 1,
							maxRounds: 1,
							title: "Answer these questions to continue",
							description:
								"Pick the options that best match what you want.",
							widgetType: CLARIFICATION_WIDGET_TYPE,
							maxPresetOptions: CLARIFICATION_MAX_PRESET_OPTIONS,
							customOptionPlaceholder: CLARIFICATION_CUSTOM_OPTION_PLACEHOLDER,
							maxLabelLength: CLARIFICATION_MAX_LABEL_LENGTH,
							createSessionId: createClarificationSessionId,
						}
					);
					if (!payload) {
						return false;
					}

					// Store question ID → label mapping for answer format adaptation
					if (payload.sessionId && Array.isArray(payload.questions)) {
						const meta = payload.questions
							.filter((q) => q && typeof q.id === "string" && typeof q.label === "string")
							.map((q) => ({ id: q.id, label: q.label }));
						requestUserInputQuestionMeta.set(payload.sessionId, meta);
						_requestUserInputQuestionMetaStore.set(payload.sessionId, meta);
					}

					const resolvedDedupeKey =
						dedupeKey ||
						`request-user-input:${payload.sessionId}:${payload.round}`;
					const richnessScore = getQuestionCardRichnessScore(payload);
					const existingQuestionCardState =
						emittedQuestionCardToolCalls.get(resolvedDedupeKey) || null;
					if (
						existingQuestionCardState &&
						existingQuestionCardState.richnessScore >= richnessScore
					) {
						return false;
					}

					const questionCardWidgetId =
						existingQuestionCardState?.widgetId ||
						(normalizedToolCallId
							? `request-user-input-${normalizedToolCallId}`
							: `request-user-input-${Date.now()}`);
					hasEmittedQuestionCard = true;
					pendingQuestionCardLoadingWidgetId = questionCardWidgetId;

					if (!existingQuestionCardState) {
						writer.write({
							type: "data-widget-loading",
							id: questionCardWidgetId,
							data: {
								type: CLARIFICATION_WIDGET_TYPE,
								loading: true,
							},
						});
					}

					writer.write({
						type: "data-widget-data",
						id: questionCardWidgetId,
						data: {
							type: CLARIFICATION_WIDGET_TYPE,
							payload,
						},
					});

					// BE-005 / BE-009: Emit route-decision for question card experience
					writer.write({
						type: "data-route-decision",
						data: {
							reason: "intent_clarification",
							experience: "question_card",
							timestamp: new Date().toISOString(),
							toolsDetected: true,
						},
					});

					emittedQuestionCardToolCalls.set(resolvedDedupeKey, {
						widgetId: questionCardWidgetId,
						richnessScore,
					});

					console.info("[OUTPUT-ROUTING] Question card emitted via tool", {
						reason: "intent_clarification",
						experience: "question_card",
						sessionId: payload.sessionId,
						questionCount: Array.isArray(payload.questions) ? payload.questions.length : 0,
						richnessScore,
						upgraded: Boolean(existingQuestionCardState),
						source,
					});
					return true;
				};

				const emitRequestUserInputQuestionCardFromResult = (toolCallResult) => {
					if (!toolCallResult || typeof toolCallResult !== "object") {
						return;
					}

					if (!isRequestUserInputTool(toolCallResult.toolName)) {
						return;
					}

					const outputCandidates = [
						toolCallResult.toolOutputRaw,
						toolCallResult.toolOutputPreview,
					].filter((candidate) => candidate !== undefined && candidate !== null);

					for (const candidate of outputCandidates) {
						const emitted = emitRequestUserInputQuestionCard({
							toolName: toolCallResult.toolName,
							toolCallId: toolCallResult.toolCallId,
							questionInput: candidate,
							source: "request_user_input_tool_result",
						});
						if (emitted) {
							return;
						}
					}
				};

				const findNextMarkerIndex = (value) => {
					const loadingIndex = value.indexOf(widgetLoadingPrefix);
					const dataIndex = value.indexOf(widgetDataPrefix);
					const thinkingIndex = value.indexOf(thinkingStatusPrefix);
					const agentExecIndex = value.indexOf(agentExecutionPrefix);
					let minIndex = -1;
					for (const idx of [loadingIndex, dataIndex, thinkingIndex, agentExecIndex]) {
						if (idx !== -1 && (minIndex === -1 || idx < minIndex)) {
							minIndex = idx;
						}
					}
					return minIndex;
				};

				const findJsonObjectEndIndex = (value, startIndex) => {
					let depth = 0;
					let inString = false;
					let isEscaped = false;

					for (let index = startIndex; index < value.length; index++) {
						const character = value[index];

						if (inString) {
							if (isEscaped) {
								isEscaped = false;
							} else if (character === "\\") {
								isEscaped = true;
							} else if (character === "\"") {
								inString = false;
							}
							continue;
						}

						if (character === "\"") {
							inString = true;
						} else if (character === "{") {
							depth += 1;
						} else if (character === "}") {
							depth -= 1;
							if (depth === 0) {
								return index;
							}
						}
					}

					return -1;
				};

				const processTextBuffer = (isFinalChunk) => {
					while (textBuffer.length > 0) {
						const markerIndex = findNextMarkerIndex(textBuffer);

						if (markerIndex === -1) {
							if (isFinalChunk) {
								emitTextDelta(textBuffer);
								textBuffer = "";
								continue;
							}

							if (textBuffer.length > partialMarkerBufferLength) {
								const flushableLength =
									textBuffer.length - partialMarkerBufferLength;
								emitTextDelta(textBuffer.slice(0, flushableLength));
								textBuffer = textBuffer.slice(flushableLength);
							}
							return;
						}

						if (markerIndex > 0) {
							emitTextDelta(textBuffer.slice(0, markerIndex));
							textBuffer = textBuffer.slice(markerIndex);
							continue;
						}

						if (textBuffer.startsWith(widgetLoadingPrefix)) {
							const loadingMatch = textBuffer.match(
								/^WIDGET_LOADING:([A-Za-z0-9_-]+)/
							);
							if (!loadingMatch) {
								if (textBuffer.length > widgetLoadingPrefix.length) {
									emitTextDelta(widgetLoadingPrefix);
									textBuffer = textBuffer.slice(widgetLoadingPrefix.length);
									continue;
								}
								if (isFinalChunk) {
									emitTextDelta(textBuffer);
									textBuffer = "";
								}
								return;
							}

							widgetType = loadingMatch[1];
							if (widgetType === "plan") {
								hasSeenPlanWidgetSignal = true;
								hasEmittedPlanLoadingState = true;
							}
							writer.write({
								type: "data-widget-loading",
								id: widgetId,
								data: {
									type: widgetType,
									loading: true,
								},
							});

							textBuffer = textBuffer
								.slice(loadingMatch[0].length)
								.replace(/^[\r\n\t ]+/, "");
							continue;
						}

						if (textBuffer.startsWith(widgetDataPrefix)) {
							let jsonStartIndex = widgetDataPrefix.length;
							while (
								jsonStartIndex < textBuffer.length &&
								/\s/.test(textBuffer[jsonStartIndex])
							) {
								jsonStartIndex += 1;
							}

							if (jsonStartIndex >= textBuffer.length) {
								if (isFinalChunk) {
									emitTextDelta(textBuffer);
									textBuffer = "";
								}
								return;
							}

							if (textBuffer[jsonStartIndex] !== "{") {
								const invalidPrefix = textBuffer.slice(0, jsonStartIndex);
								emitTextDelta(invalidPrefix);
								textBuffer = textBuffer.slice(jsonStartIndex);
								continue;
							}

							const jsonEndIndex = findJsonObjectEndIndex(
								textBuffer,
								jsonStartIndex
							);
							if (jsonEndIndex === -1) {
								if (isFinalChunk) {
									emitTextDelta(textBuffer);
									textBuffer = "";
								}
								return;
							}

							const jsonPayload = textBuffer.slice(
								jsonStartIndex,
								jsonEndIndex + 1
							);
							textBuffer = textBuffer
								.slice(jsonEndIndex + 1)
								.replace(/^[\r\n\t ]+/, "");

							try {
								const parsedWidget = JSON.parse(jsonPayload);
								const resolvedWidgetType =
									parsedWidget?.type ?? widgetType ?? "widget";
								widgetType = resolvedWidgetType;
								if (resolvedWidgetType === CLARIFICATION_WIDGET_TYPE) {
									hasEmittedQuestionCard = true;
									pendingQuestionCardLoadingWidgetId = widgetId;
								}
								if (resolvedWidgetType === SMART_WIDGET_TYPE_GENUI) {
									hasEmittedGenuiWidget = true;
								}
								if (resolvedWidgetType === "plan") {
									latestPlanPayload = parsedWidget;
									hasEmittedPlanWidget = true;
									hasSeenPlanWidgetSignal = true;
									hasExplicitPlanPayload = true;
									latestProgressivePlanFingerprint = null;
								}

								writer.write({
									type: "data-widget-data",
									id: widgetId,
									data: {
										type: resolvedWidgetType,
										payload: parsedWidget,
									},
								});

								if (resolvedWidgetType === CLARIFICATION_WIDGET_TYPE) {
									continue;
								}

								writer.write({
									type: "data-widget-loading",
									id: widgetId,
									data: {
										type: resolvedWidgetType,
										loading: false,
									},
								});
								if (resolvedWidgetType === "plan") {
									hasEmittedPlanLoadingState = false;
								}
							} catch (error) {
								console.error("Failed to parse widget payload:", error);
								emitTextDelta(`${widgetDataPrefix}${jsonPayload}`);
							}

							continue;
						}

						if (textBuffer.startsWith(thinkingStatusPrefix)) {
							let jsonStartIndex = thinkingStatusPrefix.length;
							while (
								jsonStartIndex < textBuffer.length &&
								/\s/.test(textBuffer[jsonStartIndex])
							) {
								jsonStartIndex += 1;
							}

							if (jsonStartIndex >= textBuffer.length) {
								if (isFinalChunk) {
									emitTextDelta(textBuffer);
									textBuffer = "";
								}
								return;
							}

							if (textBuffer[jsonStartIndex] !== "{") {
								const invalidPrefix = textBuffer.slice(0, jsonStartIndex);
								emitTextDelta(invalidPrefix);
								textBuffer = textBuffer.slice(jsonStartIndex);
								continue;
							}

							const jsonEndIndex = findJsonObjectEndIndex(
								textBuffer,
								jsonStartIndex
							);
							if (jsonEndIndex === -1) {
								if (isFinalChunk) {
									emitTextDelta(textBuffer);
									textBuffer = "";
								}
								return;
							}

							const jsonPayload = textBuffer.slice(
								jsonStartIndex,
								jsonEndIndex + 1
							);
							textBuffer = textBuffer
								.slice(jsonEndIndex + 1)
								.replace(/^[\r\n\t ]+/, "");

							try {
								const parsedStatus = JSON.parse(jsonPayload);
								const label = sanitizeThinkingLabel(parsedStatus.label);
								const content =
									typeof parsedStatus.content === "string"
										? parsedStatus.content.trim()
										: "";
								const activity = sanitizeThinkingActivity(parsedStatus.activity);
								const source = sanitizeThinkingSource(parsedStatus.source);
								writer.write({
									type: "data-thinking-status",
									data: {
										label: label || "Thinking",
										content: content.length > 0 ? content : undefined,
										activity,
										source,
									},
								});
							} catch (error) {
								console.error("Failed to parse thinking-status payload:", error);
								emitTextDelta(`${thinkingStatusPrefix}${jsonPayload}`);
							}

							continue;
						}

						if (textBuffer.startsWith(agentExecutionPrefix)) {
							let jsonStartIndex = agentExecutionPrefix.length;
							while (
								jsonStartIndex < textBuffer.length &&
								/\s/.test(textBuffer[jsonStartIndex])
							) {
								jsonStartIndex += 1;
							}

							if (jsonStartIndex >= textBuffer.length) {
								if (isFinalChunk) {
									emitTextDelta(textBuffer);
									textBuffer = "";
								}
								return;
							}

							if (textBuffer[jsonStartIndex] !== "{") {
								const invalidPrefix = textBuffer.slice(0, jsonStartIndex);
								emitTextDelta(invalidPrefix);
								textBuffer = textBuffer.slice(jsonStartIndex);
								continue;
							}

							const jsonEndIndex = findJsonObjectEndIndex(
								textBuffer,
								jsonStartIndex
							);
							if (jsonEndIndex === -1) {
								if (isFinalChunk) {
									emitTextDelta(textBuffer);
									textBuffer = "";
								}
								return;
							}

							const jsonPayload = textBuffer.slice(
								jsonStartIndex,
								jsonEndIndex + 1
							);
							textBuffer = textBuffer
								.slice(jsonEndIndex + 1)
								.replace(/^[\r\n\t ]+/, "");

							try {
								const parsedExecution = JSON.parse(jsonPayload);
								writer.write({
									type: "data-agent-execution",
									data: {
										agentId: parsedExecution.agentId || "unknown",
										agentName: parsedExecution.agentName || "Agent",
										taskId: parsedExecution.taskId || "unknown",
										taskLabel: parsedExecution.taskLabel || "Task",
										status: parsedExecution.status || "working",
										content: parsedExecution.content,
									},
								});
							} catch (error) {
								console.error("Failed to parse agent-execution payload:", error);
								emitTextDelta(`${agentExecutionPrefix}${jsonPayload}`);
							}

							continue;
						}

						if (isFinalChunk) {
							emitTextDelta(textBuffer);
							textBuffer = "";
						}
						return;
					}
				};

				const handleStreamTextDelta = (delta) => {
					if (typeof delta !== "string" || delta.length === 0) {
						return;
					}

					emitLazyThinkingStatus();
					textBuffer += delta;
					processTextBuffer(false);
					maybeEmitProgressivePlanUpdate();
				};

					// RovoDev Serve: route through the local agent loop
					console.log("[CHAT-SDK] Routing through RovoDev Serve");
					// Emit data-thinking-status lazily — only when the LLM
					// actually starts producing output (text or tool events).
					// Until then the frontend shows the preload indicator
					// ("Rovo is cooking") to distinguish "waiting for LLM"
					// from "LLM is actively working."
					let hasEmittedThinkingStatus = false;
					const emitLazyThinkingStatus = () => {
						if (hasEmittedThinkingStatus) return;
						hasEmittedThinkingStatus = true;
						writer.write({
							type: "data-thinking-status",
							data: {
								label: "Thinking",
								activity: "results",
								source: "backend",
							},
						});
					};
					const toolFirstRetryLimit = toolFirstSoftRetryEnabled
						? Math.max(toolFirstPolicy?.enforcement?.maxRelevantRetries ?? 0, 0)
						: 0;
					const totalToolFirstAttempts = toolFirstRetryLimit + 1;
					let currentToolFirstAttempt = 1;
					let activeAttemptMessage = userMessageText;
					let shouldContinueToolFirstRetry = true;
					let forcePortRecoveryAttemptCount = 0;

					while (shouldContinueToolFirstRetry) {
						recordToolFirstAttempt(toolFirstExecutionState, {
							isRetry: currentToolFirstAttempt > 1,
						});

						let streamTimedOut = false;
						try {
							await streamViaRovoDev({
								message: activeAttemptMessage,
								onTextDelta: handleStreamTextDelta,
								// ── Output Routing: Track all tool calls (BE-001) ──
								// Question-card tools are emitted from resolved tool input
								// and upgraded from tool-result payloads when richer option
								// data arrives. Other tools mark actionable usage for the
								// two-step GenUI flow.
								onToolCallStart: (toolCall) => {
									if (!toolCall || typeof toolCall !== "object") {
										return;
									}

									if (isRequestUserInputTool(toolCall.toolName)) {
										return;
									}

									if (
										isToolNameRelevant({
											toolName: toolCall.toolName,
											domains: toolFirstRelevanceDomains,
										})
									) {
										hasObservedRelevantActionableToolCall = true;
									}
									hasObservedActionableToolCall = true;
								},
								onToolCallInputResolved: (toolCall) => {
									emitRequestUserInputQuestionCard({
										toolName: toolCall?.toolName,
										toolCallId: toolCall?.toolCallId,
										questionInput: toolCall?.toolInput,
										source: "request_user_input_tool_input",
									});
								},
									onToolCallResult: (toolCallResult) => {
										emitRequestUserInputQuestionCardFromResult(toolCallResult);

										// Capture full output for tool-first GenUI generation
										const toolOutput =
											toolCallResult?.output ??
											toolCallResult?.toolOutputRaw ??
											toolCallResult?.toolOutputPreview;
										const toolOutputPreview =
											toolOutput !== undefined && toolOutput !== null
												? toPreview(toolOutput)
												: null;
										if (
											!isRequestUserInputTool(toolCallResult?.toolName) &&
											toolOutputPreview?.text
										) {
											recordToolObservation({
												phase: "result",
												toolName: toolCallResult.toolName,
												text: toolOutputPreview.text,
												toolCallId: toolCallResult?.toolCallId,
												source: "tool_call_result",
												rawOutput: toolOutput,
												outputTruncated: toolOutputPreview.truncated,
												outputBytes: toolOutputPreview.bytes,
											});
										}

										if (toolFirstPolicy.matched && toolCallResult?.toolName) {
											const isRelevant = isToolNameRelevant({
												toolName: toolCallResult.toolName,
												domains: toolFirstRelevanceDomains,
											});
											if (isRelevant && toolOutput !== undefined && toolOutput !== null) {
												toolFirstFullOutputs.push({
													toolName: toolCallResult.toolName,
												output: typeof toolOutput === "string"
													? toolOutput.slice(0, 4000)
													: JSON.stringify(toolOutput).slice(0, 4000),
											});
										}
									}
								},
								signal: abortController.signal,
								conflictPolicy: "wait-for-turn",
								port: strictPortAssignment?.rovoPort,
								portIndex,
								onPortAcquired: (acquiredPort) => {
									if (typeof acquiredPort === "number" && acquiredPort > 0) {
										resolvedRovoDevPort = acquiredPort;
									}
								},
								onThinkingStatus: (statusUpdate) => {
									if (!statusUpdate || typeof statusUpdate !== "object") {
										return;
									}

									hasEmittedThinkingStatus = true;
									const label = sanitizeThinkingLabel(statusUpdate.label);
									if (!label) {
										return;
									}

									const rawContent =
										typeof statusUpdate.content === "string"
											? statusUpdate.content.trim()
											: "";
									if (
										isStrictToolFirstTurn &&
										shouldSuppressToolFirstIntentStatus({
											execution: toolFirstExecutionState,
											label,
											content: rawContent,
										})
									) {
										return;
									}
									const activity = sanitizeThinkingActivity(statusUpdate.activity);
									const source = sanitizeThinkingSource(statusUpdate.source);

									writer.write({
										type: "data-thinking-status",
										data: {
											label,
											content: rawContent.length > 0 ? rawContent : undefined,
											activity,
											source,
										},
									});
								},
									onThinkingEvent: (thinkingEvent) => {
										const sanitizedEvent = sanitizeThinkingEvent(thinkingEvent);
										if (!sanitizedEvent) {
											return;
										}
										recordToolThinkingEvent(
											toolFirstExecutionState,
											sanitizedEvent
										);
										if (sanitizedEvent.phase === "result") {
											recordToolObservation({
												phase: "result",
												toolName: sanitizedEvent.toolName,
												text:
													sanitizedEvent.outputPreview || sanitizedEvent.output,
												toolCallId: sanitizedEvent.toolCallId,
												source: "thinking_event",
												outputTruncated: sanitizedEvent.outputTruncated,
												outputBytes: sanitizedEvent.outputBytes,
											});
										} else if (sanitizedEvent.phase === "error") {
											recordToolObservation({
												phase: "error",
												toolName: sanitizedEvent.toolName,
												text:
													sanitizedEvent.errorText ||
													sanitizedEvent.outputPreview ||
													sanitizedEvent.output,
												toolCallId: sanitizedEvent.toolCallId,
												source: "thinking_event",
												outputTruncated: sanitizedEvent.outputTruncated,
												outputBytes: sanitizedEvent.outputBytes,
											});
										}

										writer.write({
											type: "data-thinking-event",
											id: sanitizedEvent.eventId,
										data: sanitizedEvent,
									});
								},
							});
						} catch (rovoDevStreamError) {
							if (rovoDevStreamError?.code === "ROVODEV_PORT_STUCK") {
								// Port is stuck — inform user and restart immediately
								const recoveryPort =
									rovoDevStreamError.port ||
									resolvedRovoDevPort ||
									strictPortAssignment?.rovoPort;

								handleStreamTextDelta(
									"\n\n⚠️ This request couldn't be completed — the RovoDev port is stuck. Please try again."
								);

								if (typeof recoveryPort === "number" && recoveryPort > 0) {
									try {
										const recoveryResult = await restartRovoDevPort({
											port: recoveryPort,
											cancelChat: rovoDevCancelChat,
											healthCheck: rovoDevHealthCheck,
											getListeningPidsForPort,
											refreshAvailability: refreshRovoDevAvailability,
											timeoutMs: INTERACTIVE_CHAT_FORCE_PORT_RECOVERY_TIMEOUT_MS,
										});
										console.info("[CHAT-SDK] Port stuck recovery result", {
											port: recoveryPort,
											recovered: recoveryResult.recovered === true,
											killedPids: recoveryResult.killedPids,
											activePids: recoveryResult.activePids,
											error: recoveryResult.error,
										});
									} catch (recoveryErr) {
										console.error(
											"[CHAT-SDK] Port restart failed:",
											recoveryErr?.message || recoveryErr
										);
									}
								}

								// Exit the tool-first loop — no retry for stuck ports
								shouldContinueToolFirstRetry = false;
							} else if (rovoDevStreamError?.code === "ROVODEV_CHAT_IN_PROGRESS_TIMEOUT") {
								streamTimedOut = true;
								const resolvedRecoveryPort =
									typeof resolvedRovoDevPort === "number" && resolvedRovoDevPort > 0
										? resolvedRovoDevPort
										: typeof strictPortAssignment?.rovoPort === "number" &&
												strictPortAssignment.rovoPort > 0
											? strictPortAssignment.rovoPort
											: null;
								const canForceRecoverPort =
									typeof resolvedRecoveryPort === "number" &&
									forcePortRecoveryAttemptCount <
										INTERACTIVE_CHAT_FORCE_PORT_RECOVERY_MAX_ATTEMPTS;

								if (canForceRecoverPort) {
									forcePortRecoveryAttemptCount += 1;

									const recoveryResult = await restartRovoDevPort({
										port: resolvedRecoveryPort,
										cancelChat: rovoDevCancelChat,
										healthCheck: rovoDevHealthCheck,
										getListeningPidsForPort,
										refreshAvailability: refreshRovoDevAvailability,
										timeoutMs: INTERACTIVE_CHAT_FORCE_PORT_RECOVERY_TIMEOUT_MS,
									});
									console.info("[CHAT-SDK] Forced per-port recovery result", {
										port: resolvedRecoveryPort,
										recovered: recoveryResult.recovered === true,
										killedPids: recoveryResult.killedPids,
										activePids: recoveryResult.activePids,
										error: recoveryResult.error,
									});

									if (recoveryResult.recovered) {
										writer.write({
											type: "data-thinking-status",
											data: {
												label: "Recovered stuck port, retrying",
												content: `RovoDev port ${resolvedRecoveryPort} restarted successfully.`,
												activity: "results",
												source: "backend",
											},
										});
										continue;
									}

									writer.write({
										type: "data-thinking-status",
										data: {
											label: "Port recovery failed",
											content:
												typeof recoveryResult.error === "string" &&
												recoveryResult.error.trim().length > 0
													? recoveryResult.error.trim()
													: `Failed to recover RovoDev port ${resolvedRecoveryPort}.`,
											activity: "results",
											source: "backend",
										},
									});
								}

								writer.write({
									type: "data-thinking-status",
									data: {
										label: "RovoDev turn wait timed out",
										content:
											"Automatic recovery timed out while waiting for the previous turn to clear.",
										activity: "results",
										source: "backend",
									},
								});
								handleStreamTextDelta(
									"\n\n⚠️ Automatic recovery timed out while waiting for the previous turn. Please retry or reset the chat."
								);
							} else {
								throw rovoDevStreamError;
							}
						}

						if (streamTimedOut) {
							shouldContinueToolFirstRetry = false;
							continue;
						}

						const hasToolFirstSuccess = hasRelevantToolSuccess(
							toolFirstExecutionState
						);
						const canRetryToolFirst =
							toolFirstSoftRetryEnabled &&
							!abortController.signal.aborted &&
							!hasToolFirstSuccess &&
							currentToolFirstAttempt < totalToolFirstAttempts;
						if (!canRetryToolFirst) {
							shouldContinueToolFirstRetry = false;
							continue;
						}

						const retryNumber = currentToolFirstAttempt;
						const nextAttempt = currentToolFirstAttempt + 1;
						const retriesRemaining = Math.max(
							totalToolFirstAttempts - nextAttempt,
							0
						);
						const retryDelayMs = getToolFirstRetryDelayMs({
							policy: toolFirstPolicy,
							retryIndex: retryNumber - 1,
						});

						console.info("[TOOL-FIRST] Retrying tool-grounded response", {
							domains: toolFirstPolicy.domains,
							relevanceDomains: toolFirstRelevanceDomains,
							attempt: nextAttempt,
							maxAttempts: totalToolFirstAttempts,
							retryDelayMs,
							relevantToolStarts: toolFirstExecutionState.relevantToolStarts,
							relevantToolResults: toolFirstExecutionState.relevantToolResults,
							relevantToolErrors: toolFirstExecutionState.relevantToolErrors,
						});
						writer.write({
							type: "data-thinking-status",
							data: {
								label: `Retrying integration tools (${nextAttempt}/${totalToolFirstAttempts})`,
								activity: "results",
								source: "backend",
							},
						});
						resetAssistantTextForRetryAttempt();

						if (retryDelayMs > 0) {
							await waitForRetryDelay(retryDelayMs);
						}
						if (abortController.signal.aborted) {
							shouldContinueToolFirstRetry = false;
							continue;
						}

						activeAttemptMessage = `${userMessageText}\n\n${buildToolFirstRetryInstruction(
							{
								policy: toolFirstPolicy,
								attemptNumber: nextAttempt,
								remainingRetries: retriesRemaining,
								execution: toolFirstExecutionState,
							}
						)}`;
						currentToolFirstAttempt = nextAttempt;
					}


				processTextBuffer(true);
				maybeEmitProgressivePlanUpdate();

				const leakedClassifierPayload = finalizeBufferedAssistantText();
				if (leakedClassifierPayload) {
					console.warn("[CHAT-SDK] Suppressed classifier-style JSON response", {
						intent: leakedClassifierPayload.intent,
						confidence: leakedClassifierPayload.confidence,
						reason: leakedClassifierPayload.reason,
					});
					let repairedResponseText = null;

					try {
						const retryText = await generateTextViaGateway({
							system:
								"You are a helpful assistant. Respond directly to the user request in normal prose. Never output router JSON metadata such as {\"intent\":...}.",
							prompt: userMessageText,
							maxOutputTokens: 1200,
							temperature: 0.6,
							...buildSmartGenerationGatewayOptions({
								provider,
							}),
						});
						const normalizedRetryText = getNonEmptyString(retryText);
						if (
							normalizedRetryText &&
							!parseClassifierIntentPayload(normalizedRetryText)
						) {
							repairedResponseText = normalizedRetryText;
						}
					} catch (retryError) {
						console.error(
							"[CHAT-SDK] Failed to recover from classifier-style JSON leak:",
							retryError
						);
					}

					if (!repairedResponseText) {
						repairedResponseText =
							"I had an internal routing issue while generating that response. Please try again and I will answer directly.";
					}

					assistantText = repairedResponseText;
					emitTextDeltaRaw(repairedResponseText);
				}

				// Skip post-stream work if the client disconnected
				if (abortController.signal.aborted) {
					if (textStarted) {
						writer.write({ type: "text-end", id: textId });
					}
					return;
				}

				if (!hasEmittedQuestionCard && !hasEmittedPlanWidget) {
					const previousQuestionCard = getActiveQuestionCardPayload(messages);
					const fallbackQuestionCardState = resolveFallbackQuestionCardState({
						isPostClarificationTurn,
						clarificationSubmission,
						previousQuestionCard,
						fallbackSessionId: buildPlanningQuestionCardSessionId(planRequestId),
						maxRounds: CLARIFICATION_MAX_ROUNDS,
					});
					if (fallbackQuestionCardState.canEmit) {
						const fallbackQuestionCardPayload =
							extractQuestionCardPayloadFromAssistantText(assistantText, {
								sessionId: fallbackQuestionCardState.sessionId,
								round: fallbackQuestionCardState.round,
								maxRounds: fallbackQuestionCardState.maxRounds,
								title: "Help me clarify what you need",
								description:
									"Answer these questions so I can build a better plan.",
							});
						if (fallbackQuestionCardPayload) {
							const fallbackWidgetId = `question-card-fallback-${Date.now()}`;
							hasEmittedQuestionCard = true;
							writer.write({
								type: "data-widget-loading",
								id: fallbackWidgetId,
								data: {
									type: CLARIFICATION_WIDGET_TYPE,
									loading: true,
								},
							});
							writer.write({
								type: "data-widget-data",
								id: fallbackWidgetId,
								data: {
									type: CLARIFICATION_WIDGET_TYPE,
									payload: fallbackQuestionCardPayload,
								},
							});
							writer.write({
								type: "data-widget-loading",
								id: fallbackWidgetId,
								data: {
									type: CLARIFICATION_WIDGET_TYPE,
									loading: false,
								},
							});

							// BE-005 / BE-009: Emit route-decision for fallback question card
							writer.write({
								type: "data-route-decision",
								data: {
									reason: "intent_clarification",
									experience: "question_card",
									timestamp: new Date().toISOString(),
									toolsDetected: false,
								},
							});

							console.info("[OUTPUT-ROUTING] Question card emitted via fallback extraction", {
								reason: "intent_clarification",
								experience: "question_card",
								sessionId: fallbackQuestionCardPayload.sessionId,
								round: fallbackQuestionCardPayload.round,
								questionCount: Array.isArray(fallbackQuestionCardPayload.questions)
									? fallbackQuestionCardPayload.questions.length
									: 0,
								source: "text_extraction_fallback",
							});
						}
					}
				}

				if (!hasEmittedQuestionCard && !hasEmittedPlanWidget) {
					let fallbackPlanPayload = extractPlanWidgetPayloadFromText(
						assistantText
					);
					if (!fallbackPlanPayload && isPostClarificationTurn) {
						fallbackPlanPayload = extractPlanWidgetPayloadFromStructuredText(
							assistantText
						);
					}
					if (fallbackPlanPayload) {
						latestPlanPayload = fallbackPlanPayload;
						hasEmittedPlanWidget = true;
						emitPlanWidgetData(fallbackPlanPayload);
						emitPlanWidgetLoading(false);
					}
				}

				const shouldEmitPlanWidgetError =
					hasSeenPlanWidgetSignal &&
					!hasEmittedQuestionCard &&
					!hasEmittedPlanWidget;
				if (shouldEmitPlanWidgetError) {
					if (hasEmittedPlanLoadingState) {
						emitPlanWidgetLoading(false);
					}

					emitWidgetError({
						type: "plan",
						message:
							"I couldn't finish building the plan card. Retry and I'll regenerate it.",
						canRetry: true,
					});
				}

				if (
					hasEmittedPlanWidget &&
					!hasExplicitPlanPayload &&
					hasEmittedPlanLoadingState
				) {
					emitPlanWidgetLoading(false);
				}

				// Generate mermaid fallback if plan widget was emitted but no dependency map.
				if (latestPlanPayload !== null && !hasValidMermaidDiagram(assistantText)) {
					const fallbackMermaid = generateMermaidFromPlan(latestPlanPayload);
					if (fallbackMermaid) {
						if (hasUnclosedMermaidFence(assistantText)) {
							emitTextDelta("\n```");
						}

						const prefix = assistantText.trim().length > 0 ? "\n\n" : "";
						emitTextDelta(`${prefix}${fallbackMermaid}`);
					}
				}

				// ── Output Routing: Two-step GenUI flow (BE-001, BE-007) ──
				// Trigger GenUI only for task-like prompts. Conversational and
				// capability chat should always stay in text streaming mode.
					const trimmedAssistantText = assistantText.trim();
					const getRouteToolsDetected = () => {
						if (!isStrictToolFirstTurn) {
							return hasObservedActionableToolCall || hasToolObservationEntries();
						}

						return (
							hasObservedRelevantActionableToolCall ||
							hasRelevantToolObservation(toolFirstExecutionState)
						);
					};
					const resolveRouteWidgetContentType = () =>
						resolveToolFirstWidgetContentType({
							primaryDomains: toolFirstPolicy.domains,
							relevanceDomains: toolFirstPolicy.relevanceDomains,
							lastRelevantToolName: toolFirstExecutionState.lastRelevantToolName,
							prompt: latestUserMessage,
						});
					const resolveRouteWidgetSource = () =>
						resolveToolFirstWidgetSource({
							primaryDomains: toolFirstPolicy.domains,
							relevanceDomains: toolFirstPolicy.relevanceDomains,
							lastRelevantToolName: toolFirstExecutionState.lastRelevantToolName,
							prompt: latestUserMessage,
						});
					const withRouteWidgetContentType = (payload) => {
						const widgetContentType = resolveRouteWidgetContentType();
						const widgetSource = resolveRouteWidgetSource();
						if (!widgetContentType && !widgetSource) {
							return payload;
						}

						const nextPayload = { ...payload };
						if (widgetContentType) {
							nextPayload.widgetContentType = widgetContentType;
						}

						if (widgetSource) {
							const currentSource = isPlainObject(payload?.source)
								? payload.source
								: null;
							const currentName = getNonEmptyString(currentSource?.name);
							const currentLogoSrc = getNonEmptyString(currentSource?.logoSrc);

							nextPayload.source = {
								name: currentName || widgetSource.name,
								...(currentLogoSrc || widgetSource.logoSrc
									? { logoSrc: currentLogoSrc || widgetSource.logoSrc }
									: {}),
							};
						}

						return {
							...nextPayload,
						};
					};
					const emitTwoStepFallbackGenuiWidget = ({
						widgetId,
						fallbackCause,
						observationFallbackCause = "tool_observation_fallback",
					}) => {
						const fallbackPayload = resolveDeterministicGenuiFallback({
							text: assistantText,
							prompt: latestUserMessage,
							defaultSummary: "Generated interactive summary from tool results.",
							defaultSource: "two-step-genui-fallback",
							observationSource: "tool-observation-fallback",
						});
						if (!fallbackPayload) {
							return false;
						}
						writer.write({
							type: "data-widget-data",
							id: widgetId,
							data: {
								type: SMART_WIDGET_TYPE_GENUI,
								payload: withRouteWidgetContentType({
									spec: fallbackPayload.spec,
									summary: fallbackPayload.summary,
									source: fallbackPayload.source,
								}),
							},
						});
						hasEmittedGenuiWidget = true;
						writer.write({
						type: "data-route-decision",
						data: {
							reason: "intent_task_toolable",
								experience: "generative_ui",
								timestamp: new Date().toISOString(),
								toolsDetected: getRouteToolsDetected(),
								fallbackCause: fallbackPayload.observationUsed
									? observationFallbackCause
									: fallbackCause,
							},
						});
						return true;
					};
					if (!isStrictToolFirstTurn) {
						const hasToolObservationData = hasToolObservationEntries();
						const looksLikeClarification = looksLikeClarificationResponse(trimmedAssistantText);
						const looksLikeInability = looksLikeInabilityResponse(trimmedAssistantText);
						if (looksLikeClarification && !hasEmittedQuestionCard) {
							console.info("[OUTPUT-ROUTING] Clarification-like response detected, skipping GenUI", {
								textLength: trimmedAssistantText.length,
							});
					}
						if (looksLikeInability) {
							console.info("[OUTPUT-ROUTING] Inability response detected, skipping GenUI", {
								textLength: trimmedAssistantText.length,
							});
						}
					const shouldAttemptGenui =
						!hasEmittedQuestionCard &&
						!looksLikeClarification &&
						!looksLikeInability &&
							!abortController.signal.aborted &&
							trimmedAssistantText.length > 0 &&
							isTaskLikeRequest &&
							(
								shouldForceCardFirstGenui ||
								hasObservedActionableToolCall ||
								hasToolObservationData
							);

					if (shouldAttemptGenui) {
						const twoStepGenuiWidgetId = `widget-two-step-genui-${Date.now()}`;
						writer.write({
							type: "data-widget-loading",
							id: twoStepGenuiWidgetId,
							data: {
								type: SMART_WIDGET_TYPE_GENUI,
								loading: true,
							},
						});

						const roleMessages = mapUiMessagesToRoleContent(messages);
						try {
							console.info("[OUTPUT-ROUTING] Two-step GenUI flow triggered", {
								hasActionableTools: hasObservedActionableToolCall,
								taskLikeRequest: isTaskLikeRequest,
								rovodevTextLength: trimmedAssistantText.length,
							});

							const genuiResult = await generateGenuiFromRovodevResponse({
								rovodevResponseText: assistantText,
								conversationMessages: roleMessages,
								layoutContext: smartLayoutContext,
								rovoDevAvailable: true,
								fallbackEnabled: false,
							});

							if (genuiResult.success && genuiResult.spec) {
								const summaryText = getNonEmptyString(genuiResult.narrative);
								writer.write({
									type: "data-widget-data",
									id: twoStepGenuiWidgetId,
									data: {
										type: SMART_WIDGET_TYPE_GENUI,
										payload: withRouteWidgetContentType({
											spec: genuiResult.spec,
											summary: summaryText
												? summaryText.length > 280
													? `${summaryText.slice(0, 279)}...`
													: summaryText
												: "Generated interactive view",
											source: "two-step-genui",
										}),
									},
								});
								hasEmittedGenuiWidget = true;

								// Emit route-decision: generative_ui experience
								writer.write({
									type: "data-route-decision",
									data: {
										reason: "intent_task_toolable",
										experience: "generative_ui",
										timestamp: new Date().toISOString(),
										toolsDetected: getRouteToolsDetected(),
									},
								});
							} else {
								console.warn("[OUTPUT-ROUTING] Two-step GenUI failed, using fallback card", {
									error: genuiResult.error,
								});
									const emittedCreateIntentWidget =
										await tryEmitCreateIntentDirectGenuiWidget({
											widgetId: twoStepGenuiWidgetId,
											roleMessages,
											source: "create-intent-direct-genui-after-two-step-failure",
										});
									if (emittedCreateIntentWidget) {
										writer.write({
											type: "data-route-decision",
											data: {
												reason: "intent_task_toolable",
												experience: "generative_ui",
												timestamp: new Date().toISOString(),
												toolsDetected: getRouteToolsDetected(),
												fallbackCause:
													"create_intent_direct_genui_after_two_step_failure",
											},
										});
									} else {
									const emittedFallbackWidget = emitTwoStepFallbackGenuiWidget({
										widgetId: twoStepGenuiWidgetId,
										fallbackCause: genuiResult.error || "genui-generation-failed",
										observationFallbackCause: "tool_observation_fallback",
									});
								if (!emittedFallbackWidget) {
									emitGenuiErrorTextFallback();
									writer.write({
										type: "data-route-decision",
										data: {
											reason: "fallback_ui_failed",
											experience: "text",
											timestamp: new Date().toISOString(),
											toolsDetected: getRouteToolsDetected(),
											fallbackCause:
												genuiResult.error || "genui-generation-failed",
											},
										});
									}
								}
							}
						} catch (twoStepError) {
							console.error(
								"[OUTPUT-ROUTING] Two-step GenUI exception, using fallback card:",
								twoStepError instanceof Error ? twoStepError.message : twoStepError
							);
								const emittedCreateIntentWidget =
									await tryEmitCreateIntentDirectGenuiWidget({
										widgetId: twoStepGenuiWidgetId,
										roleMessages,
										source: "create-intent-direct-genui-after-two-step-exception",
									});
								if (emittedCreateIntentWidget) {
									writer.write({
										type: "data-route-decision",
										data: {
											reason: "intent_task_toolable",
											experience: "generative_ui",
											timestamp: new Date().toISOString(),
											toolsDetected: getRouteToolsDetected(),
											fallbackCause:
												"create_intent_direct_genui_after_two_step_exception",
										},
									});
								} else {
								const emittedFallbackWidget = emitTwoStepFallbackGenuiWidget({
									widgetId: twoStepGenuiWidgetId,
									fallbackCause: twoStepError instanceof Error
										? twoStepError.message
										: "genui-generation-exception",
									observationFallbackCause:
										"tool_observation_fallback_after_genui_exception",
								});
							if (!emittedFallbackWidget) {
								emitGenuiErrorTextFallback();
								writer.write({
									type: "data-route-decision",
									data: {
										reason: "fallback_ui_failed",
										experience: "text",
										timestamp: new Date().toISOString(),
										toolsDetected: getRouteToolsDetected(),
										fallbackCause: twoStepError instanceof Error
											? twoStepError.message
											: "genui-generation-exception",
										},
									});
								}
								}
						} finally {
							writer.write({
								type: "data-widget-loading",
								id: twoStepGenuiWidgetId,
								data: {
									type: SMART_WIDGET_TYPE_GENUI,
									loading: false,
								},
							});
						}
						} else if (!hasEmittedQuestionCard) {
							const shouldEmitCardFirstFallback =
								shouldForceCardFirstGenui &&
								trimmedAssistantText.length > 0 &&
								!looksLikeClarification &&
								!looksLikeInability;
							const shouldEmitObservationFallback = hasToolObservationData;
							if (shouldEmitCardFirstFallback || shouldEmitObservationFallback) {
								const twoStepGenuiWidgetId = `widget-two-step-genui-${Date.now()}`;
								writer.write({
									type: "data-widget-loading",
								id: twoStepGenuiWidgetId,
								data: {
									type: SMART_WIDGET_TYPE_GENUI,
									loading: true,
								},
							});
								const emittedFallbackWidget = emitTwoStepFallbackGenuiWidget({
									widgetId: twoStepGenuiWidgetId,
									fallbackCause: shouldEmitObservationFallback
										? "tool_observation_fallback"
										: "card-first-fallback",
									observationFallbackCause: "tool_observation_fallback",
								});
							writer.write({
								type: "data-widget-loading",
								id: twoStepGenuiWidgetId,
								data: {
									type: SMART_WIDGET_TYPE_GENUI,
									loading: false,
								},
							});
							if (!emittedFallbackWidget) {
								emitGenuiErrorTextFallback();
								writer.write({
									type: "data-route-decision",
									data: {
											reason: "fallback_ui_failed",
											experience: "text",
											timestamp: new Date().toISOString(),
											toolsDetected: getRouteToolsDetected(),
											fallbackCause: shouldEmitObservationFallback
												? "tool_observation_fallback"
												: "card-first-fallback",
										},
									});
							}
						} else {
							// Short conversational reply or empty -> plain text route
							emitBufferedAssistantTextForTextRoute();
							writer.write({
								type: "data-route-decision",
								data: {
									reason: "intent_text_default",
									experience: "text",
									timestamp: new Date().toISOString(),
									toolsDetected: false,
								},
							});
						}
					}
					}
					// Question card route-decision is emitted at the point of
					// emission (emitRequestUserInputQuestionCard or fallback
					// extraction), so no additional emission is needed here.

					const strictRelevantToolObservationEntries = isStrictToolFirstTurn
						? toolObservationEntries.filter((entry) =>
							isToolNameRelevant({
								toolName: entry?.toolName,
								domains: toolFirstRelevanceDomains,
							})
						)
						: toolObservationEntries;

					if (isStrictToolFirstTurn && !hasEmittedQuestionCard) {
							let toolFirstRouteReason = "tool_first_no_relevant_result";
							let toolFirstRouteExperience = "text";
							let toolFirstFallbackCause = null;
							if (hasRelevantToolSuccess(toolFirstExecutionState)) {
							removeToolFirstFailureNarrative();
							const toolFirstSummaryPrefix =
								assistantText.trim().length > 0 ? "\n\n" : "";
							const toolFirstGenuiWidgetId = `widget-tool-first-genui-${Date.now()}`;
							writer.write({
								type: "data-widget-loading",
								id: toolFirstGenuiWidgetId,
								data: {
									type: SMART_WIDGET_TYPE_GENUI,
									loading: true,
								},
							});

							try {
								const roleMessages = mapUiMessagesToRoleContent(messages);
								const toolContextForGenui = buildToolContextForGenui({
									policy: toolFirstPolicy,
									execution: toolFirstExecutionState,
									assistantText,
									toolOutputs: toolFirstFullOutputs,
								});
								const roleMessagesForGenui = Array.isArray(roleMessages)
									? [...roleMessages]
									: [];
								if (toolContextForGenui) {
									roleMessagesForGenui.push({
										role: "assistant",
										content: toolContextForGenui,
									});
								}

								const genuiResult = await generateSmartGenuiResult({
									roleMessages: roleMessagesForGenui,
									provider,
									layoutContext: smartLayoutContext,
									signal: abortController.signal,
								});

								const narrativeSummary = getNonEmptyString(
									genuiResult.narrative
								);
								const conciseSummary = narrativeSummary
									? narrativeSummary.length > 320
										? `${narrativeSummary.slice(0, 319)}…`
										: narrativeSummary
									: null;
									const hasRenderableSpec = Boolean(genuiResult.spec);
									const isLowConfidenceSpec =
										hasRenderableSpec && genuiResult.quality === "low_confidence";
									const fallbackSummary =
										conciseSummary ||
										"Generated interactive summary from tool results.";
									const toolFirstFallbackPayload = resolveDeterministicGenuiFallback({
										text: toolContextForGenui || assistantText,
										prompt: latestUserMessage,
										title: "Tool results",
										description:
											"Generated from successful integration tool calls.",
										defaultSummary: fallbackSummary,
											defaultSource: isLowConfidenceSpec
												? "tool-first-quality-fallback"
												: "tool-first-genui-fallback",
											observationSource: isLowConfidenceSpec
												? "tool-observation-quality-fallback"
												: "tool-observation-fallback",
											observations: strictRelevantToolObservationEntries,
											allowTextFallback: false,
										});

								if (hasRenderableSpec && !isLowConfidenceSpec) {
									const renderedSummary =
										conciseSummary ||
										"Generated a visual summary from tool context below.";
									writer.write({
										type: "data-widget-data",
										id: toolFirstGenuiWidgetId,
										data: {
											type: SMART_WIDGET_TYPE_GENUI,
											payload: withRouteWidgetContentType({
												spec: genuiResult.spec,
												summary: renderedSummary,
												source: "tool-first-genui",
											}),
										},
									});
									hasEmittedGenuiWidget = true;
									toolFirstRouteReason = "intent_task_toolable";
									toolFirstRouteExperience = "generative_ui";

									emitForcedTextDelta(
										`${toolFirstSummaryPrefix}${renderedSummary}`
									);
									} else if (toolFirstFallbackPayload) {
										if (isLowConfidenceSpec) {
											console.warn(
												"[TOOL-FIRST] Replacing low-confidence GenUI spec with deterministic fallback",
											{
												domains: toolFirstPolicy.domainLabels,
												reasons: genuiResult.analysisSummary?.reasons,
												synthesizedChildCount:
													genuiResult.analysisSummary?.synthesizedChildCount ?? 0,
												missingChildKeyCount:
													genuiResult.analysisSummary?.missingChildKeyCount ?? 0,
												relevantToolResults:
													toolFirstExecutionState.relevantToolResults,
											}
										);
									}

										writer.write({
											type: "data-widget-data",
											id: toolFirstGenuiWidgetId,
											data: {
												type: SMART_WIDGET_TYPE_GENUI,
												payload: withRouteWidgetContentType({
													spec: toolFirstFallbackPayload.spec,
													summary: toolFirstFallbackPayload.summary,
													source: toolFirstFallbackPayload.source,
												}),
											},
										});
										hasEmittedGenuiWidget = true;
										toolFirstRouteReason = "intent_task_toolable";
										toolFirstRouteExperience = "generative_ui";
										toolFirstFallbackCause = toolFirstFallbackPayload.observationUsed
											? "tool_observation_fallback"
											: isLowConfidenceSpec
												? "tool_first_low_confidence_genui"
												: "missing_renderable_genui_spec";

										emitForcedTextDelta(
											`${toolFirstSummaryPrefix}${toolFirstFallbackPayload.summary}`
										);
									} else {
										toolFirstRouteReason = "tool_first_visual_fallback";
										toolFirstFallbackCause = isLowConfidenceSpec
											? "tool_first_low_confidence_genui_no_fallback"
											: "missing_renderable_genui_spec";
										writer.write({
											type: "data-route-decision",
											data: {
												reason: "fallback_ui_failed",
												experience: "text",
												timestamp: new Date().toISOString(),
												toolsDetected: true,
											},
										});
										emitForcedTextDelta(
											`${toolFirstSummaryPrefix}I couldn't produce a renderable interactive summary from tool output.`
										);
									}
								} catch (toolFirstGenuiError) {
									console.error(
										"[TOOL-FIRST] Post-tool GenUI generation failed:",
										toolFirstGenuiError
									);
									const catchFallbackPayload = resolveDeterministicGenuiFallback({
										text: assistantText,
										prompt: latestUserMessage,
											defaultSummary:
												"Generated interactive summary from tool results.",
											defaultSource: "tool-first-error-fallback",
											observationSource: "tool-observation-fallback",
											observations: strictRelevantToolObservationEntries,
											allowTextFallback: false,
										});
									if (catchFallbackPayload) {
										writer.write({
											type: "data-widget-data",
											id: toolFirstGenuiWidgetId,
											data: {
												type: SMART_WIDGET_TYPE_GENUI,
												payload: withRouteWidgetContentType({
													spec: catchFallbackPayload.spec,
													summary: catchFallbackPayload.summary,
													source: catchFallbackPayload.source,
												}),
											},
										});
										hasEmittedGenuiWidget = true;
										toolFirstRouteReason = "intent_task_toolable";
										toolFirstRouteExperience = "generative_ui";
										toolFirstFallbackCause = catchFallbackPayload.observationUsed
											? "tool_observation_fallback_after_genui_exception"
											: "tool_first_genui_exception_fallback";

										emitForcedTextDelta(
											`${toolFirstSummaryPrefix}${catchFallbackPayload.summary}`
										);
									} else {
										toolFirstRouteReason = "tool_first_visual_fallback";
										toolFirstFallbackCause =
											toolFirstGenuiError instanceof Error
												? toolFirstGenuiError.message
												: "tool-first-genui-error";
										writer.write({
											type: "data-route-decision",
											data: {
												reason: "fallback_ui_failed",
												experience: "text",
												timestamp: new Date().toISOString(),
												toolsDetected: true,
											},
										});
										emitForcedTextDelta(
											`${toolFirstSummaryPrefix}I couldn't produce a renderable interactive summary from tool output.`
										);
									}
								} finally {
								writer.write({
									type: "data-widget-loading",
									id: toolFirstGenuiWidgetId,
									data: {
										type: SMART_WIDGET_TYPE_GENUI,
										loading: false,
									},
								});
							}
							} else if (looksLikeInabilityResponse(assistantText.trim())) {
								console.info("[TOOL-FIRST] Inability response detected, skipping GenUI fallback card", {
									textLength: assistantText.trim().length,
								});
								toolFirstRouteReason = "tool_first_inability_detected";
								toolFirstRouteExperience = "text";
							} else {
								let emittedCreateIntentWidget = false;
								if (isCreateIntentRequestPrompt) {
									const toolFirstCreateWidgetId = `widget-tool-first-genui-${Date.now()}`;
									writer.write({
										type: "data-widget-loading",
										id: toolFirstCreateWidgetId,
										data: {
											type: SMART_WIDGET_TYPE_GENUI,
											loading: true,
										},
									});
									const roleMessages = mapUiMessagesToRoleContent(messages);
									emittedCreateIntentWidget =
										await tryEmitCreateIntentDirectGenuiWidget({
											widgetId: toolFirstCreateWidgetId,
											roleMessages,
											source:
												"create-intent-direct-genui-without-relevant-tool-success",
										});
									writer.write({
										type: "data-widget-loading",
										id: toolFirstCreateWidgetId,
										data: {
											type: SMART_WIDGET_TYPE_GENUI,
											loading: false,
										},
									});
								}

								if (emittedCreateIntentWidget) {
									toolFirstRouteReason = "intent_task_toolable";
									toolFirstRouteExperience = "generative_ui";
									toolFirstFallbackCause =
										"create_intent_direct_genui_without_relevant_tool_success";
								} else {
									removeToolFirstFailureNarrative();
									const toolFirstTextFallbackPayload = resolveDeterministicGenuiFallback({
										text: assistantText,
										prompt: latestUserMessage,
										defaultSummary:
											"Generated interactive summary from tool results.",
										defaultSource: "tool-first-genui-fallback",
										observationSource: "tool-observation-fallback",
										observations: strictRelevantToolObservationEntries,
										allowTextFallback: false,
									});

									if (toolFirstTextFallbackPayload) {
										const toolFirstFallbackWidgetId = `widget-tool-first-genui-${Date.now()}`;
										writer.write({
											type: "data-widget-loading",
											id: toolFirstFallbackWidgetId,
											data: {
												type: SMART_WIDGET_TYPE_GENUI,
												loading: true,
											},
										});
										writer.write({
											type: "data-widget-data",
											id: toolFirstFallbackWidgetId,
											data: {
												type: SMART_WIDGET_TYPE_GENUI,
												payload: withRouteWidgetContentType({
													spec: toolFirstTextFallbackPayload.spec,
													summary: toolFirstTextFallbackPayload.summary,
													source: toolFirstTextFallbackPayload.source,
												}),
											},
										});
										writer.write({
											type: "data-widget-loading",
											id: toolFirstFallbackWidgetId,
											data: {
												type: SMART_WIDGET_TYPE_GENUI,
												loading: false,
											},
										});
										hasEmittedGenuiWidget = true;
										toolFirstRouteReason = "intent_task_toolable";
										toolFirstRouteExperience = "generative_ui";
										toolFirstFallbackCause = toolFirstTextFallbackPayload.observationUsed
											? "tool_observation_fallback"
											: "no_relevant_tool_success_fallback_card";
									} else {
										const warningText = buildToolFirstTextFallback({
											policy: toolFirstPolicy,
											execution: toolFirstExecutionState,
											rovoDevFallback: false,
										});
										const toolFirstWarningPrefix =
											assistantText.trim().length > 0 ? "\n\n" : "";
										emitForcedTextDelta(`${toolFirstWarningPrefix}${warningText}`);
										toolFirstFallbackCause = "no_relevant_tool_success";
									}
								}
							}

						const resolvedToolFirstFallbackCause = (() => {
							const fallbackCause =
								typeof toolFirstFallbackCause === "string" &&
								toolFirstFallbackCause.trim().length > 0
									? toolFirstFallbackCause
									: null;
							const teamworkGraphTimeWindowActive =
								toolFirstPolicy?.teamworkGraphTimeWindow?.enabled === true;
							if (!teamworkGraphTimeWindowActive) {
								return fallbackCause;
							}

							if (toolFirstRouteExperience !== "generative_ui") {
								return fallbackCause;
							}

							if (hasRelevantToolSuccess(toolFirstExecutionState)) {
								return fallbackCause;
							}

							if (toolFirstExecutionState.lastRelevantErrorCategory === "validation") {
								return "twg_datetime_validation_to_jira_cql_fallback";
							}

							if (fallbackCause && fallbackCause.startsWith("tool_observation")) {
								return "twg_to_jira_cql_tool_observation_fallback";
							}

							return fallbackCause || "twg_to_jira_cql_fallback";
						})();

						writer.write({
							type: "data-route-decision",
							data: {
								reason: toolFirstRouteReason,
								experience: toolFirstRouteExperience,
								timestamp: new Date().toISOString(),
								toolsDetected: getRouteToolsDetected(),
								fallbackCause: resolvedToolFirstFallbackCause || undefined,
							},
						});

						console.info("[TOOL-FIRST] Execution summary", {
							domains: toolFirstPolicy.domains,
							relevanceDomains: toolFirstRelevanceDomains,
							domainLabels: toolFirstPolicy.domainLabels,
							attempts: toolFirstExecutionState.attempts,
							retriesUsed: toolFirstExecutionState.retriesUsed,
							relevantToolStarts: toolFirstExecutionState.relevantToolStarts,
							relevantToolResults: toolFirstExecutionState.relevantToolResults,
							relevantToolErrors: toolFirstExecutionState.relevantToolErrors,
							hadRelevantToolStart: toolFirstExecutionState.hadRelevantToolStart,
							lastRelevantToolName: toolFirstExecutionState.lastRelevantToolName,
							lastRelevantErrorCategory:
								toolFirstExecutionState.lastRelevantErrorCategory,
							fallbackUsed: !hasRelevantToolSuccess(toolFirstExecutionState),
						});
					}

					flushDeferredToolFirstText();

					if (textStarted) {
						writer.write({ type: "text-end", id: textId });
					}

				if (pendingQuestionCardLoadingWidgetId) {
					writer.write({
						type: "data-widget-loading",
						id: pendingQuestionCardLoadingWidgetId,
						data: {
							type: CLARIFICATION_WIDGET_TYPE,
							loading: false,
						},
					});
					pendingQuestionCardLoadingWidgetId = null;
				}

				// Log to orchestrator for cross-panel visibility (sticky port sessions only)
				if (typeof portIndex === "number") {
					try {
						orchestratorLog.append({
							portIndex,
							rovoPort:
								typeof resolvedRovoDevPort === "number"
									? resolvedRovoDevPort
									: strictPortAssignment?.rovoPort,
							userMessage: latestUserMessage,
							assistantResponse: assistantText,
						});
					} catch (logError) {
						console.warn("[ORCHESTRATOR] Failed to append log entry:", logError.message);
					}
				}

				// Skip suggestions if:
				// 1. The original request had queued prompts, OR
				// 2. A newer request has arrived for the same portIndex since this one started
				const isStaleRequest = typeof portIndex === "number" &&
					portIndexRequestTimestamps.get(portIndex) !== requestTimestamp;
				if (!hasQueuedPrompts && !isStaleRequest) {
					try {
						const suggestedQuestions = await generateSuggestedQuestions({
							message: latestUserMessage,
							conversationHistory,
							assistantResponse: assistantText,
							portIndex,
						});

						if (suggestedQuestions.length > 0) {
							writer.write({
								type: "data-suggested-questions",
								data: { questions: suggestedQuestions },
							});
						}
					} catch (error) {
						// Suggestions are best-effort — log but don't fail the response
						console.error("[SUGGESTIONS] Failed to generate:", error?.message || error);
					}
				}

				// ── Output Routing: Routing telemetry summary (BE-009) ──
				// Emit a structured summary log for every completed turn so
				// routing accuracy and fallback rate can be calculated.
				const toolsDetectedForTelemetry = isStrictToolFirstTurn
					? getRouteToolsDetected()
					: hasObservedActionableToolCall || hasObservedToolExecution;
				const routingTelemetry = {
					timestamp: new Date().toISOString(),
					experience: hasEmittedQuestionCard
						? "question_card"
						: hasEmittedGenuiWidget
							? "generative_ui"
							: "text",
					toolsDetected: toolsDetectedForTelemetry,
					questionCardEmitted: hasEmittedQuestionCard,
					planWidgetEmitted: hasEmittedPlanWidget,
					genuiWidgetEmitted: hasEmittedGenuiWidget,
					toolFirstMatched: isStrictToolFirstTurn,
					isPostClarification: isPostClarificationTurn,
					assistantTextLength: assistantText.length,
					portIndex,
				};
				console.info("[OUTPUT-ROUTING] Turn routing summary", routingTelemetry);

				// Signal that the entire turn (including post-stream work like
				// suggestions) is complete. The frontend uses this sentinel to
				// safely advance its prompt queue without racing the RovoDev
				// port cooldown period.
				writer.write({
					type: "data-turn-complete",
					data: { timestamp: new Date().toISOString() },
				});
			},
			onError: (error) => {
				if (error instanceof Error) {
					return error.message;
				}
				return "Failed to stream AI response";
			},
		});

		pipeUIMessageStreamToResponse({
			response: res,
			stream,
		});
	} catch (error) {
		console.error("Chat SDK API error:", error);
		return sendGatewayErrorResponse(res, error, "Failed to process chat request");
	}
});

app.post("/api/chat-cancel", async (req, res) => {
	try {
		const rawQueryPortIndex = Array.isArray(req.query?.portIndex)
			? req.query.portIndex[0]
			: req.query?.portIndex;
		const hasPortIndex = rawQueryPortIndex !== undefined;
		const parsedPortIndex = hasPortIndex
			? Number.parseInt(String(rawQueryPortIndex), 10)
			: null;

		let resolvedPort = null;
		if (hasPortIndex) {
			if (!Number.isInteger(parsedPortIndex) || parsedPortIndex < 0) {
				return res.status(400).json({
					cancelled: false,
					error: "portIndex must be a non-negative integer",
				});
			}

			try {
				const poolStatus = _rovoDevPool?.getStatus?.();
				const poolPorts = Array.isArray(poolStatus?.ports)
					? poolStatus.ports
							.map((entry) => entry?.port)
							.filter((port) => typeof port === "number" && Number.isInteger(port) && port > 0)
					: readRovoDevPorts();
				const strictAssignment = resolveStrictRovoDevPortAssignment(parsedPortIndex, {
					activePorts: poolPorts,
					poolStatus,
				});
				resolvedPort =
					typeof strictAssignment?.rovoPort === "number" &&
					Number.isInteger(strictAssignment.rovoPort) &&
					strictAssignment.rovoPort > 0
						? strictAssignment.rovoPort
						: null;
			} catch (error) {
				return res.status(400).json({
					cancelled: false,
					error: error instanceof Error ? error.message : String(error),
				});
			}
		}

		console.log(
			typeof resolvedPort === "number"
				? `[CHAT-CANCEL] Cancel requested for port ${resolvedPort}`
				: "[CHAT-CANCEL] Cancel requested"
		);
		if (typeof resolvedPort === "number") {
			await rovoDevCancelChat(resolvedPort);
		} else {
			await rovoDevCancelChat();
		}
		return res.status(200).json({
			cancelled: true,
			...(typeof parsedPortIndex === "number" ? { portIndex: parsedPortIndex } : {}),
			...(typeof resolvedPort === "number" ? { port: resolvedPort } : {}),
		});
	} catch (error) {
		console.error("[CHAT-CANCEL] Cancel error:", error.message || error);
		return res.status(200).json({ cancelled: false, error: error.message });
	}
});

// ── Output Routing: Question Card skip notification (BE-008) ──
// When the user dismisses/skips a Question Card, the frontend sends a
// notification here. The backend forwards a system message to RovoDev
// so it can decide how to respond (e.g., explain what info is needed
// or proceed with default assumptions).
app.post("/api/chat-sdk/skip-question", async (req, res) => {
	try {
		const {
			sessionId,
			questionTitle,
			portIndex: rawPortIndex,
			messages: rawMessages,
			contextDescription,
		} = req.body || {};

		const portIndex =
			typeof rawPortIndex === "number" && Number.isInteger(rawPortIndex) && rawPortIndex >= 0
				? rawPortIndex
				: undefined;

		const skipMessage = buildQuestionCardSkipNotification(
			typeof questionTitle === "string" ? questionTitle.trim() : undefined
		);

		// Build conversation history from messages for context
		const conversationHistory = Array.isArray(rawMessages)
			? rawMessages
					.filter(
						(msg) =>
							msg &&
							typeof msg === "object" &&
							(msg.role === "user" || msg.role === "assistant") &&
							typeof msg.content === "string" &&
							msg.content.trim().length > 0
					)
					.map((msg) => ({
						type: msg.role,
						content: msg.content.trim(),
					}))
					.slice(-10)
			: [];

		const userMessageText = buildUserMessage(
			skipMessage,
			conversationHistory,
			contextDescription || undefined
		);

		// Resolve the RovoDev port for this session
		let resolvedPort = undefined;
		if (typeof portIndex === "number") {
			try {
				const poolStatus = _rovoDevPool?.getStatus?.();
				const poolPorts = Array.isArray(poolStatus?.ports)
					? poolStatus.ports
							.map((entry) => entry?.port)
							.filter((port) => typeof port === "number" && Number.isInteger(port) && port > 0)
					: readRovoDevPorts();
				const strictAssignment = resolveStrictRovoDevPortAssignment(portIndex, {
					activePorts: poolPorts,
					poolStatus,
				});
				resolvedPort =
					typeof strictAssignment?.rovoPort === "number" &&
					Number.isInteger(strictAssignment.rovoPort) &&
					strictAssignment.rovoPort > 0
						? strictAssignment.rovoPort
						: undefined;
			} catch {
				// Fall through to pool-based routing
			}
		}

		console.info("[OUTPUT-ROUTING] Question card skip notification", {
			reason: "intent_clarification_skip",
			experience: "text",
			sessionId: typeof sessionId === "string" ? sessionId : undefined,
			questionTitle: typeof questionTitle === "string" ? questionTitle : undefined,
			portIndex,
			resolvedPort,
		});

		// Stream the skip notification to RovoDev and return RovoDev's response
		const stream = createUIMessageStream({
			execute: async ({ writer }) => {
				const textId = `skip-question-response-${Date.now()}`;
				let textStarted = false;

				try {
					await streamViaRovoDev({
						message: userMessageText,
						onTextDelta: (delta) => {
							if (!delta) return;
							if (!textStarted) {
								writer.write({ type: "text-start", id: textId });
								textStarted = true;
							}
							writer.write({
								type: "text-delta",
								id: textId,
								delta,
							});
						},
						onThinkingStatus: () => {},
						onThinkingEvent: () => {},
						onToolCallStart: () => {},
						conflictPolicy: "wait-for-turn",
						port: resolvedPort,
						portIndex,
					});
				} catch (error) {
					console.error(
						"[OUTPUT-ROUTING] Skip notification RovoDev error:",
						error instanceof Error ? error.message : error
					);
					// If RovoDev fails, provide a fallback response
					if (!textStarted) {
						writer.write({ type: "text-start", id: textId });
						textStarted = true;
					}
					writer.write({
						type: "text-delta",
						id: textId,
						delta: "I understand you'd like to skip the questions. Let me know how you'd like to proceed, or feel free to rephrase your request.",
					});
				}

				if (textStarted) {
					writer.write({ type: "text-end", id: textId });
				}

				// Emit route-decision for skip
				writer.write({
					type: "data-route-decision",
					data: {
						reason: "intent_clarification_skip",
						experience: "text",
						timestamp: new Date().toISOString(),
						toolsDetected: false,
					},
				});

				writer.write({
					type: "data-turn-complete",
					data: { timestamp: new Date().toISOString() },
				});
			},
			onError: (error) => {
				if (error instanceof Error) {
					return error.message;
				}
				return "Failed to process question skip notification";
			},
		});

		pipeUIMessageStreamToResponse({
			response: res,
			stream,
		});
	} catch (error) {
		console.error("[OUTPUT-ROUTING] Skip question error:", error);
		return res.status(500).json({
			error: "Failed to process question skip notification",
			details: error instanceof Error ? error.message : String(error),
		});
	}
});

app.post("/api/genui-chat", (req, res) =>
	genuiChatHandler(req, res, {
		isRovoDevAvailable,
		isAIGatewayFallbackEnabled: () => false,
		aiGatewayProvider,
	})
);

app.post("/api/sound-generation", async (req, res) => {
	try {
		const requestBody =
			req.body && typeof req.body === "object" ? { ...req.body } : {};
		const { payload: normalizedInput, mode: extractionMode } =
			resolveSpeechPayloadFromAudioRequest(requestBody.input, {
				maxChars: SOUND_GENERATION_INPUT_MAX_CHARS,
			});
		if (normalizedInput) {
			requestBody.input = normalizedInput;
		}

		console.info("[SOUND-GENERATION] Resolved speech payload", {
			extractionMode: extractionMode || null,
			hasInput: typeof requestBody.input === "string",
			payloadLength:
				typeof requestBody.input === "string" ? requestBody.input.length : 0,
		});

		const synthesisResult = await synthesizeSound(requestBody);
		const filename = `speech-${Date.now()}.${synthesisResult.extension}`;

		res.setHeader("Content-Type", synthesisResult.contentType);
		res.setHeader("Content-Length", String(synthesisResult.audioBytes.length));
		res.setHeader("Content-Disposition", `inline; filename="${filename}"`);
		return res.status(200).send(synthesisResult.audioBytes);
	} catch (error) {
		console.error("Sound generation API error:", error);
		const statusCode =
			typeof error?.statusCode === "number" ? error.statusCode : 500;
		return res.status(statusCode).json({
			error:
				statusCode >= 500
					? "Internal server error"
					: error instanceof Error
						? error.message
						: "Request failed",
			details: error instanceof Error ? error.message : String(error),
		});
	}
});

app.get("/api/image-proxy", async (req, res) => {
	const rawSrc = Array.isArray(req.query.src) ? req.query.src[0] : req.query.src;
	const { targetUrl, error } = parseImageProxyTarget(rawSrc);
	if (error) {
		return res.status(400).json({ error });
	}

	const abortController = new AbortController();
	const timeoutHandle = setTimeout(() => {
		abortController.abort();
	}, IMAGE_PROXY_TIMEOUT_MS);

	try {
		const upstreamResponse = await fetch(targetUrl.toString(), {
			method: "GET",
			headers: {
				Accept: "image/*",
				"User-Agent": "VPK-ImageProxy/1.0",
			},
			redirect: "follow",
			signal: abortController.signal,
		});

		if (!upstreamResponse.ok) {
			return res.status(502).json({
				error: `Image fetch failed (${upstreamResponse.status})`,
			});
		}

		const contentType =
			getNonEmptyString(upstreamResponse.headers.get("content-type")) ||
			"application/octet-stream";

		if (!contentType.toLowerCase().startsWith("image/")) {
			return res.status(502).json({
				error: "Upstream response is not an image",
			});
		}

		const payload = Buffer.from(await upstreamResponse.arrayBuffer());
		const upstreamCacheControl = getNonEmptyString(
			upstreamResponse.headers.get("cache-control")
		);

		res.setHeader("Content-Type", contentType);
		res.setHeader("Content-Length", String(payload.length));
		res.setHeader(
			"Cache-Control",
			upstreamCacheControl || "public, max-age=300, stale-while-revalidate=300"
		);

		return res.status(200).send(payload);
	} catch (error) {
		const isAbortError =
			typeof error === "object" &&
			error !== null &&
			"name" in error &&
			error.name === "AbortError";

		return res.status(isAbortError ? 504 : 502).json({
			error: isAbortError ? "Image fetch timed out" : "Image proxy failed",
		});
	} finally {
		clearTimeout(timeoutHandle);
	}
});

// ─── Orchestrator Log Endpoints ──────────────────────────────────────────────

app.get("/api/orchestrator/log", (req, res) => {
	try {
		const portIndex = req.query.portIndex !== undefined
			? parseInt(req.query.portIndex, 10)
			: undefined;
		const limit = req.query.limit !== undefined
			? parseInt(req.query.limit, 10)
			: undefined;

		const filter = {};
		if (typeof portIndex === "number" && !isNaN(portIndex) && portIndex >= 0) {
			filter.portIndex = portIndex;
		}
		if (typeof limit === "number" && !isNaN(limit) && limit > 0) {
			filter.limit = limit;
		}

		const entries = orchestratorLog.getEntries(
			Object.keys(filter).length > 0 ? filter : undefined
		);
		const stats = orchestratorLog.getStats();

		return res.json({ entries, stats });
	} catch (error) {
		console.error("[ORCHESTRATOR] Failed to get log:", error);
		return res.status(500).json({ error: "Failed to retrieve orchestrator log" });
	}
});

app.get("/api/orchestrator/timeline", (req, res) => {
	try {
		const portIndex = req.query.portIndex !== undefined
			? parseInt(req.query.portIndex, 10)
			: undefined;
		const limit = req.query.limit !== undefined
			? parseInt(req.query.limit, 10)
			: undefined;

		const filter = {};
		if (typeof portIndex === "number" && !isNaN(portIndex) && portIndex >= 0) {
			filter.portIndex = portIndex;
		}
		if (typeof limit === "number" && !isNaN(limit) && limit > 0) {
			filter.limit = limit;
		}

		const timeline = orchestratorLog.toTimeline(
			Object.keys(filter).length > 0 ? filter : undefined
		);
		const stats = orchestratorLog.getStats();

		return res.json({ timeline, stats });
	} catch (error) {
		console.error("[ORCHESTRATOR] Failed to get timeline:", error);
		return res.status(500).json({ error: "Failed to retrieve orchestrator timeline" });
	}
});

app.delete("/api/orchestrator/log", (_req, res) => {
	try {
		orchestratorLog.clear();
		return res.json({ ok: true, message: "Orchestrator log cleared" });
	} catch (error) {
		console.error("[ORCHESTRATOR] Failed to clear log:", error);
		return res.status(500).json({ error: "Failed to clear orchestrator log" });
	}
});

// ─── Agents Team Endpoints ──────────────────────────────────────────────────

app.post("/api/plan/runs", async (req, res) => {
	try {
		const {
			plan,
			userPrompt,
			conversation,
			customInstruction,
		} = req.body || {};

		const run = await planRunManager.createRun({
			plan,
			userPrompt,
			conversation,
			customInstruction,
		});
		return res.status(201).json({ run });
	} catch (error) {
		console.error("[AGENTS-RUN] Failed to create run:", error);
		const message = error instanceof Error ? error.message : "Failed to create run";
		return res.status(400).json({ error: message });
	}
});

app.get("/api/plan/runs", async (req, res) => {
	try {
		const rawLimit = Array.isArray(req.query.limit) ? req.query.limit[0] : req.query.limit;
		const runs = await planRunManager.listRuns({ limit: rawLimit });
		return res.status(200).json({ runs });
	} catch (error) {
		console.error("[AGENTS-RUN] Failed to list runs:", error);
		const message = error instanceof Error ? error.message : "Failed to list runs";
		return res.status(500).json({ error: message });
	}
});

app.get("/api/plan/runs/:runId", async (req, res) => {
	try {
		const runId = req.params.runId;
		const run = await planRunManager.getRun(runId);
		if (!run) {
			return res.status(404).json({ error: "Run not found" });
		}

		return res.status(200).json({ run });
	} catch (error) {
		console.error("[AGENTS-RUN] Failed to get run:", error);
		return res.status(500).json({ error: "Failed to load run" });
	}
});

app.delete("/api/plan/runs/:runId", async (req, res) => {
	try {
		const runId = req.params.runId;
		await planRunManager.deleteRun(runId);
		return res.status(200).json({ deleted: true });
	} catch (error) {
		console.error("[AGENTS-RUN] Failed to delete run:", error);
		return res.status(500).json({ error: "Failed to delete run" });
	}
});

app.get("/api/plan/threads", async (req, res) => {
	try {
		const rawLimit = Array.isArray(req.query.limit) ? req.query.limit[0] : req.query.limit;
		const limit = rawLimit ? Number(rawLimit) : undefined;
		const threads = await planThreadManager.listThreads({ limit });
		return res.status(200).json({ threads });
	} catch (error) {
		console.error("[AGENTS-THREAD] Failed to list threads:", error);
		const message = error instanceof Error ? error.message : "Failed to list threads";
		return res.status(500).json({ error: message });
	}
});

app.get("/api/plan/threads/:threadId", async (req, res) => {
	try {
		const threadId = req.params.threadId;
		const thread = await planThreadManager.getThread(threadId);
		if (!thread) {
			return res.status(404).json({ error: "Thread not found" });
		}

		return res.status(200).json({ thread });
	} catch (error) {
		console.error("[AGENTS-THREAD] Failed to get thread:", error);
		return res.status(500).json({ error: "Failed to load thread" });
	}
});

app.post("/api/plan/threads", async (req, res) => {
	try {
		const { id, title, messages, createdAt, updatedAt } = req.body || {};
		const thread = await planThreadManager.createThread({
			id,
			title,
			messages,
			createdAt,
			updatedAt,
		});
		return res.status(201).json({ thread });
	} catch (error) {
		console.error("[AGENTS-THREAD] Failed to create thread:", error);
		const message = error instanceof Error ? error.message : "Failed to create thread";
		return res.status(400).json({ error: message });
	}
});

app.put("/api/plan/threads/:threadId", async (req, res) => {
	try {
		const threadId = req.params.threadId;
		const { title, messages, updatedAt } = req.body || {};
		const thread = await planThreadManager.updateThread(threadId, {
			title,
			messages,
			updatedAt,
		});
		if (!thread) {
			return res.status(404).json({ error: "Thread not found" });
		}

		return res.status(200).json({ thread });
	} catch (error) {
		console.error("[AGENTS-THREAD] Failed to update thread:", error);
		return res.status(500).json({ error: "Failed to update thread" });
	}
});

app.delete("/api/plan/threads/:threadId", async (req, res) => {
	try {
		const threadId = req.params.threadId;
		await planThreadManager.deleteThread(threadId);
		return res.status(200).json({ deleted: true });
	} catch (error) {
		console.error("[AGENTS-THREAD] Failed to delete thread:", error);
		return res.status(500).json({ error: "Failed to delete thread" });
	}
});

app.post("/api/plan/runs/:runId/tasks", async (req, res) => {
	try {
		const runId = req.params.runId;
		const {
			planDelta,
			prompt,
			contextPrompt,
			conversation,
			customInstruction,
			retryTaskIds,
		} = req.body || {};
		const result = await planRunManager.appendTasks(runId, {
			planDelta,
			prompt,
			contextPrompt,
			conversation,
			customInstruction,
			retryTaskIds,
		});

		if (result?.error) {
			return res.status(400).json({ error: result.error });
		}

		return res.status(200).json(result);
	} catch (error) {
		console.error("[AGENTS-RUN] Failed to append run tasks:", error);
		const message = error instanceof Error ? error.message : "Failed to append tasks";
		return res.status(400).json({ error: message });
	}
});

app.get("/api/plan/runs/:runId/files", async (req, res) => {
	try {
		const runId = req.params.runId;
		const rawArtifactId = Array.isArray(req.query.id) ? req.query.id[0] : req.query.id;
		const artifactId = getNonEmptyString(rawArtifactId);
		const rawDownload = Array.isArray(req.query.download)
			? req.query.download[0]
			: req.query.download;
		const shouldDownload = rawDownload === "1" || rawDownload === "true";

		if (artifactId) {
			const artifactFile = await planRunManager.getRunFile(runId, artifactId);
			if (!artifactFile) {
				return res.status(404).json({ error: "Artifact not found" });
			}

			if (artifactFile.type === "redirect") {
				return res.redirect(artifactFile.url);
			}

			res.setHeader("Content-Type", artifactFile.mimeType || "application/octet-stream");
			res.setHeader("Content-Length", String(artifactFile.buffer.length));
			res.setHeader(
				"Content-Disposition",
				`${shouldDownload ? "attachment" : "inline"}; filename="${artifactFile.fileName}"`
			);
			return res.status(200).send(artifactFile.buffer);
		}

		const filesPayload = await planRunManager.getRunFiles(runId);
		if (!filesPayload) {
			return res.status(404).json({ error: "Run not found" });
		}

		return res.status(200).json(filesPayload);
	} catch (error) {
		console.error("[AGENTS-RUN] Failed to load run files:", error);
		const message = error instanceof Error ? error.message : "Failed to load run files";
		return res.status(500).json({ error: message });
	}
});

app.get("/api/plan/runs/:runId/stream", async (req, res) => {
	try {
		const runId = req.params.runId;
		await planRunManager.streamRunEvents(req, res, runId);
	} catch (error) {
		console.error("[AGENTS-RUN] Failed to stream run events:", error);
		if (!res.headersSent) {
			res.status(500).json({ error: "Failed to stream run events" });
		}
	}
});

app.post("/api/plan/runs/:runId/directives", async (req, res) => {
	try {
		const runId = req.params.runId;
		const { agentName, message } = req.body || {};
		const result = await planRunManager.addDirective(runId, {
			agentName,
			message,
		});

		if (result.error) {
			return res.status(400).json({ error: result.error });
		}

		return res.status(200).json(result);
	} catch (error) {
		console.error("[AGENTS-RUN] Failed to add directive:", error);
		return res.status(500).json({ error: "Failed to add directive" });
	}
});

app.post("/api/plan/runs/:runId/share", async (req, res) => {
	try {
		const runId = req.params.runId;
		const requestBody = req.body && typeof req.body === "object" ? req.body : {};
		const target = getNonEmptyString(requestBody.target)?.toLowerCase();
		if (target !== "confluence" && target !== "slack") {
			return res.status(400).json({
				error: "Invalid share target. Use 'confluence' or 'slack'.",
			});
		}

		const runSummary = await planRunManager.getRunSummary(runId);
		if (!runSummary || !runSummary.run) {
			return res.status(404).json({ error: "Run not found" });
		}

		const summaryContent = getNonEmptyString(runSummary.summary?.content);
		if (!summaryContent) {
			return res.status(409).json({
				error: "Final synthesis is not ready yet. Try again after summary generation completes.",
			});
		}

		if (target === "confluence") {
			const confluenceInput =
				requestBody.confluence && typeof requestBody.confluence === "object"
					? requestBody.confluence
					: {};
			const result = await createConfluenceSummaryPage({
				run: runSummary.run,
				summary: runSummary.summary,
				summaryContent,
				confluence: confluenceInput,
			});
			return res.status(200).json({
				ok: true,
				target: "confluence",
				externalUrl: result.externalUrl,
			});
		}

		const slackResult = await sendSlackSummaryDm({
			run: runSummary.run,
			summary: runSummary.summary,
			summaryContent,
		});
		return res.status(200).json({
			ok: true,
			target: "slack",
			messageTs: slackResult.messageTs,
		});
	} catch (error) {
		console.error("[AGENTS-RUN] Failed to share run summary:", error);
		const status = typeof error?.status === "number" ? error.status : 500;
		const message =
			error instanceof Error && error.message.trim()
				? error.message.trim()
				: "Failed to share run summary";
		return res.status(status).json({ error: message });
	}
});

app.get("/api/plan/runs/:runId/summary", async (req, res) => {
	try {
		const runId = req.params.runId;
		const summary = await planRunManager.getRunSummary(runId);
		if (!summary) {
			return res.status(404).json({ error: "Run not found" });
		}

		return res.status(200).json(summary);
	} catch (error) {
		console.error("[AGENTS-RUN] Failed to load run summary:", error);
		return res.status(500).json({ error: "Failed to load run summary" });
	}
});

app.get("/api/plan/runs/:runId/visual-summary", async (req, res) => {
	try {
		const runId = req.params.runId;
		const summary = await planRunManager.getRunVisualSummary(runId);
		if (!summary) {
			return res.status(404).json({ error: "Run not found" });
		}

		return res.status(200).json(summary);
	} catch (error) {
		console.error("[AGENTS-RUN] Failed to load run visual summary:", error);
		return res.status(500).json({ error: "Failed to load run visual summary" });
	}
});


// --- Tools list ---

app.get("/api/plan/tools", (req, res) => {
	// Returns available MCP tools. Stub for now — will be populated from MCP server discovery.
	return res.status(200).json({ tools: [] });
});

// --- Skills CRUD (filesystem-backed) ---

app.get("/api/plan/skills", (req, res) => {
	try {
		const skills = planFs.listSkills();
		return res.status(200).json({ skills });
	} catch (error) {
		console.error("[AGENTS-FS] Failed to list skills:", error);
		return res.status(500).json({ error: "Failed to list skills" });
	}
});

app.post("/api/plan/skills", (req, res) => {
	try {
		const contentType = req.headers["content-type"] || "";

		// Handle markdown import (raw SKILL.md content)
		if (contentType.includes("text/markdown")) {
			let rawContent = "";
			if (typeof req.body === "string") {
				rawContent = req.body;
			} else if (Buffer.isBuffer(req.body)) {
				rawContent = req.body.toString("utf8");
			} else {
				return res.status(400).json({ error: "Expected markdown content" });
			}

			const { frontmatter, body } = planFs.parseFrontmatter(rawContent);
			const name = frontmatter.name;
			const description = typeof frontmatter.description === "string" ? frontmatter.description : "";

			if (!name || typeof name !== "string") {
				return res.status(400).json({ error: "SKILL.md must have a 'name' field in frontmatter" });
			}

			const nameError = planFs.validateSkillName(name);
			if (nameError) {
				return res.status(400).json({ error: nameError });
			}

			if (planFs.skillExists(name)) {
				return res.status(409).json({ error: `A skill named "${name}" already exists` });
			}

			const extraFields = {};
			if (frontmatter.license) extraFields.license = frontmatter.license;
			if (frontmatter.compatibility) extraFields.compatibility = frontmatter.compatibility;
			if (frontmatter["allowed-tools"]) extraFields["allowed-tools"] = frontmatter["allowed-tools"];

			const skill = planFs.writeSkill(name, description, body.trim(), extraFields);
			return res.status(201).json({ skill });
		}

		const { name, description, content } = req.body || {};

		// Validate name
		const nameError = planFs.validateSkillName(name);
		if (nameError) {
			return res.status(400).json({ error: nameError });
		}
		if (!planFs.validatePathComponent(name)) {
			return res.status(400).json({ error: "Invalid skill name" });
		}

		// Validate description
		const descError = planFs.validateSkillDescription(description);
		if (descError) {
			return res.status(400).json({ error: descError });
		}

		// Check for conflicts
		if (planFs.skillExists(name)) {
			return res.status(409).json({ error: `A skill named "${name}" already exists` });
		}

		// Validate content length
		const resolvedContent = typeof content === "string" ? content.trim() : "";
		if (resolvedContent.length > planFs.SKILL_CONTENT_MAX) {
			return res.status(400).json({ error: `Content exceeds maximum length of ${planFs.SKILL_CONTENT_MAX} characters` });
		}

		const skill = planFs.writeSkill(name, description, resolvedContent);
		return res.status(201).json({ skill });
	} catch (error) {
		console.error("[AGENTS-FS] Failed to create skill:", error);
		const message = error instanceof Error ? error.message : "Failed to create skill";
		return res.status(500).json({ error: message });
	}
});

app.put("/api/plan/skills/:name", (req, res) => {
	try {
		const name = req.params.name;
		if (!planFs.validatePathComponent(name)) {
			return res.status(400).json({ error: "Invalid skill name" });
		}

		// Read existing skill
		const existing = planFs.getSkillByName(name);
		if (!existing) {
			return res.status(404).json({ error: `Skill not found: ${name}` });
		}

		// Merge updates
		const data = req.body || {};
		const updatedDescription = data.description !== undefined ? data.description : existing.description;
		const updatedContent = data.content !== undefined ? (typeof data.content === "string" ? data.content.trim() : "") : existing.content;

		// Validate if description changed
		if (data.description !== undefined) {
			const descError = planFs.validateSkillDescription(updatedDescription);
			if (descError) {
				return res.status(400).json({ error: descError });
			}
		}

		// Validate content length
		if (updatedContent.length > planFs.SKILL_CONTENT_MAX) {
			return res.status(400).json({ error: `Content exceeds maximum length of ${planFs.SKILL_CONTENT_MAX} characters` });
		}

		// Preserve extra fields from existing skill
		const extraFields = {};
		if (existing.license) extraFields.license = existing.license;
		if (existing.compatibility) extraFields.compatibility = existing.compatibility;
		if (existing.allowedTools) extraFields["allowed-tools"] = existing.allowedTools;

		const skill = planFs.writeSkill(name, updatedDescription, updatedContent, extraFields);
		return res.status(200).json({ skill });
	} catch (error) {
		console.error("[AGENTS-FS] Failed to update skill:", error);
		const message = error instanceof Error ? error.message : "Failed to update skill";
		return res.status(500).json({ error: message });
	}
});

app.delete("/api/plan/skills/:name", (req, res) => {
	try {
		const name = req.params.name;
		if (!planFs.validatePathComponent(name)) {
			return res.status(400).json({ error: "Invalid skill name" });
		}
		planFs.deleteSkill(name);
		return res.status(200).json({ success: true });
	} catch (error) {
		console.error("[AGENTS-FS] Failed to delete skill:", error);
		const message = error instanceof Error ? error.message : "Failed to delete skill";
		return res.status(error.message?.includes("not found") ? 404 : 500).json({ error: message });
	}
});

app.get("/api/plan/skills/:name/raw", (req, res) => {
	try {
		const name = req.params.name;
		if (!planFs.validatePathComponent(name)) {
			return res.status(400).json({ error: "Invalid skill name" });
		}
		const raw = planFs.readSkillRaw(name);
		if (!raw) {
			return res.status(404).json({ error: `Skill not found: ${name}` });
		}
		res.setHeader("Content-Type", "text/markdown; charset=utf-8");
		return res.status(200).send(raw);
	} catch (error) {
		console.error("[AGENTS-FS] Failed to read skill raw:", error);
		return res.status(500).json({ error: "Failed to read skill" });
	}
});

// --- Agents/Subagents CRUD (filesystem-backed) ---

app.get("/api/plan/agents", (req, res) => {
	try {
		const agents = planFs.listAgents();
		return res.status(200).json({ agents });
	} catch (error) {
		console.error("[AGENTS-FS] Failed to list agents:", error);
		return res.status(500).json({ error: "Failed to list agents" });
	}
});

app.post("/api/plan/agents", (req, res) => {
	try {
		const contentType = req.headers["content-type"] || "";

		// Handle markdown import (raw agent .md content)
		if (contentType.includes("text/markdown")) {
			let rawContent = "";
			if (typeof req.body === "string") {
				rawContent = req.body;
			} else if (Buffer.isBuffer(req.body)) {
				rawContent = req.body.toString("utf8");
			} else {
				return res.status(400).json({ error: "Expected markdown content" });
			}

			const { frontmatter, body } = planFs.parseFrontmatter(rawContent);
			const name = frontmatter.name;

			if (!name || typeof name !== "string") {
				return res.status(400).json({ error: "Agent .md must have a 'name' field in frontmatter" });
			}

			const nameError = planFs.validateAgentName(name);
			if (nameError) {
				return res.status(400).json({ error: nameError });
			}

			if (planFs.agentExists(name)) {
				return res.status(409).json({ error: `An agent named "${name}" already exists` });
			}

			// Parse tools and skills from frontmatter
			let tools = [];
			if (frontmatter.tools) {
				if (Array.isArray(frontmatter.tools)) {
					tools = frontmatter.tools.map((t) => String(t).trim()).filter(Boolean);
				} else if (typeof frontmatter.tools === "string") {
					tools = frontmatter.tools.split(",").map((t) => t.trim()).filter(Boolean);
				}
			}

			let skills = [];
			if (frontmatter.skills) {
				if (Array.isArray(frontmatter.skills)) {
					skills = frontmatter.skills.map((s) => String(s).trim()).filter(Boolean);
				} else if (typeof frontmatter.skills === "string") {
					skills = frontmatter.skills.split(",").map((s) => s.trim()).filter(Boolean);
				}
			}

			let disallowedTools = [];
			if (frontmatter.disallowedTools) {
				if (Array.isArray(frontmatter.disallowedTools)) {
					disallowedTools = frontmatter.disallowedTools.map((t) => String(t).trim()).filter(Boolean);
				} else if (typeof frontmatter.disallowedTools === "string") {
					disallowedTools = frontmatter.disallowedTools.split(",").map((t) => t.trim()).filter(Boolean);
				}
			}

			const agent = planFs.writeAgent(name, {
				description: typeof frontmatter.description === "string" ? frontmatter.description.trim() : "",
				systemPrompt: body.trim(),
				model: typeof frontmatter.model === "string" && frontmatter.model.trim() ? frontmatter.model.trim() : "inherit",
				tools,
				disallowedTools,
				skills,
				maxTurns: frontmatter.maxTurns ? parseInt(String(frontmatter.maxTurns), 10) : undefined,
				permissionMode: typeof frontmatter.permissionMode === "string" && frontmatter.permissionMode.trim() ? frontmatter.permissionMode.trim() : undefined,
			});
			return res.status(201).json({ agent });
		}

		const { name, description, systemPrompt, model, tools, skills, disallowedTools, maxTurns, permissionMode } = req.body || {};

		// Validate name
		const nameError = planFs.validateAgentName(name);
		if (nameError) {
			return res.status(400).json({ error: nameError });
		}
		if (!planFs.validatePathComponent(name)) {
			return res.status(400).json({ error: "Invalid agent name" });
		}

		// Validate description
		if (!description || typeof description !== "string" || !description.trim()) {
			return res.status(400).json({ error: "Description is required" });
		}

		// Check for conflicts
		if (planFs.agentExists(name)) {
			return res.status(409).json({ error: `An agent named "${name}" already exists` });
		}

		const agent = planFs.writeAgent(name, {
			description: description.trim(),
			systemPrompt: typeof systemPrompt === "string" ? systemPrompt.trim() : "",
			model: typeof model === "string" && model.trim() ? model.trim() : "inherit",
			tools: Array.isArray(tools) ? tools.filter((t) => typeof t === "string" && t.trim()).map((t) => t.trim()) : [],
			disallowedTools: Array.isArray(disallowedTools) ? disallowedTools.filter((t) => typeof t === "string" && t.trim()).map((t) => t.trim()) : [],
			skills: Array.isArray(skills) ? skills.filter((s) => typeof s === "string" && s.trim()).map((s) => s.trim()) : [],
			maxTurns: typeof maxTurns === "number" && Number.isInteger(maxTurns) && maxTurns > 0 ? maxTurns : undefined,
			permissionMode: typeof permissionMode === "string" && permissionMode.trim() ? permissionMode.trim() : undefined,
		});
		return res.status(201).json({ agent });
	} catch (error) {
		console.error("[AGENTS-FS] Failed to create agent:", error);
		const message = error instanceof Error ? error.message : "Failed to create agent";
		return res.status(500).json({ error: message });
	}
});

app.put("/api/plan/agents/:name", (req, res) => {
	try {
		const name = req.params.name;
		if (!planFs.validatePathComponent(name)) {
			return res.status(400).json({ error: "Invalid agent name" });
		}

		// Read existing agent
		const existing = planFs.getAgentByName(name);
		if (!existing) {
			return res.status(404).json({ error: `Agent not found: ${name}` });
		}

		// Merge updates
		const data = req.body || {};
		const updated = {
			description: data.description !== undefined ? (typeof data.description === "string" ? data.description.trim() : existing.description) : existing.description,
			systemPrompt: data.systemPrompt !== undefined ? (typeof data.systemPrompt === "string" ? data.systemPrompt.trim() : "") : existing.systemPrompt,
			model: data.model !== undefined ? (typeof data.model === "string" && data.model.trim() ? data.model.trim() : existing.model) : existing.model,
			tools: data.tools !== undefined ? (Array.isArray(data.tools) ? data.tools.filter((t) => typeof t === "string" && t.trim()).map((t) => t.trim()) : existing.tools) : existing.tools,
			disallowedTools: data.disallowedTools !== undefined ? (Array.isArray(data.disallowedTools) ? data.disallowedTools.filter((t) => typeof t === "string" && t.trim()).map((t) => t.trim()) : existing.disallowedTools) : existing.disallowedTools,
			skills: data.skills !== undefined ? (Array.isArray(data.skills) ? data.skills.filter((s) => typeof s === "string" && s.trim()).map((s) => s.trim()) : existing.skills) : existing.skills,
			maxTurns: data.maxTurns !== undefined ? (typeof data.maxTurns === "number" && Number.isInteger(data.maxTurns) && data.maxTurns > 0 ? data.maxTurns : undefined) : existing.maxTurns,
			permissionMode: data.permissionMode !== undefined ? (typeof data.permissionMode === "string" && data.permissionMode.trim() ? data.permissionMode.trim() : undefined) : existing.permissionMode,
		};

		// Validate description if changed
		if (data.description !== undefined && (!updated.description || !updated.description.trim())) {
			return res.status(400).json({ error: "Description is required" });
		}

		const agent = planFs.writeAgent(name, updated);
		return res.status(200).json({ agent });
	} catch (error) {
		console.error("[AGENTS-FS] Failed to update agent:", error);
		const message = error instanceof Error ? error.message : "Failed to update agent";
		return res.status(500).json({ error: message });
	}
});

app.delete("/api/plan/agents/:name", (req, res) => {
	try {
		const name = req.params.name;
		if (!planFs.validatePathComponent(name)) {
			return res.status(400).json({ error: "Invalid agent name" });
		}
		planFs.deleteAgent(name);
		return res.status(200).json({ success: true });
	} catch (error) {
		console.error("[AGENTS-FS] Failed to delete agent:", error);
		const message = error instanceof Error ? error.message : "Failed to delete agent";
		return res.status(error.message?.includes("not found") ? 404 : 500).json({ error: message });
	}
});

app.get("/api/plan/agents/:name/raw", (req, res) => {
	try {
		const name = req.params.name;
		if (!planFs.validatePathComponent(name)) {
			return res.status(400).json({ error: "Invalid agent name" });
		}
		const raw = planFs.readAgentRaw(name);
		if (!raw) {
			return res.status(404).json({ error: `Agent not found: ${name}` });
		}
		res.setHeader("Content-Type", "text/markdown; charset=utf-8");
		return res.status(200).send(raw);
	} catch (error) {
		console.error("[AGENTS-FS] Failed to read agent raw:", error);
		return res.status(500).json({ error: "Failed to read agent" });
	}
});

// --- Config summary (for plan context injection) ---

app.get("/api/plan/config-summary", (req, res) => {
	try {
		const summary = planFs.getConfigSummary();
		return res.status(200).json({ summary });
	} catch (error) {
		console.error("[AGENTS-FS] Failed to get config summary:", error);
		return res.status(500).json({ error: "Failed to get config summary" });
	}
});

// ─── Maker Endpoints ──────────────────────────────────────────────────

app.post("/api/maker/runs", async (req, res) => {
	try {
		const {
			plan,
			userPrompt,
			conversation,
			customInstruction,
		} = req.body || {};

		const run = await makerRunManager.createRun({
			plan,
			userPrompt,
			conversation,
			customInstruction,
		});
		return res.status(201).json({ run });
	} catch (error) {
		console.error("[MAKER-RUN] Failed to create run:", error);
		const message = error instanceof Error ? error.message : "Failed to create run";
		return res.status(400).json({ error: message });
	}
});

app.get("/api/maker/runs", async (req, res) => {
	try {
		const rawLimit = Array.isArray(req.query.limit) ? req.query.limit[0] : req.query.limit;
		const runs = await makerRunManager.listRuns({ limit: rawLimit });
		return res.status(200).json({ runs });
	} catch (error) {
		console.error("[MAKER-RUN] Failed to list runs:", error);
		const message = error instanceof Error ? error.message : "Failed to list runs";
		return res.status(500).json({ error: message });
	}
});

app.get("/api/maker/runs/:runId", async (req, res) => {
	try {
		const runId = req.params.runId;
		const run = await makerRunManager.getRun(runId);
		if (!run) {
			return res.status(404).json({ error: "Run not found" });
		}

		return res.status(200).json({ run });
	} catch (error) {
		console.error("[MAKER-RUN] Failed to get run:", error);
		return res.status(500).json({ error: "Failed to load run" });
	}
});

app.delete("/api/maker/runs/:runId", async (req, res) => {
	try {
		const runId = req.params.runId;
		await makerRunManager.deleteRun(runId);
		return res.status(200).json({ deleted: true });
	} catch (error) {
		console.error("[MAKER-RUN] Failed to delete run:", error);
		return res.status(500).json({ error: "Failed to delete run" });
	}
});

app.get("/api/maker/threads", async (req, res) => {
	try {
		const rawLimit = Array.isArray(req.query.limit) ? req.query.limit[0] : req.query.limit;
		const limit = rawLimit ? Number(rawLimit) : undefined;
		const threads = await makerThreadManager.listThreads({ limit });
		return res.status(200).json({ threads });
	} catch (error) {
		console.error("[MAKER-THREAD] Failed to list threads:", error);
		const message = error instanceof Error ? error.message : "Failed to list threads";
		return res.status(500).json({ error: message });
	}
});

app.get("/api/maker/threads/:threadId", async (req, res) => {
	try {
		const threadId = req.params.threadId;
		const thread = await makerThreadManager.getThread(threadId);
		if (!thread) {
			return res.status(404).json({ error: "Thread not found" });
		}

		return res.status(200).json({ thread });
	} catch (error) {
		console.error("[MAKER-THREAD] Failed to get thread:", error);
		return res.status(500).json({ error: "Failed to load thread" });
	}
});

app.post("/api/maker/threads", async (req, res) => {
	try {
		const { id, title, messages, createdAt, updatedAt } = req.body || {};
		const thread = await makerThreadManager.createThread({
			id,
			title,
			messages,
			createdAt,
			updatedAt,
		});
		return res.status(201).json({ thread });
	} catch (error) {
		console.error("[MAKER-THREAD] Failed to create thread:", error);
		const message = error instanceof Error ? error.message : "Failed to create thread";
		return res.status(400).json({ error: message });
	}
});

app.put("/api/maker/threads/:threadId", async (req, res) => {
	try {
		const threadId = req.params.threadId;
		const { title, messages, updatedAt } = req.body || {};
		const thread = await makerThreadManager.updateThread(threadId, {
			title,
			messages,
			updatedAt,
		});
		if (!thread) {
			return res.status(404).json({ error: "Thread not found" });
		}

		return res.status(200).json({ thread });
	} catch (error) {
		console.error("[MAKER-THREAD] Failed to update thread:", error);
		return res.status(500).json({ error: "Failed to update thread" });
	}
});

app.delete("/api/maker/threads/:threadId", async (req, res) => {
	try {
		const threadId = req.params.threadId;
		await makerThreadManager.deleteThread(threadId);
		return res.status(200).json({ deleted: true });
	} catch (error) {
		console.error("[MAKER-THREAD] Failed to delete thread:", error);
		return res.status(500).json({ error: "Failed to delete thread" });
	}
});

app.post("/api/maker/runs/:runId/tasks", async (req, res) => {
	try {
		const runId = req.params.runId;
		const {
			planDelta,
			prompt,
			contextPrompt,
			conversation,
			customInstruction,
			retryTaskIds,
		} = req.body || {};
		const result = await makerRunManager.appendTasks(runId, {
			planDelta,
			prompt,
			contextPrompt,
			conversation,
			customInstruction,
			retryTaskIds,
		});

		if (result?.error) {
			return res.status(400).json({ error: result.error });
		}

		return res.status(200).json(result);
	} catch (error) {
		console.error("[MAKER-RUN] Failed to append run tasks:", error);
		const message = error instanceof Error ? error.message : "Failed to append tasks";
		return res.status(400).json({ error: message });
	}
});

app.get("/api/maker/runs/:runId/files", async (req, res) => {
	try {
		const runId = req.params.runId;
		const rawArtifactId = Array.isArray(req.query.id) ? req.query.id[0] : req.query.id;
		const artifactId = getNonEmptyString(rawArtifactId);
		const rawDownload = Array.isArray(req.query.download)
			? req.query.download[0]
			: req.query.download;
		const shouldDownload = rawDownload === "1" || rawDownload === "true";

		if (artifactId) {
			const artifactFile = await makerRunManager.getRunFile(runId, artifactId);
			if (!artifactFile) {
				return res.status(404).json({ error: "Artifact not found" });
			}

			if (artifactFile.type === "redirect") {
				return res.redirect(artifactFile.url);
			}

			res.setHeader("Content-Type", artifactFile.mimeType || "application/octet-stream");
			res.setHeader("Content-Length", String(artifactFile.buffer.length));
			res.setHeader(
				"Content-Disposition",
				`${shouldDownload ? "attachment" : "inline"}; filename="${artifactFile.fileName}"`
			);
			return res.status(200).send(artifactFile.buffer);
		}

		const filesPayload = await makerRunManager.getRunFiles(runId);
		if (!filesPayload) {
			return res.status(404).json({ error: "Run not found" });
		}

		return res.status(200).json(filesPayload);
	} catch (error) {
		console.error("[MAKER-RUN] Failed to load run files:", error);
		const message = error instanceof Error ? error.message : "Failed to load run files";
		return res.status(500).json({ error: message });
	}
});

app.get("/api/maker/runs/:runId/stream", async (req, res) => {
	try {
		const runId = req.params.runId;
		await makerRunManager.streamRunEvents(req, res, runId);
	} catch (error) {
		console.error("[MAKER-RUN] Failed to stream run events:", error);
		if (!res.headersSent) {
			res.status(500).json({ error: "Failed to stream run events" });
		}
	}
});

app.post("/api/maker/runs/:runId/directives", async (req, res) => {
	try {
		const runId = req.params.runId;
		const { agentName, message } = req.body || {};
		const result = await makerRunManager.addDirective(runId, {
			agentName,
			message,
		});

		if (result.error) {
			return res.status(400).json({ error: result.error });
		}

		return res.status(200).json(result);
	} catch (error) {
		console.error("[MAKER-RUN] Failed to add directive:", error);
		return res.status(500).json({ error: "Failed to add directive" });
	}
});

app.post("/api/maker/runs/:runId/share", async (req, res) => {
	try {
		const runId = req.params.runId;
		const requestBody = req.body && typeof req.body === "object" ? req.body : {};
		const target = getNonEmptyString(requestBody.target)?.toLowerCase();
		if (target !== "confluence" && target !== "slack") {
			return res.status(400).json({
				error: "Invalid share target. Use 'confluence' or 'slack'.",
			});
		}

		const runSummary = await makerRunManager.getRunSummary(runId);
		if (!runSummary || !runSummary.run) {
			return res.status(404).json({ error: "Run not found" });
		}

		const summaryContent = getNonEmptyString(runSummary.summary?.content);
		if (!summaryContent) {
			return res.status(409).json({
				error: "Final synthesis is not ready yet. Try again after summary generation completes.",
			});
		}

		if (target === "confluence") {
			const confluenceInput =
				requestBody.confluence && typeof requestBody.confluence === "object"
					? requestBody.confluence
					: {};
			const result = await createConfluenceSummaryPage({
				run: runSummary.run,
				summary: runSummary.summary,
				summaryContent,
				confluence: confluenceInput,
			});
			return res.status(200).json({
				ok: true,
				target: "confluence",
				externalUrl: result.externalUrl,
			});
		}

		const slackResult = await sendSlackSummaryDm({
			run: runSummary.run,
			summary: runSummary.summary,
			summaryContent,
		});
		return res.status(200).json({
			ok: true,
			target: "slack",
			messageTs: slackResult.messageTs,
		});
	} catch (error) {
		console.error("[MAKER-RUN] Failed to share run summary:", error);
		const status = typeof error?.status === "number" ? error.status : 500;
		const message =
			error instanceof Error && error.message.trim()
				? error.message.trim()
				: "Failed to share run summary";
		return res.status(status).json({ error: message });
	}
});

app.get("/api/maker/runs/:runId/summary", async (req, res) => {
	try {
		const runId = req.params.runId;
		const summary = await makerRunManager.getRunSummary(runId);
		if (!summary) {
			return res.status(404).json({ error: "Run not found" });
		}

		return res.status(200).json(summary);
	} catch (error) {
		console.error("[MAKER-RUN] Failed to load run summary:", error);
		return res.status(500).json({ error: "Failed to load run summary" });
	}
});

app.get("/api/maker/runs/:runId/visual-summary", async (req, res) => {
	try {
		const runId = req.params.runId;
		const summary = await makerRunManager.getRunVisualSummary(runId);
		if (!summary) {
			return res.status(404).json({ error: "Run not found" });
		}

		return res.status(200).json(summary);
	} catch (error) {
		console.error("[MAKER-RUN] Failed to load run visual summary:", error);
		return res.status(500).json({ error: "Failed to load run visual summary" });
	}
});


// --- Tools list ---

app.get("/api/maker/tools", (req, res) => {
	// Returns available MCP tools. Stub for now — will be populated from MCP server discovery.
	return res.status(200).json({ tools: [] });
});

// --- Skills CRUD (filesystem-backed) ---

app.get("/api/maker/skills", (req, res) => {
	try {
		const skills = makerFs.listSkills();
		return res.status(200).json({ skills });
	} catch (error) {
		console.error("[MAKER-FS] Failed to list skills:", error);
		return res.status(500).json({ error: "Failed to list skills" });
	}
});

app.post("/api/maker/skills", (req, res) => {
	try {
		const contentType = req.headers["content-type"] || "";

		// Handle markdown import (raw SKILL.md content)
		if (contentType.includes("text/markdown")) {
			let rawContent = "";
			if (typeof req.body === "string") {
				rawContent = req.body;
			} else if (Buffer.isBuffer(req.body)) {
				rawContent = req.body.toString("utf8");
			} else {
				return res.status(400).json({ error: "Expected markdown content" });
			}

			const { frontmatter, body } = makerFs.parseFrontmatter(rawContent);
			const name = frontmatter.name;
			const description = typeof frontmatter.description === "string" ? frontmatter.description : "";

			if (!name || typeof name !== "string") {
				return res.status(400).json({ error: "SKILL.md must have a 'name' field in frontmatter" });
			}

			const nameError = makerFs.validateSkillName(name);
			if (nameError) {
				return res.status(400).json({ error: nameError });
			}

			if (makerFs.skillExists(name)) {
				return res.status(409).json({ error: `A skill named "${name}" already exists` });
			}

			const extraFields = {};
			if (frontmatter.license) extraFields.license = frontmatter.license;
			if (frontmatter.compatibility) extraFields.compatibility = frontmatter.compatibility;
			if (frontmatter["allowed-tools"]) extraFields["allowed-tools"] = frontmatter["allowed-tools"];

			const skill = makerFs.writeSkill(name, description, body.trim(), extraFields);
			return res.status(201).json({ skill });
		}

		const { name, description, content } = req.body || {};

		// Validate name
		const nameError = makerFs.validateSkillName(name);
		if (nameError) {
			return res.status(400).json({ error: nameError });
		}
		if (!makerFs.validatePathComponent(name)) {
			return res.status(400).json({ error: "Invalid skill name" });
		}

		// Validate description
		const descError = makerFs.validateSkillDescription(description);
		if (descError) {
			return res.status(400).json({ error: descError });
		}

		// Check for conflicts
		if (makerFs.skillExists(name)) {
			return res.status(409).json({ error: `A skill named "${name}" already exists` });
		}

		// Validate content length
		const resolvedContent = typeof content === "string" ? content.trim() : "";
		if (resolvedContent.length > makerFs.SKILL_CONTENT_MAX) {
			return res.status(400).json({ error: `Content exceeds maximum length of ${makerFs.SKILL_CONTENT_MAX} characters` });
		}

		const skill = makerFs.writeSkill(name, description, resolvedContent);
		return res.status(201).json({ skill });
	} catch (error) {
		console.error("[MAKER-FS] Failed to create skill:", error);
		const message = error instanceof Error ? error.message : "Failed to create skill";
		return res.status(500).json({ error: message });
	}
});

app.put("/api/maker/skills/:name", (req, res) => {
	try {
		const name = req.params.name;
		if (!makerFs.validatePathComponent(name)) {
			return res.status(400).json({ error: "Invalid skill name" });
		}

		// Read existing skill
		const existing = makerFs.getSkillByName(name);
		if (!existing) {
			return res.status(404).json({ error: `Skill not found: ${name}` });
		}

		// Merge updates
		const data = req.body || {};
		const updatedDescription = data.description !== undefined ? data.description : existing.description;
		const updatedContent = data.content !== undefined ? (typeof data.content === "string" ? data.content.trim() : "") : existing.content;

		// Validate if description changed
		if (data.description !== undefined) {
			const descError = makerFs.validateSkillDescription(updatedDescription);
			if (descError) {
				return res.status(400).json({ error: descError });
			}
		}

		// Validate content length
		if (updatedContent.length > makerFs.SKILL_CONTENT_MAX) {
			return res.status(400).json({ error: `Content exceeds maximum length of ${makerFs.SKILL_CONTENT_MAX} characters` });
		}

		// Preserve extra fields from existing skill
		const extraFields = {};
		if (existing.license) extraFields.license = existing.license;
		if (existing.compatibility) extraFields.compatibility = existing.compatibility;
		if (existing.allowedTools) extraFields["allowed-tools"] = existing.allowedTools;

		const skill = makerFs.writeSkill(name, updatedDescription, updatedContent, extraFields);
		return res.status(200).json({ skill });
	} catch (error) {
		console.error("[MAKER-FS] Failed to update skill:", error);
		const message = error instanceof Error ? error.message : "Failed to update skill";
		return res.status(500).json({ error: message });
	}
});

app.delete("/api/maker/skills/:name", (req, res) => {
	try {
		const name = req.params.name;
		if (!makerFs.validatePathComponent(name)) {
			return res.status(400).json({ error: "Invalid skill name" });
		}
		makerFs.deleteSkill(name);
		return res.status(200).json({ success: true });
	} catch (error) {
		console.error("[MAKER-FS] Failed to delete skill:", error);
		const message = error instanceof Error ? error.message : "Failed to delete skill";
		return res.status(error.message?.includes("not found") ? 404 : 500).json({ error: message });
	}
});

app.get("/api/maker/skills/:name/raw", (req, res) => {
	try {
		const name = req.params.name;
		if (!makerFs.validatePathComponent(name)) {
			return res.status(400).json({ error: "Invalid skill name" });
		}
		const raw = makerFs.readSkillRaw(name);
		if (!raw) {
			return res.status(404).json({ error: `Skill not found: ${name}` });
		}
		res.setHeader("Content-Type", "text/markdown; charset=utf-8");
		return res.status(200).send(raw);
	} catch (error) {
		console.error("[MAKER-FS] Failed to read skill raw:", error);
		return res.status(500).json({ error: "Failed to read skill" });
	}
});

// --- Agents/Subagents CRUD (filesystem-backed) ---

app.get("/api/maker/agents", (req, res) => {
	try {
		const agents = makerFs.listAgents();
		return res.status(200).json({ agents });
	} catch (error) {
		console.error("[MAKER-FS] Failed to list agents:", error);
		return res.status(500).json({ error: "Failed to list agents" });
	}
});

app.post("/api/maker/agents", (req, res) => {
	try {
		const contentType = req.headers["content-type"] || "";

		// Handle markdown import (raw agent .md content)
		if (contentType.includes("text/markdown")) {
			let rawContent = "";
			if (typeof req.body === "string") {
				rawContent = req.body;
			} else if (Buffer.isBuffer(req.body)) {
				rawContent = req.body.toString("utf8");
			} else {
				return res.status(400).json({ error: "Expected markdown content" });
			}

			const { frontmatter, body } = makerFs.parseFrontmatter(rawContent);
			const name = frontmatter.name;

			if (!name || typeof name !== "string") {
				return res.status(400).json({ error: "Agent .md must have a 'name' field in frontmatter" });
			}

			const nameError = makerFs.validateAgentName(name);
			if (nameError) {
				return res.status(400).json({ error: nameError });
			}

			if (makerFs.agentExists(name)) {
				return res.status(409).json({ error: `An agent named "${name}" already exists` });
			}

			// Parse tools and skills from frontmatter
			let tools = [];
			if (frontmatter.tools) {
				if (Array.isArray(frontmatter.tools)) {
					tools = frontmatter.tools.map((t) => String(t).trim()).filter(Boolean);
				} else if (typeof frontmatter.tools === "string") {
					tools = frontmatter.tools.split(",").map((t) => t.trim()).filter(Boolean);
				}
			}

			let skills = [];
			if (frontmatter.skills) {
				if (Array.isArray(frontmatter.skills)) {
					skills = frontmatter.skills.map((s) => String(s).trim()).filter(Boolean);
				} else if (typeof frontmatter.skills === "string") {
					skills = frontmatter.skills.split(",").map((s) => s.trim()).filter(Boolean);
				}
			}

			let disallowedTools = [];
			if (frontmatter.disallowedTools) {
				if (Array.isArray(frontmatter.disallowedTools)) {
					disallowedTools = frontmatter.disallowedTools.map((t) => String(t).trim()).filter(Boolean);
				} else if (typeof frontmatter.disallowedTools === "string") {
					disallowedTools = frontmatter.disallowedTools.split(",").map((t) => t.trim()).filter(Boolean);
				}
			}

			const agent = makerFs.writeAgent(name, {
				description: typeof frontmatter.description === "string" ? frontmatter.description.trim() : "",
				systemPrompt: body.trim(),
				model: typeof frontmatter.model === "string" && frontmatter.model.trim() ? frontmatter.model.trim() : "inherit",
				tools,
				disallowedTools,
				skills,
				maxTurns: frontmatter.maxTurns ? parseInt(String(frontmatter.maxTurns), 10) : undefined,
				permissionMode: typeof frontmatter.permissionMode === "string" && frontmatter.permissionMode.trim() ? frontmatter.permissionMode.trim() : undefined,
			});
			return res.status(201).json({ agent });
		}

		const { name, description, systemPrompt, model, tools, skills, disallowedTools, maxTurns, permissionMode } = req.body || {};

		// Validate name
		const nameError = makerFs.validateAgentName(name);
		if (nameError) {
			return res.status(400).json({ error: nameError });
		}
		if (!makerFs.validatePathComponent(name)) {
			return res.status(400).json({ error: "Invalid agent name" });
		}

		// Validate description
		if (!description || typeof description !== "string" || !description.trim()) {
			return res.status(400).json({ error: "Description is required" });
		}

		// Check for conflicts
		if (makerFs.agentExists(name)) {
			return res.status(409).json({ error: `An agent named "${name}" already exists` });
		}

		const agent = makerFs.writeAgent(name, {
			description: description.trim(),
			systemPrompt: typeof systemPrompt === "string" ? systemPrompt.trim() : "",
			model: typeof model === "string" && model.trim() ? model.trim() : "inherit",
			tools: Array.isArray(tools) ? tools.filter((t) => typeof t === "string" && t.trim()).map((t) => t.trim()) : [],
			disallowedTools: Array.isArray(disallowedTools) ? disallowedTools.filter((t) => typeof t === "string" && t.trim()).map((t) => t.trim()) : [],
			skills: Array.isArray(skills) ? skills.filter((s) => typeof s === "string" && s.trim()).map((s) => s.trim()) : [],
			maxTurns: typeof maxTurns === "number" && Number.isInteger(maxTurns) && maxTurns > 0 ? maxTurns : undefined,
			permissionMode: typeof permissionMode === "string" && permissionMode.trim() ? permissionMode.trim() : undefined,
		});
		return res.status(201).json({ agent });
	} catch (error) {
		console.error("[MAKER-FS] Failed to create agent:", error);
		const message = error instanceof Error ? error.message : "Failed to create agent";
		return res.status(500).json({ error: message });
	}
});

app.put("/api/maker/agents/:name", (req, res) => {
	try {
		const name = req.params.name;
		if (!makerFs.validatePathComponent(name)) {
			return res.status(400).json({ error: "Invalid agent name" });
		}

		// Read existing agent
		const existing = makerFs.getAgentByName(name);
		if (!existing) {
			return res.status(404).json({ error: `Agent not found: ${name}` });
		}

		// Merge updates
		const data = req.body || {};
		const updated = {
			description: data.description !== undefined ? (typeof data.description === "string" ? data.description.trim() : existing.description) : existing.description,
			systemPrompt: data.systemPrompt !== undefined ? (typeof data.systemPrompt === "string" ? data.systemPrompt.trim() : "") : existing.systemPrompt,
			model: data.model !== undefined ? (typeof data.model === "string" && data.model.trim() ? data.model.trim() : existing.model) : existing.model,
			tools: data.tools !== undefined ? (Array.isArray(data.tools) ? data.tools.filter((t) => typeof t === "string" && t.trim()).map((t) => t.trim()) : existing.tools) : existing.tools,
			disallowedTools: data.disallowedTools !== undefined ? (Array.isArray(data.disallowedTools) ? data.disallowedTools.filter((t) => typeof t === "string" && t.trim()).map((t) => t.trim()) : existing.disallowedTools) : existing.disallowedTools,
			skills: data.skills !== undefined ? (Array.isArray(data.skills) ? data.skills.filter((s) => typeof s === "string" && s.trim()).map((s) => s.trim()) : existing.skills) : existing.skills,
			maxTurns: data.maxTurns !== undefined ? (typeof data.maxTurns === "number" && Number.isInteger(data.maxTurns) && data.maxTurns > 0 ? data.maxTurns : undefined) : existing.maxTurns,
			permissionMode: data.permissionMode !== undefined ? (typeof data.permissionMode === "string" && data.permissionMode.trim() ? data.permissionMode.trim() : undefined) : existing.permissionMode,
		};

		// Validate description if changed
		if (data.description !== undefined && (!updated.description || !updated.description.trim())) {
			return res.status(400).json({ error: "Description is required" });
		}

		const agent = makerFs.writeAgent(name, updated);
		return res.status(200).json({ agent });
	} catch (error) {
		console.error("[MAKER-FS] Failed to update agent:", error);
		const message = error instanceof Error ? error.message : "Failed to update agent";
		return res.status(500).json({ error: message });
	}
});

app.delete("/api/maker/agents/:name", (req, res) => {
	try {
		const name = req.params.name;
		if (!makerFs.validatePathComponent(name)) {
			return res.status(400).json({ error: "Invalid agent name" });
		}
		makerFs.deleteAgent(name);
		return res.status(200).json({ success: true });
	} catch (error) {
		console.error("[MAKER-FS] Failed to delete agent:", error);
		const message = error instanceof Error ? error.message : "Failed to delete agent";
		return res.status(error.message?.includes("not found") ? 404 : 500).json({ error: message });
	}
});

app.get("/api/maker/agents/:name/raw", (req, res) => {
	try {
		const name = req.params.name;
		if (!makerFs.validatePathComponent(name)) {
			return res.status(400).json({ error: "Invalid agent name" });
		}
		const raw = makerFs.readAgentRaw(name);
		if (!raw) {
			return res.status(404).json({ error: `Agent not found: ${name}` });
		}
		res.setHeader("Content-Type", "text/markdown; charset=utf-8");
		return res.status(200).send(raw);
	} catch (error) {
		console.error("[MAKER-FS] Failed to read agent raw:", error);
		return res.status(500).json({ error: "Failed to read agent" });
	}
});

// --- Config summary (for maker context injection) ---

app.get("/api/maker/config-summary", (req, res) => {
	try {
		const summary = makerFs.getConfigSummary();
		return res.status(200).json({ summary });
	} catch (error) {
		console.error("[MAKER-FS] Failed to get config summary:", error);
		return res.status(500).json({ error: "Failed to get config summary" });
	}
});

app.get("/healthcheck", (req, res) => {
	console.log("Healthcheck requested by Micros");
	res.status(200).json({ status: "ok" });
});

app.get("/api/health", async (req, res) => {
	console.log("Health check requested");
	debugLog("HEALTH", "Processing health check");

	const key = process.env.ASAP_PRIVATE_KEY;
	const rovoDevAvailable = await isRovoDevAvailable();
	const envVars = getEnvVars();
	const fallbackEnabled = isAIGatewayFallbackEnabled();
	const aiGatewayConfigured = hasGatewayUrlConfigured(envVars);
	const fallbackActive = !rovoDevAvailable && fallbackEnabled;

	debugLog("HEALTH", "Auth configuration", {
		hasAsapKey: !!key,
		rovoDevAvailable,
		fallbackEnabled,
		aiGatewayConfigured,
	});

	const response = {
		status: "OK",
		message: "Backend server is working!",
		timestamp: new Date().toISOString(),
		authMethod: "ASAP",
		debugMode: DEBUG,
		rovoDevMode: rovoDevAvailable,
		llmRouting: {
			rovodevAvailable: rovoDevAvailable,
			fallbackEnabled,
			fallbackActive,
			aiGatewayConfigured,
			aiGatewayConfig: getAIGatewayConfigReport(envVars),
		},
		envCheck: {
			ASAP_PRIVATE_KEY: key ? "SET" : "MISSING",
			ROVODEV_PORT: process.env.ROVODEV_PORT ? "SET" : "MISSING",
		},
	};

	res.status(200).json(response);
});

// Serve static files from Next.js export output
const publicPath = path.join(__dirname, "public");
console.log(`[STARTUP] Serving static files from: ${publicPath}`);

// Serve all static files (CSS, JS, images, etc.)
app.use(express.static(publicPath));

// For all other routes, try to serve the corresponding HTML file or fallback to index.html
// This supports Next.js client-side routing
app.get("*", (req, res) => {
	console.log(`[STATIC] Request for route: ${req.path}`);

	// Never serve HTML for unmatched API routes. Return JSON 404 instead so
	// frontend callers don't attempt to parse HTML as JSON.
	if (req.path.startsWith("/api/")) {
		return res.status(404).json({
			error: `API route not found: ${req.path}`,
		});
	}

	// Try to serve index.html for SPA routing
	const indexPath = path.join(publicPath, "index.html");
	res.sendFile(indexPath, (err) => {
		if (err) {
			console.log(`[STATIC] index.html not found at ${indexPath}`);
			// If index.html doesn't exist, return a minimal HTML page
			res.status(200).send(`<!DOCTYPE html>
<html>
<head>
<title>VPK</title>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body>
<div id="root">
<h1>VPK Service</h1>
<p>Service is running and ready to serve content.</p>
<p><a href="/healthcheck">Health Check</a></p>
<p><a href="/api/health">API Health Check</a></p>
</div>
</body>
</html>`);
		}
	});
});

console.log("[STARTUP] All routes registered, starting HTTP server...");

const server = app.listen(port, "0.0.0.0", async () => {
	console.log(`[STARTUP] ✓ Server listening on 0.0.0.0:${port}`);
	console.log(`\n${"=".repeat(60)}`);
	console.log(`Server ready for connections`);
	console.log("Environment check:");
	console.log(`  PORT: ${port}`);
	console.log(`  AI_GATEWAY_URL: ${process.env.AI_GATEWAY_URL ? "SET" : "MISSING"}`);
	console.log(`  Debug Mode: ${DEBUG}`);

	console.log("\n🔐 Using ASAP Authentication");
	console.log(`  ASAP_ISSUER: ${process.env.ASAP_ISSUER ? "SET" : "MISSING"}`);
	console.log(`  ASAP_KID: ${process.env.ASAP_KID ? "SET" : "MISSING"}`);
	console.log(`  ASAP_PRIVATE_KEY: ${process.env.ASAP_PRIVATE_KEY ? "SET" : "MISSING"}`);

	// Check for RovoDev Serve at startup
	const rovoDevReady = await refreshRovoDevAvailability();
	const fallbackEnabled = isAIGatewayFallbackEnabled();
	const aiGatewayConfigured = hasGatewayUrlConfigured(getEnvVars());
	let chatBackendLabel = "RovoDev required (interactive fallback disabled)";
	if (rovoDevReady) {
		chatBackendLabel = "RovoDev Serve (agent loop)";
	} else if (
		INTERACTIVE_CHAT_FALLBACK_ENABLED &&
		fallbackEnabled &&
		aiGatewayConfigured
	) {
		chatBackendLabel = "AI Gateway fallback";
	} else if (INTERACTIVE_CHAT_FALLBACK_ENABLED && fallbackEnabled) {
		chatBackendLabel = "AI Gateway fallback (misconfigured)";
	}
	console.log(`\n🤖 Chat Backend: ${chatBackendLabel}`);
	if (rovoDevReady && _rovoDevPool) {
		const poolStatus = _rovoDevPool.getStatus();
		console.log(`  ROVODEV_POOL: ${poolStatus.total} ports (${poolStatus.ports.map((p) => p.port).join(", ")})`);
	} else if (rovoDevReady) {
		console.log(`  ROVODEV_PORT: ${process.env.ROVODEV_PORT}`);
	}
	console.log(`  AUTO_FALLBACK_TO_AI_GATEWAY: ${fallbackEnabled ? "ENABLED" : "DISABLED"}`);
	console.log(
		`  INTERACTIVE_CHAT_FALLBACK: ${
			INTERACTIVE_CHAT_FALLBACK_ENABLED ? "ENABLED" : "DISABLED"
		}`
	);
	console.log(
		`  INTERACTIVE_CHAT_FORCE_PORT_RECOVERY_MAX_ATTEMPTS: ${INTERACTIVE_CHAT_FORCE_PORT_RECOVERY_MAX_ATTEMPTS}`
	);
	console.log(
		`  INTERACTIVE_CHAT_FORCE_PORT_RECOVERY_TIMEOUT_MS: ${INTERACTIVE_CHAT_FORCE_PORT_RECOVERY_TIMEOUT_MS}`
	);
	console.log(
		`  AI_GATEWAY_ALLOWED_USE_CASES: ${AI_GATEWAY_ALLOWED_USE_CASES.join(", ")}`
	);
	console.log(`${"=".repeat(60)}\n`);

	if (DEBUG) {
		console.log("[DEBUG MODE ENABLED]");
		console.log("  All debug logs will be printed");
		console.log("  To disable: DEBUG=false\n");
	}
});

// Handle any startup errors
server.on("error", (err) => {
	console.error("Server error:", err);
	process.exit(1);
});

// Handle uncaught exceptions
process.on("uncaughtException", (err) => {
	console.error("Uncaught exception:", err);
	process.exit(1);
});

// Handle unhandled promise rejections
process.on("unhandledRejection", (reason, promise) => {
	console.error("Unhandled rejection at:", promise, "reason:", reason);
	process.exit(1);
});

// Graceful shutdown — clean up RovoDev pool
process.on("SIGINT", () => {
	if (_rovoDevPool) {
		_rovoDevPool.shutdown();
	}
	process.exit(0);
});
process.on("SIGTERM", () => {
	if (_rovoDevPool) {
		_rovoDevPool.shutdown();
	}
	process.exit(0);
});
