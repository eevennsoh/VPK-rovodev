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
const { createRunManager } = require("./lib/agents-team-runs");
const { createThreadManager } = require("./lib/agents-team-threads");
const { createConfigManager } = require("./lib/agents-team-config");
const { genuiChatHandler } = require("./lib/genui-chat-handler");
const {
	streamViaRovoDev,
	generateTextViaRovoDev,
	isChatInProgressError,
	initPool,
	WAIT_FOR_TURN_TIMEOUT_MS,
} = require("./lib/rovodev-gateway");
const { createAIGatewayProvider } = require("./lib/ai-gateway-provider");
const { healthCheck: rovoDevHealthCheck, cancelChat: rovoDevCancelChat } = require("./lib/rovodev-client");
const { createRovoDevPool } = require("./lib/rovodev-pool");
const {
	getEnvVars,
	detectEndpointType,
	getModelId,
	resolveGatewayUrl,
	streamBedrockGatewayManualSse,
	streamGoogleGatewayManualSse,
} = require("./lib/ai-gateway-helpers");
const { synthesizeSound } = require("./lib/sound-generation");
const {
	extractPlanWidgetPayloadFromText,
	extractProgressivePlanWidgetPayloadFromText,
	extractPlanWidgetPayloadFromStructuredText,
} = require("./lib/plan-widget-fallback");
const { detectPlanningIntent } = require("./lib/planning-intent");
const {
	shouldGateAgentTeamPlanningQuestionCard,
} = require("./lib/planning-question-gate");

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

		// Create or replace the pool
		if (_rovoDevPool) {
			_rovoDevPool.shutdown();
		}
		_rovoDevPool = createRovoDevPool(healthyPorts);
		initPool(_rovoDevPool);

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
const CLARIFICATION_MAX_PRESET_OPTIONS = 3;
const CLARIFICATION_CUSTOM_OPTION_PLACEHOLDER = "Tell Rovo what to do...";
const PLANNING_GATE_SKIP_SOURCES = new Set([
	"clarification-submit",
	"plan-approval-submit",
	"agent-team-plan-retry",
]);
const PLANNING_GATE_INTRO_TEXT =
	"Before I draft the plan, answer these quick questions.";
const DEFAULT_CONFLUENCE_BASE_URL = "https://venn-test.atlassian.net/wiki";
const MAX_SLACK_SUMMARY_CHARS = 35000;

function isTruthyFlag(value) {
	if (typeof value !== "string") {
		return false;
	}

	return ["1", "true", "yes", "on"].includes(value.trim().toLowerCase());
}

function isAIGatewayFallbackEnabled() {
	return isTruthyFlag(process.env.AUTO_FALLBACK_TO_AI_GATEWAY);
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

	return streamGoogleGatewayManualSse({
		gatewayUrl: resolvedGatewayUrl,
		envVars,
		model: getModelId(resolvedGatewayUrl),
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
app.use(express.json());

console.log("[STARTUP] Middleware configured");

let buildUserMessage;
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
	console.log("[STARTUP] rovo config loaded successfully");
} catch (error) {
	console.warn("[STARTUP] rovo config failed to load:", error.message);
	console.warn("[STARTUP] Using fallback functions - config did not load!");
	buildUserMessage = (message) => message;
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
}) {
	const backendSelection = await resolvePreferredBackend({ allowFallback: true });
	if (backendSelection.backend === "rovodev") {
		debugLog("GENERATE", "Routing through RovoDev Serve");
		try {
			return await generateTextViaRovoDev({
				system,
				prompt,
				conflictPolicy: "wait-for-turn",
				timeoutMs: WAIT_FOR_TURN_TIMEOUT_MS,
			});
		} catch (rovoDevError) {
			const is409Timeout =
				rovoDevError?.code === "ROVODEV_CHAT_IN_PROGRESS_TIMEOUT" ||
				isChatInProgressError(rovoDevError);
			const canFallback =
				is409Timeout &&
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

function buildPlanningQuestionCardSessionId(agentTeamRequestId) {
	const rawRequestId = getNonEmptyString(agentTeamRequestId);
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

const agentsTeamConfigManager = createConfigManager();

// --- Seed file persistence helpers ---

const fs = require("fs").promises;
const persistedIds = new Set();

function escapeForTemplate(str) {
	if (typeof str !== "string") return "";
	return str.replace(/\\/g, "\\\\").replace(/`/g, "\\`").replace(/\$/g, "\\$").replace(/\n/g, "\\n").replace(/\r/g, "\\r");
}

async function appendSkillToSeedFiles(skill) {
	// Append to frontend seed (TypeScript)
	const frontendPath = path.join(__dirname, "..", "lib", "agents-team-config-seed.ts");
	const frontendContent = await fs.readFile(frontendPath, "utf8");

	const tsEntry = `\t{
\t\tid: "${skill.id}",
\t\tname: "${escapeForTemplate(skill.name)}",
\t\tdescription:\n\t\t\t"${escapeForTemplate(skill.description)}",
\t\tcontent: \`${escapeForTemplate(skill.content)}\`,
\t\tisDefault: true,
\t\tcreatedAt: now,
\t\tupdatedAt: now,
\t},`;

	const updatedFrontend = frontendContent.replace(
		/^(export const DEFAULT_SKILLS:\s*AgentsTeamSkill\[\]\s*=\s*\[)([\s\S]*?)(\n\];)/m,
		(_, open, items, close) => `${open}${items}\n${tsEntry}${close}`
	);
	await fs.writeFile(frontendPath, updatedFrontend, "utf8");

	// Append to backend seed (JavaScript)
	const backendPath = path.join(__dirname, "lib", "agents-team-config-seed.js");
	const backendContent = await fs.readFile(backendPath, "utf8");

	const jsEntry = `\t{
\t\tname: "${escapeForTemplate(skill.name)}",
\t\tdescription:\n\t\t\t"${escapeForTemplate(skill.description)}",
\t\tcontent: \`${escapeForTemplate(skill.content)}\`,
\t},`;

	const updatedBackend = backendContent.replace(
		/^(const DEFAULT_SKILLS\s*=\s*\[)([\s\S]*?)(\n\];)/m,
		(_, open, items, close) => `${open}${items}\n${jsEntry}${close}`
	);
	await fs.writeFile(backendPath, updatedBackend, "utf8");

	console.log(`[AGENTS-CONFIG] Persisted skill "${skill.name}" to seed files`);
}

async function appendAgentToSeedFiles(agent) {
	const resolvedSkillNames = (agent.equippedSkills || [])
		.map((id) => agentsTeamConfigManager.getSkill(id))
		.filter(Boolean)
		.map((s) => s.name);

	// Append to frontend seed (TypeScript)
	const frontendPath = path.join(__dirname, "..", "lib", "agents-team-config-seed.ts");
	const frontendContent = await fs.readFile(frontendPath, "utf8");

	const equippedSkillsTs = resolvedSkillNames.length > 0
		? `[${resolvedSkillNames.map((n) => `SEED_SKILL_${n.toUpperCase().replace(/[^A-Z0-9]/g, "_")}_ID`).join(", ")}]`
		: "[]";

	const tsEntry = `\t{
\t\tid: "${agent.id}",
\t\tname: "${escapeForTemplate(agent.name)}",
\t\tdescription:\n\t\t\t"${escapeForTemplate(agent.description)}",
\t\tsystemPrompt: \`${escapeForTemplate(agent.systemPrompt)}\`,
\t\tmodel: "${agent.model || "sonnet"}",
\t\tallowedTools: ${JSON.stringify(agent.allowedTools || [])},
\t\tequippedSkills: ${equippedSkillsTs},
\t\tmaxTurns: undefined,
\t\tisDefault: true,
\t\tcreatedAt: now,
\t\tupdatedAt: now,
\t},`;

	const updatedFrontend = frontendContent.replace(
		/^(export const DEFAULT_AGENTS:\s*AgentsTeamAgent\[\]\s*=\s*\[)([\s\S]*?)(\n\];)/m,
		(_, open, items, close) => `${open}${items}\n${tsEntry}${close}`
	);
	await fs.writeFile(frontendPath, updatedFrontend, "utf8");

	// Append to backend seed (JavaScript)
	const backendPath = path.join(__dirname, "lib", "agents-team-config-seed.js");
	const backendContent = await fs.readFile(backendPath, "utf8");

	const jsEntry = `\t{
\t\tname: "${escapeForTemplate(agent.name)}",
\t\tdescription:\n\t\t\t"${escapeForTemplate(agent.description)}",
\t\tsystemPrompt: \`${escapeForTemplate(agent.systemPrompt)}\`,
\t\tmodel: "${agent.model || "sonnet"}",
\t\tallowedTools: ${JSON.stringify(agent.allowedTools || [])},
\t\tequippedSkillsByName: ${JSON.stringify(resolvedSkillNames)},
\t},`;

	const updatedBackend = backendContent.replace(
		/^(const DEFAULT_AGENTS\s*=\s*\[)([\s\S]*?)(\n\];)/m,
		(_, open, items, close) => `${open}${items}\n${jsEntry}${close}`
	);
	await fs.writeFile(backendPath, updatedBackend, "utf8");

	console.log(`[AGENTS-CONFIG] Persisted agent "${agent.name}" to seed files`);
}

const agentsTeamRunManager = createRunManager({
	baseDir: path.join(__dirname, "data"),
	buildSystemPrompt: null, // Not used in RovoDev-only mode
	configManager: agentsTeamConfigManager,
	logger: console,
	isRovoDevAvailable,
	isAIGatewayFallbackEnabled,
});

const agentsTeamThreadManager = createThreadManager({
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

function normalizeQuestionOptions(value) {
	if (!Array.isArray(value)) {
		return [];
	}

	const seenOptionIds = new Set();
	const seenOptionLabels = new Set();
	return value
		.map((option, index) => {
			if (!option || typeof option !== "object") {
				return null;
			}

			const label =
				getNonEmptyString(option.label) ||
				getNonEmptyString(option.title) ||
				getNonEmptyString(option.text);
			if (!label) {
				return null;
			}

			const optionId = getNonEmptyString(option.id) || `option-${index + 1}`;
			const normalizedLabel = label.toLowerCase();
			if (seenOptionIds.has(optionId) || seenOptionLabels.has(normalizedLabel)) {
				return null;
			}

			seenOptionIds.add(optionId);
			seenOptionLabels.add(normalizedLabel);
			return {
				id: optionId,
				label,
				description: getNonEmptyString(option.description) || undefined,
				recommended: Boolean(option.recommended),
			};
		})
		.filter(Boolean)
		.slice(0, CLARIFICATION_MAX_PRESET_OPTIONS);
}

function createFallbackQuestionOptions(questionLabel) {
	return [
		{
			id: "option-1",
			label: "Quick recommendation",
			description: `Give a fast direction for "${questionLabel}".`,
		},
		{
			id: "option-2",
			label: "Balanced approach",
			description: "Trade off speed and quality.",
		},
		{
			id: "option-3",
			label: "Detailed plan",
			description: "Prioritize completeness and depth.",
		},
	];
}

function getUniqueQuestionId(baseId, seenQuestionIds) {
	let uniqueQuestionId = baseId;
	let duplicateIndex = 2;
	while (seenQuestionIds.has(uniqueQuestionId)) {
		uniqueQuestionId = `${baseId}-${duplicateIndex}`;
		duplicateIndex += 1;
	}

	seenQuestionIds.add(uniqueQuestionId);
	return uniqueQuestionId;
}

function sanitizeQuestionCardPayload(payload, defaults = {}) {
	if (!payload || typeof payload !== "object") {
		return null;
	}

	const record = payload.payload && typeof payload.payload === "object"
		? payload.payload
		: payload;
	const recordType = getNonEmptyString(record.type);
	if (recordType && recordType !== CLARIFICATION_WIDGET_TYPE) {
		return null;
	}

	const questionsValue = Array.isArray(record.questions)
		? record.questions
		: Array.isArray(record.items)
			? record.items
			: null;
	if (!questionsValue || questionsValue.length === 0) {
		return null;
	}

	const seenQuestionIds = new Set();
	const questions = questionsValue
		.map((question, index) => {
			if (!question || typeof question !== "object") {
				return null;
			}

			const label =
				getNonEmptyString(question.label) ||
				getNonEmptyString(question.title) ||
				getNonEmptyString(question.question) ||
				getNonEmptyString(question.text);
			if (!label) {
				return null;
			}

			const parsedOptions = normalizeQuestionOptions(question.options);
			const options =
				parsedOptions.length > 0
					? parsedOptions
					: createFallbackQuestionOptions(label);
			const baseQuestionId = getNonEmptyString(question.id) || `q-${index + 1}`;
			const questionId = getUniqueQuestionId(baseQuestionId, seenQuestionIds);

			return {
				id: questionId,
				label,
				description: getNonEmptyString(question.description) || undefined,
				required: question.required !== false,
				kind: "single-select",
				options,
				placeholder: CLARIFICATION_CUSTOM_OPTION_PLACEHOLDER,
			};
		})
		.filter(Boolean);
	if (questions.length === 0) {
		return null;
	}

	return {
		type: CLARIFICATION_WIDGET_TYPE,
		sessionId:
			getNonEmptyString(record.sessionId) ||
			defaults.sessionId ||
			createClarificationSessionId(),
		round:
			getPositiveInteger(record.round) ||
			defaults.round ||
			1,
		maxRounds:
			getPositiveInteger(record.maxRounds) ||
			defaults.maxRounds ||
			CLARIFICATION_MAX_ROUNDS,
		title:
			getNonEmptyString(record.title) ||
			defaults.title ||
			"Help me clarify what you need",
		description:
			getNonEmptyString(record.description) ||
			defaults.description ||
			undefined,
		requiredCount: questions.filter((question) => question.required).length,
		questions,
	};
}

function parseObjectFromUnknown(value) {
	if (value && typeof value === "object" && !Array.isArray(value)) {
		return value;
	}

	if (typeof value !== "string") {
		return null;
	}

	const parsedValue = parseJsonFromText(value);
	if (!parsedValue || typeof parsedValue !== "object" || Array.isArray(parsedValue)) {
		return null;
	}

	return parsedValue;
}

function findRequestUserInputQuestionContainer(value) {
	const rootRecord = parseObjectFromUnknown(value);
	if (!rootRecord) {
		return null;
	}

	const queue = [rootRecord];
	const seenRecords = new Set();
	const nestedKeys = [
		"input",
		"arguments",
		"params",
		"payload",
		"request",
		"toolInput",
		"tool_input",
	];

	while (queue.length > 0) {
		const candidate = queue.shift();
		if (!candidate || typeof candidate !== "object" || Array.isArray(candidate)) {
			continue;
		}

		if (seenRecords.has(candidate)) {
			continue;
		}
		seenRecords.add(candidate);

		const questionItems = Array.isArray(candidate.questions)
			? candidate.questions
			: Array.isArray(candidate.items)
				? candidate.items
				: null;
		if (questionItems && questionItems.length > 0) {
			return {
				container: candidate,
				questions: questionItems,
			};
		}

		for (const key of nestedKeys) {
			const nestedRecord = parseObjectFromUnknown(candidate[key]);
			if (nestedRecord) {
				queue.push(nestedRecord);
			}
		}
	}

	return null;
}

function normalizeRequestUserInputOptions(value) {
	if (!Array.isArray(value)) {
		return [];
	}

	return value
		.map((option, index) => {
			if (typeof option === "string") {
				const label = getNonEmptyString(option);
				return label ? { id: `option-${index + 1}`, label } : null;
			}

			if (!option || typeof option !== "object") {
				return null;
			}

			const label =
				getNonEmptyString(option.label) ||
				getNonEmptyString(option.title) ||
				getNonEmptyString(option.text) ||
				getNonEmptyString(option.value);
			if (!label) {
				return null;
			}

			const isRecommendedByLabel = /\(recommended\)$/i.test(label);
			const normalizedLabel = label.replace(/\s*\(recommended\)$/i, "").trim();
			return {
				id: getNonEmptyString(option.id) || `option-${index + 1}`,
				label: normalizedLabel,
				description: getNonEmptyString(option.description) || undefined,
				recommended: Boolean(option.recommended) || isRecommendedByLabel,
			};
		})
		.filter(Boolean);
}

function normalizeRequestUserInputQuestions(value) {
	if (!Array.isArray(value)) {
		return [];
	}

	return value
		.map((question, index) => {
			if (typeof question === "string") {
				const label = getNonEmptyString(question);
				if (!label) {
					return null;
				}

				return {
					id: `q-${index + 1}`,
					label,
					required: true,
					options: [],
				};
			}

			if (!question || typeof question !== "object") {
				return null;
			}

			const label =
				getNonEmptyString(question.question) ||
				getNonEmptyString(question.label) ||
				getNonEmptyString(question.title) ||
				getNonEmptyString(question.text) ||
				getNonEmptyString(question.header);
			if (!label) {
				return null;
			}

			return {
				id: getNonEmptyString(question.id) || `q-${index + 1}`,
				label,
				description: getNonEmptyString(question.description) || undefined,
				required: question.required !== false,
				options: normalizeRequestUserInputOptions(question.options),
			};
		})
		.filter(Boolean);
}

function buildQuestionCardPayloadFromRequestUserInput(input, defaults = {}) {
	const resolvedRequest = findRequestUserInputQuestionContainer(input);
	if (!resolvedRequest) {
		return null;
	}

	const normalizedQuestions = normalizeRequestUserInputQuestions(
		resolvedRequest.questions
	);
	if (normalizedQuestions.length === 0) {
		return null;
	}

	return sanitizeQuestionCardPayload(
		{
			type: CLARIFICATION_WIDGET_TYPE,
			title:
				getNonEmptyString(resolvedRequest.container.title) ||
				getNonEmptyString(resolvedRequest.container.prompt) ||
				defaults.title,
			description:
				getNonEmptyString(resolvedRequest.container.description) ||
				defaults.description,
			questions: normalizedQuestions,
		},
		defaults
	);
}

function isRequestUserInputTool(toolName) {
	const normalizedToolName = getNonEmptyString(toolName)?.toLowerCase();
	if (!normalizedToolName) {
		return false;
	}

	return (
		normalizedToolName === "request_user_input" ||
		normalizedToolName.endsWith(".request_user_input")
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

	return sanitizeQuestionCardPayload(latestWidgetPayload.payload);
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

function createFallbackQuestionCardPayload({
	sessionId,
	round,
	maxRounds,
}) {
	return {
		type: CLARIFICATION_WIDGET_TYPE,
		sessionId,
		round,
		maxRounds,
		title: "Help me clarify what you need",
		description: "Answer these questions so I can build a better plan.",
		questions: [
			{
				id: "goal",
				label: "What outcome do you want?",
				description: "Describe the desired result in one or two sentences.",
				required: true,
				kind: "single-select",
				options: [
					{ id: "goal-fast", label: "Fast first draft", description: "Ship a quick, practical first version." },
					{ id: "goal-balanced", label: "Balanced delivery", description: "Balance speed, quality, and scope." },
					{ id: "goal-detailed", label: "Detailed rollout", description: "Provide a complete production-ready plan." },
				],
				placeholder: CLARIFICATION_CUSTOM_OPTION_PLACEHOLDER,
			},
			{
				id: "constraints",
				label: "What constraints should I account for?",
				description: "Include timeline, dependencies, or limits.",
				required: true,
				kind: "single-select",
				options: [
					{ id: "constraints-tight", label: "Tight deadline", description: "Prioritize speed and simple implementation." },
					{ id: "constraints-balanced", label: "Balanced trade-offs", description: "Balance scope, risk, and timeline." },
					{ id: "constraints-safety", label: "Quality and safety first", description: "Prioritize reliability and risk reduction." },
				],
				placeholder: CLARIFICATION_CUSTOM_OPTION_PLACEHOLDER,
			},
			{
				id: "risks",
				label: "What risks or blockers are most important?",
				description: "Pick the top concern for this effort.",
				required: false,
				kind: "single-select",
				options: [
					{ id: "scope", label: "Scope creep", description: "Requirements may keep expanding." },
					{ id: "alignment", label: "Team alignment", description: "Stakeholders may not agree on priorities." },
					{ id: "quality", label: "Quality regressions", description: "Changes could break existing behavior." },
				],
				placeholder: CLARIFICATION_CUSTOM_OPTION_PLACEHOLDER,
			},
		],
	};
}

function normalizeQuestionCardText(value) {
	if (typeof value !== "string") {
		return "";
	}

	return value
		.replace(/\*\*([^*\n]+)\*\*/g, "$1")
		.replace(/__([^_\n]+)__/g, "$1")
		.replace(/`([^`\n]+)`/g, "$1")
		.replace(/\[(.+?)\]\([^)]+\)/g, "$1")
		.replace(/\s+/g, " ")
		.trim();
}

function parseQuestionCardQuestionText(rawQuestionText) {
	const normalizedText = normalizeQuestionCardText(rawQuestionText);
	if (!normalizedText) {
		return null;
	}

	const questionMarkIndex = normalizedText.indexOf("?");
	if (questionMarkIndex !== -1) {
		const label = normalizedText.slice(0, questionMarkIndex + 1).trim();
		const description = normalizeQuestionCardText(
			normalizedText
				.slice(questionMarkIndex + 1)
				.replace(/^[\s—–:-]+/, "")
		);
		if (!label) {
			return null;
		}

		return {
			label,
			description: description || undefined,
		};
	}

	if (!/\b(what|which|when|where|who|why|how|do|does|can|should)\b/i.test(normalizedText)) {
		return null;
	}

	return {
		label: normalizedText,
		description: undefined,
	};
}

function extractQuestionCardPayloadFromAssistantText(rawText, defaults = {}) {
	if (typeof rawText !== "string" || !rawText.trim()) {
		return null;
	}

	const normalizedText = rawText.trim();
	const hasClarificationSignal =
		/\b(let me ask|few questions|clarify|scope (?:this|things)|before i (?:put together|build|draft)|before we (?:build|draft))\b/i.test(
			normalizedText
		);
	if (!hasClarificationSignal) {
		return null;
	}

	const lines = normalizedText.split(/\r?\n/);
	const questionBlocks = [];
	let activeQuestionParts = null;
	for (const rawLine of lines) {
		const line = rawLine.trim();
		if (!line) {
			continue;
		}

		const numberedQuestionMatch = line.match(/^\d+[\.)]\s+(.+)$/);
		if (numberedQuestionMatch?.[1]) {
			if (activeQuestionParts && activeQuestionParts.length > 0) {
				questionBlocks.push(activeQuestionParts.join(" "));
			}
			activeQuestionParts = [numberedQuestionMatch[1]];
			continue;
		}

		if (!activeQuestionParts) {
			continue;
		}

		if (/^[-*•]\s+/.test(line)) {
			continue;
		}

		activeQuestionParts.push(line);
	}

	if (activeQuestionParts && activeQuestionParts.length > 0) {
		questionBlocks.push(activeQuestionParts.join(" "));
	}

	const questions = questionBlocks
		.map((questionBlock) => parseQuestionCardQuestionText(questionBlock))
		.filter((question) => question && question.label.includes("?"))
		.slice(0, 4)
		.map((question, index) => ({
			id: `q-${index + 1}`,
			label: question.label,
			description: question.description,
			required: index < 2,
			kind: "single-select",
		}));

	if (questions.length < 2) {
		return null;
	}

	return sanitizeQuestionCardPayload(
		{
			type: CLARIFICATION_WIDGET_TYPE,
			title: defaults.title || "Help me clarify what you need",
			description:
				defaults.description ||
				"Answer these questions so I can build a better plan.",
			questions,
		},
		defaults
	);
}

function createClarificationQuestionPrompt({
	latestUserMessage,
	conversationHistory,
	previousQuestionCard,
	submission,
	round,
	maxRounds,
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
      "kind": "single-select",
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
- Every question must be "single-select".
- Every question must include 1-3 options.
- Do not include a custom free-text option in the JSON options.
- The UI automatically appends a "Tell Rovo what to do..." free-text field after the generated options.
- Do not generate a plan or task list.
- This is round ${round} of ${maxRounds}.
- If previous answers are partial, ask only missing/high-impact follow-ups.

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
}) {
	const promptText = createClarificationQuestionPrompt({
		latestUserMessage,
		conversationHistory,
		previousQuestionCard,
		submission,
		round,
		maxRounds,
	});

	try {
		const text = await generateTextViaGateway({
			system: "You output strict JSON for clarification question cards.",
			prompt: promptText,
			maxOutputTokens: 700,
			temperature: 0.3,
		});

		const parsedJson = parseJsonFromText(text);
		const sanitizedPayload = sanitizeQuestionCardPayload(parsedJson, {
			sessionId,
			round,
			maxRounds,
		});
		if (sanitizedPayload) {
			return sanitizedPayload;
		}
	} catch (error) {
		console.error("[CLARIFICATION] Gateway error:", error.message || error);
	}

	return sanitizeQuestionCardPayload(
		createFallbackQuestionCardPayload({
			latestUserMessage,
			sessionId,
			round,
			maxRounds,
		}),
		{
			sessionId,
			round,
			maxRounds,
		}
	);
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
}) {
	if (!assistantResponse || !assistantResponse.trim()) {
		return [];
	}

	const promptText = createSuggestedQuestionsPrompt(
		message,
		conversationHistory,
		assistantResponse
	);

	try {
		const text = await generateTextViaGateway({
			system: "You are a helpful assistant that generates follow-up questions.",
			prompt: promptText,
			maxOutputTokens: 200,
			temperature: 0.7,
		});

		return parseSuggestedQuestions(text);
	} catch (error) {
		console.error("SUGGESTIONS gateway error:", error.message || error);
		return [];
	}
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
			provider,
			agentTeamMode: rawAgentTeamMode,
			agentTeamRequestId,
			creationMode,
			hasQueuedPrompts: rawHasQueuedPrompts,
		} = req.body || {};
		const hasQueuedPrompts = Boolean(rawHasQueuedPrompts);
		const agentTeamMode = Boolean(rawAgentTeamMode);

		// If creationMode is set, load the instruction file and prepend to contextDescription
		let contextDescription = rawContextDescription;
		if (creationMode === "skill" || creationMode === "agent") {
			const fileName = creationMode === "skill" ? "skill-development.md" : "agent-development.md";
			const filePath = path.join(__dirname, "..", "custom", fileName);
			try {
				const fs = require("fs");
				const instructions = fs.readFileSync(filePath, "utf8");
				const prefix = `You are in ${creationMode} creation mode. Follow the instructions below to help the user create a new ${creationMode}.\n\nIMPORTANT: Use the request_user_input tool (question cards) to gather requirements from the user. Ask clarifying questions about the ${creationMode} they want to create.\n\nOnce you have enough information, generate the complete ${creationMode} configuration and call the POST /api/agents-team/${creationMode}s endpoint to create it. After successful creation, call POST /api/agents-team/${creationMode}s/{id}/persist to save it permanently.\n\n---\n\n${instructions}`;
				contextDescription = contextDescription ? `${prefix}\n\n${contextDescription}` : prefix;
			} catch (readError) {
				console.error(`[CHAT-SDK] Failed to read ${fileName}:`, readError.message);
			}
		}

		const latestVisibleUserMessage = getLatestVisibleUserMessage(messages);
		const latestUserMessageSource = getLatestUserMessageSource(messages);
		const isPostClarificationTurn =
			latestUserMessageSource === "clarification-submit";
		const {
			message: latestUserMessage,
			conversationHistory,
		} = mapUiMessagesToConversation(messages);

		if (!latestUserMessage) {
			return res.status(400).json({ error: "A user message is required" });
		}

		if (
			shouldGateAgentTeamPlanningQuestionCard({
				messages,
				agentTeamMode,
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
				maxRounds: 1,
				sessionId: buildPlanningQuestionCardSessionId(agentTeamRequestId),
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

		const userMessageText = buildUserMessage(
			latestUserMessage,
			conversationHistory,
			contextDescription
		);

		if (provider === "google") {
			const ENV_VARS = getEnvVars();
			const rawGatewayUrl = ENV_VARS.AI_GATEWAY_URL_GOOGLE || ENV_VARS.AI_GATEWAY_URL;
			if (!rawGatewayUrl) {
				return res.status(500).json({
					error: "AI Gateway URL is not configured",
					details: "Set AI_GATEWAY_URL_GOOGLE (preferred) or AI_GATEWAY_URL in .env.local.",
				});
			}

			const resolvedGatewayUrl = resolveGatewayUrl(rawGatewayUrl) || rawGatewayUrl;
			const endpointType = detectEndpointType(resolvedGatewayUrl);
			if (endpointType !== "google") {
				return res.status(400).json({
					error: "Provider routing mismatch",
					details: 'Requests with provider "google" require a Google endpoint in AI_GATEWAY_URL_GOOGLE.',
				});
			}

			const stream = createUIMessageStream({
				execute: async ({ writer }) => {
					const textId = `text-${Date.now()}`;
					let textStarted = false;

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

					await streamGoogleGatewayManualSse({
						gatewayUrl: resolvedGatewayUrl,
						envVars: ENV_VARS,
						model: getModelId(resolvedGatewayUrl),
						prompt: userMessageText,
						maxOutputTokens: 2000,
						temperature: 1,
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

		const backendSelection = await resolvePreferredBackend({ allowFallback: true });
		if (backendSelection.backend === "ai-gateway") {
			const stream = createUIMessageStream({
				execute: async ({ writer }) => {
					const textId = `text-${Date.now()}`;
					let textStarted = false;

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

					await streamTextViaAIGateway({
						prompt: userMessageText,
						maxOutputTokens: 2000,
						temperature: 1,
						provider: typeof provider === "string" ? provider : undefined,
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

					if (textStarted) {
						writer.write({ type: "text-end", id: textId });
					}
				},
				onError: (error) => {
					if (error instanceof Error) {
						return error.message;
					}
					return "Failed to stream AI Gateway response";
				},
			});

			pipeUIMessageStreamToResponse({
				response: res,
				stream,
			});
			return;
		}

		if (backendSelection.backend !== "rovodev") {
			return sendGatewayErrorResponse(
				res,
				createRovoDevUnavailableError(),
				"Failed to stream chat response"
			);
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
				let hasEmittedQuestionCard = false;
				let hasEmittedPlanWidget = false;
				let hasSeenPlanWidgetSignal = false;
				let hasEmittedPlanLoadingState = false;
				let latestProgressivePlanFingerprint = null;
				let hasExplicitPlanPayload = false;
				const emittedQuestionCardToolCalls = new Set();
				let pendingQuestionCardLoadingWidgetId = null;

				const emitTextDelta = (delta) => {
					if (!delta) {
						return;
					}

					if (!textStarted) {
						writer.write({ type: "text-start", id: textId });
						textStarted = true;
					}

					writer.write({ type: "text-delta", id: textId, delta });
					assistantText += delta;
				};

				const sanitizeThinkingLabel = (value) => {
					if (typeof value !== "string") {
						return "";
					}

					return value.replace(/(?:\s*(?:\.{3}|…))+$/u, "").trim();
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

				const emitRequestUserInputQuestionCard = (toolCall) => {
					if (!toolCall || typeof toolCall !== "object") {
						return;
					}

					if (!isRequestUserInputTool(toolCall.toolName)) {
						return;
					}

					const normalizedToolCallId = getNonEmptyString(toolCall.toolCallId);
					let dedupeKey = normalizedToolCallId
						? `request-user-input:${normalizedToolCallId}`
						: null;
					if (!dedupeKey) {
						try {
							const serializedInput = JSON.stringify(toolCall.toolInput);
							if (serializedInput && serializedInput !== "null") {
								dedupeKey = `request-user-input:${serializedInput}`;
							}
						} catch {
							dedupeKey = null;
						}
					}

					const payload = buildQuestionCardPayloadFromRequestUserInput(
						toolCall.toolInput,
						{
							sessionId: normalizedToolCallId
								? `request-user-input-${normalizedToolCallId}`
								: createClarificationSessionId(),
							round: 1,
							maxRounds: 1,
							title: "Answer these questions to continue",
							description:
								"Pick the options that best match what you want.",
						}
					);
					if (!payload) {
						return;
					}

					const resolvedDedupeKey =
						dedupeKey ||
						`request-user-input:${payload.sessionId}:${payload.round}`;
					if (emittedQuestionCardToolCalls.has(resolvedDedupeKey)) {
						return;
					}
					emittedQuestionCardToolCalls.add(resolvedDedupeKey);

					const questionCardWidgetId = normalizedToolCallId
						? `request-user-input-${normalizedToolCallId}`
						: `request-user-input-${Date.now()}`;
					hasEmittedQuestionCard = true;
					pendingQuestionCardLoadingWidgetId = questionCardWidgetId;

					writer.write({
						type: "data-widget-loading",
						id: questionCardWidgetId,
						data: {
							type: CLARIFICATION_WIDGET_TYPE,
							loading: true,
						},
					});

					writer.write({
						type: "data-widget-data",
						id: questionCardWidgetId,
						data: {
							type: CLARIFICATION_WIDGET_TYPE,
							payload,
						},
					});
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
								writer.write({
									type: "data-thinking-status",
									data: {
										label: label || "Thinking",
										content: parsedStatus.content,
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

					textBuffer += delta;
					processTextBuffer(false);
					maybeEmitProgressivePlanUpdate();
				};

				// RovoDev Serve: route through the local agent loop
				console.log("[CHAT-SDK] Routing through RovoDev Serve");
				let retryOccurred = false;
				let rovoDevFellBackToGateway = false;
				try {
					await streamViaRovoDev({
						message: userMessageText,
						onTextDelta: handleStreamTextDelta,
						onToolCallStart: emitRequestUserInputQuestionCard,
						signal: abortController.signal,
						onThinkingStatus: (statusUpdate) => {
							if (!statusUpdate || typeof statusUpdate !== "object") {
								return;
							}

							const label = sanitizeThinkingLabel(statusUpdate.label);
							if (!label) {
								return;
							}

							const rawContent =
								typeof statusUpdate.content === "string"
									? statusUpdate.content.trim()
									: "";

							writer.write({
								type: "data-thinking-status",
								data: {
									label,
									content: rawContent.length > 0 ? rawContent : undefined,
								},
							});
						},
						onRetry: (() => {
							let retryEmitted = false;
							return () => {
								retryOccurred = true;
								if (retryEmitted) return;
								retryEmitted = true;
								const retryStatusId = `thinking-retry-${Date.now()}`;
								writer.write({
									type: "data-thinking-status",
									id: retryStatusId,
									data: {
										label: "Retrying — previous chat still in progress",
									},
								});
							};
						})(),
					});
				} catch (rovoDevStreamError) {
					const canFallbackToGateway =
						rovoDevStreamError?.code === "ROVODEV_CHAT_IN_PROGRESS_TIMEOUT" &&
						isAIGatewayFallbackEnabled() &&
						hasGatewayUrlConfigured();

					if (!canFallbackToGateway) {
						if (rovoDevStreamError?.code === "ROVODEV_CHAT_IN_PROGRESS_TIMEOUT") {
							handleStreamTextDelta(
								`\n\n⚠️ RovoDev is still finishing the previous response. Please try again.`
							);
						} else {
							throw rovoDevStreamError;
						}
					} else {
						console.warn(
							"[CHAT-SDK] RovoDev 409 timeout — falling back to AI Gateway for this request"
						);
						writer.write({
							type: "data-thinking-status",
							data: { label: "Switching to AI Gateway" },
						});
						rovoDevFellBackToGateway = true;
						await streamTextViaAIGateway({
							prompt: userMessageText,
							maxOutputTokens: 2000,
							temperature: 1,
							provider: typeof provider === "string" ? provider : undefined,
							onTextDelta: handleStreamTextDelta,
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
					}
				}

				if (retryOccurred && !rovoDevFellBackToGateway) {
					writer.write({
						type: "data-thinking-status",
						data: { label: "Reconnected" },
					});
				}

				processTextBuffer(true);
				maybeEmitProgressivePlanUpdate();

				// Skip post-stream work if the client disconnected
				if (abortController.signal.aborted) {
					if (textStarted) {
						writer.write({ type: "text-end", id: textId });
					}
					return;
				}

				if (!hasEmittedQuestionCard && !hasEmittedPlanWidget) {
					const fallbackQuestionCardPayload =
						extractQuestionCardPayloadFromAssistantText(assistantText, {
							sessionId: buildPlanningQuestionCardSessionId(agentTeamRequestId),
							round: 1,
							maxRounds: CLARIFICATION_MAX_ROUNDS,
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

				if (!hasQueuedPrompts) {
					try {
						const suggestedQuestions = await generateSuggestedQuestions({
							message: latestUserMessage,
							conversationHistory,
							assistantResponse: assistantText,
						});

						if (suggestedQuestions.length > 0) {
							writer.write({
								type: "data-suggested-questions",
								data: { questions: suggestedQuestions },
							});
						}
					} catch (error) {
						console.error("Failed to stream suggested questions:", error);
					}
				}
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
		console.log("[CHAT-CANCEL] Cancel requested");
		await rovoDevCancelChat();
		return res.status(200).json({ cancelled: true });
	} catch (error) {
		console.error("[CHAT-CANCEL] Cancel error:", error.message || error);
		return res.status(200).json({ cancelled: false, error: error.message });
	}
});

app.post("/api/genui-chat", (req, res) =>
	genuiChatHandler(req, res, {
		isRovoDevAvailable,
		isAIGatewayFallbackEnabled,
		aiGatewayProvider,
	})
);

app.post("/api/sound-generation", async (req, res) => {
	try {
		const synthesisResult = await synthesizeSound(req.body || {});
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

app.post("/api/agents-team/runs", async (req, res) => {
	try {
		const {
			plan,
			userPrompt,
			conversation,
			customInstruction,
		} = req.body || {};

		const run = await agentsTeamRunManager.createRun({
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

app.get("/api/agents-team/runs", async (req, res) => {
	try {
		const rawLimit = Array.isArray(req.query.limit) ? req.query.limit[0] : req.query.limit;
		const runs = await agentsTeamRunManager.listRuns({ limit: rawLimit });
		return res.status(200).json({ runs });
	} catch (error) {
		console.error("[AGENTS-RUN] Failed to list runs:", error);
		const message = error instanceof Error ? error.message : "Failed to list runs";
		return res.status(500).json({ error: message });
	}
});

app.get("/api/agents-team/runs/:runId", async (req, res) => {
	try {
		const runId = req.params.runId;
		const run = await agentsTeamRunManager.getRun(runId);
		if (!run) {
			return res.status(404).json({ error: "Run not found" });
		}

		return res.status(200).json({ run });
	} catch (error) {
		console.error("[AGENTS-RUN] Failed to get run:", error);
		return res.status(500).json({ error: "Failed to load run" });
	}
});

app.delete("/api/agents-team/runs/:runId", async (req, res) => {
	try {
		const runId = req.params.runId;
		await agentsTeamRunManager.deleteRun(runId);
		return res.status(200).json({ deleted: true });
	} catch (error) {
		console.error("[AGENTS-RUN] Failed to delete run:", error);
		return res.status(500).json({ error: "Failed to delete run" });
	}
});

app.get("/api/agents-team/threads", async (req, res) => {
	try {
		const rawLimit = Array.isArray(req.query.limit) ? req.query.limit[0] : req.query.limit;
		const limit = rawLimit ? Number(rawLimit) : undefined;
		const threads = await agentsTeamThreadManager.listThreads({ limit });
		return res.status(200).json({ threads });
	} catch (error) {
		console.error("[AGENTS-THREAD] Failed to list threads:", error);
		const message = error instanceof Error ? error.message : "Failed to list threads";
		return res.status(500).json({ error: message });
	}
});

app.get("/api/agents-team/threads/:threadId", async (req, res) => {
	try {
		const threadId = req.params.threadId;
		const thread = await agentsTeamThreadManager.getThread(threadId);
		if (!thread) {
			return res.status(404).json({ error: "Thread not found" });
		}

		return res.status(200).json({ thread });
	} catch (error) {
		console.error("[AGENTS-THREAD] Failed to get thread:", error);
		return res.status(500).json({ error: "Failed to load thread" });
	}
});

app.post("/api/agents-team/threads", async (req, res) => {
	try {
		const { id, title, messages, createdAt, updatedAt } = req.body || {};
		const thread = await agentsTeamThreadManager.createThread({
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

app.put("/api/agents-team/threads/:threadId", async (req, res) => {
	try {
		const threadId = req.params.threadId;
		const { title, messages, updatedAt } = req.body || {};
		const thread = await agentsTeamThreadManager.updateThread(threadId, {
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

app.delete("/api/agents-team/threads/:threadId", async (req, res) => {
	try {
		const threadId = req.params.threadId;
		await agentsTeamThreadManager.deleteThread(threadId);
		return res.status(200).json({ deleted: true });
	} catch (error) {
		console.error("[AGENTS-THREAD] Failed to delete thread:", error);
		return res.status(500).json({ error: "Failed to delete thread" });
	}
});

app.post("/api/agents-team/runs/:runId/tasks", async (req, res) => {
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
		const result = await agentsTeamRunManager.appendTasks(runId, {
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

app.get("/api/agents-team/runs/:runId/files", async (req, res) => {
	try {
		const runId = req.params.runId;
		const rawArtifactId = Array.isArray(req.query.id) ? req.query.id[0] : req.query.id;
		const artifactId = getNonEmptyString(rawArtifactId);
		const rawDownload = Array.isArray(req.query.download)
			? req.query.download[0]
			: req.query.download;
		const shouldDownload = rawDownload === "1" || rawDownload === "true";

		if (artifactId) {
			const artifactFile = await agentsTeamRunManager.getRunFile(runId, artifactId);
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

		const filesPayload = await agentsTeamRunManager.getRunFiles(runId);
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

app.get("/api/agents-team/runs/:runId/stream", async (req, res) => {
	try {
		const runId = req.params.runId;
		await agentsTeamRunManager.streamRunEvents(req, res, runId);
	} catch (error) {
		console.error("[AGENTS-RUN] Failed to stream run events:", error);
		if (!res.headersSent) {
			res.status(500).json({ error: "Failed to stream run events" });
		}
	}
});

app.post("/api/agents-team/runs/:runId/directives", async (req, res) => {
	try {
		const runId = req.params.runId;
		const { agentName, message } = req.body || {};
		const result = await agentsTeamRunManager.addDirective(runId, {
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

app.post("/api/agents-team/runs/:runId/share", async (req, res) => {
	try {
		const runId = req.params.runId;
		const requestBody = req.body && typeof req.body === "object" ? req.body : {};
		const target = getNonEmptyString(requestBody.target)?.toLowerCase();
		if (target !== "confluence" && target !== "slack") {
			return res.status(400).json({
				error: "Invalid share target. Use 'confluence' or 'slack'.",
			});
		}

		const runSummary = await agentsTeamRunManager.getRunSummary(runId);
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

app.get("/api/agents-team/runs/:runId/summary", async (req, res) => {
	try {
		const runId = req.params.runId;
		const summary = await agentsTeamRunManager.getRunSummary(runId);
		if (!summary) {
			return res.status(404).json({ error: "Run not found" });
		}

		return res.status(200).json(summary);
	} catch (error) {
		console.error("[AGENTS-RUN] Failed to load run summary:", error);
		return res.status(500).json({ error: "Failed to load run summary" });
	}
});

app.get("/api/agents-team/runs/:runId/visual-summary", async (req, res) => {
	try {
		const runId = req.params.runId;
		const summary = await agentsTeamRunManager.getRunVisualSummary(runId);
		if (!summary) {
			return res.status(404).json({ error: "Run not found" });
		}

		return res.status(200).json(summary);
	} catch (error) {
		console.error("[AGENTS-RUN] Failed to load run visual summary:", error);
		return res.status(500).json({ error: "Failed to load run visual summary" });
	}
});


// --- Skills CRUD ---

app.get("/api/agents-team/skills", (req, res) => {
	try {
		const skills = agentsTeamConfigManager.listSkills();
		return res.status(200).json({ skills });
	} catch (error) {
		console.error("[AGENTS-CONFIG] Failed to list skills:", error);
		return res.status(500).json({ error: "Failed to list skills" });
	}
});

app.post("/api/agents-team/skills", (req, res) => {
	try {
		const { name, description, content } = req.body || {};
		const skill = agentsTeamConfigManager.createSkill({ name, description, content });
		return res.status(201).json({ skill });
	} catch (error) {
		console.error("[AGENTS-CONFIG] Failed to create skill:", error);
		const message = error instanceof Error ? error.message : "Failed to create skill";
		return res.status(400).json({ error: message });
	}
});

app.put("/api/agents-team/skills/:id", (req, res) => {
	try {
		const id = req.params.id;
		const { name, description, content } = req.body || {};
		const skill = agentsTeamConfigManager.updateSkill(id, { name, description, content });
		return res.status(200).json({ skill });
	} catch (error) {
		console.error("[AGENTS-CONFIG] Failed to update skill:", error);
		const message = error instanceof Error ? error.message : "Failed to update skill";
		return res.status(400).json({ error: message });
	}
});

app.delete("/api/agents-team/skills/:id", (req, res) => {
	try {
		const id = req.params.id;
		agentsTeamConfigManager.deleteSkill(id);
		return res.status(200).json({ success: true });
	} catch (error) {
		console.error("[AGENTS-CONFIG] Failed to delete skill:", error);
		const message = error instanceof Error ? error.message : "Failed to delete skill";
		return res.status(400).json({ error: message });
	}
});

// --- Custom Agents CRUD ---

app.get("/api/agents-team/agents", (req, res) => {
	try {
		const agents = agentsTeamConfigManager.listAgents();
		return res.status(200).json({ agents });
	} catch (error) {
		console.error("[AGENTS-CONFIG] Failed to list agents:", error);
		return res.status(500).json({ error: "Failed to list agents" });
	}
});

app.post("/api/agents-team/agents", (req, res) => {
	try {
		const { name, description, systemPrompt, model, allowedTools, equippedSkills, maxTurns } = req.body || {};
		const agent = agentsTeamConfigManager.createAgent({
			name, description, systemPrompt, model, allowedTools, equippedSkills, maxTurns,
		});
		return res.status(201).json({ agent });
	} catch (error) {
		console.error("[AGENTS-CONFIG] Failed to create agent:", error);
		const message = error instanceof Error ? error.message : "Failed to create agent";
		return res.status(400).json({ error: message });
	}
});

app.put("/api/agents-team/agents/:id", (req, res) => {
	try {
		const id = req.params.id;
		const { name, description, systemPrompt, model, allowedTools, equippedSkills, maxTurns } = req.body || {};
		const agent = agentsTeamConfigManager.updateAgent(id, {
			name, description, systemPrompt, model, allowedTools, equippedSkills, maxTurns,
		});
		return res.status(200).json({ agent });
	} catch (error) {
		console.error("[AGENTS-CONFIG] Failed to update agent:", error);
		const message = error instanceof Error ? error.message : "Failed to update agent";
		return res.status(400).json({ error: message });
	}
});

app.delete("/api/agents-team/agents/:id", (req, res) => {
	try {
		const id = req.params.id;
		agentsTeamConfigManager.deleteAgent(id);
		return res.status(200).json({ success: true });
	} catch (error) {
		console.error("[AGENTS-CONFIG] Failed to delete agent:", error);
		const message = error instanceof Error ? error.message : "Failed to delete agent";
		return res.status(400).json({ error: message });
	}
});

// --- Persist skill/agent to seed files (survives server restart) ---

app.post("/api/agents-team/skills/:id/persist", async (req, res) => {
	try {
		const skill = agentsTeamConfigManager.getSkill(req.params.id);
		if (!skill) {
			return res.status(404).json({ error: "Skill not found" });
		}
		if (skill.isDefault || persistedIds.has(skill.id)) {
			return res.status(400).json({ error: "Skill already persisted" });
		}
		await appendSkillToSeedFiles(skill);
		persistedIds.add(skill.id);
		return res.status(200).json({ success: true });
	} catch (error) {
		console.error("[AGENTS-CONFIG] Failed to persist skill:", error);
		const message = error instanceof Error ? error.message : "Failed to persist skill";
		return res.status(500).json({ error: message });
	}
});

app.post("/api/agents-team/agents/:id/persist", async (req, res) => {
	try {
		const agent = agentsTeamConfigManager.getAgent(req.params.id);
		if (!agent) {
			return res.status(404).json({ error: "Agent not found" });
		}
		if (agent.isDefault || persistedIds.has(agent.id)) {
			return res.status(400).json({ error: "Agent already persisted" });
		}
		await appendAgentToSeedFiles(agent);
		persistedIds.add(agent.id);
		return res.status(200).json({ success: true });
	} catch (error) {
		console.error("[AGENTS-CONFIG] Failed to persist agent:", error);
		const message = error instanceof Error ? error.message : "Failed to persist agent";
		return res.status(500).json({ error: message });
	}
});

// --- Config summary (for plan context injection) ---

app.get("/api/agents-team/config-summary", (req, res) => {
	try {
		const summary = agentsTeamConfigManager.getConfigSummary();
		return res.status(200).json({ summary });
	} catch (error) {
		console.error("[AGENTS-CONFIG] Failed to get config summary:", error);
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
	let chatBackendLabel = "RovoDev required (fallback disabled)";
	if (rovoDevReady) {
		chatBackendLabel = "RovoDev Serve (agent loop)";
	} else if (fallbackEnabled && aiGatewayConfigured) {
		chatBackendLabel = "AI Gateway fallback";
	} else if (fallbackEnabled) {
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
