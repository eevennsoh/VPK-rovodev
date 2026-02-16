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
const { createConfigManager } = require("./lib/agents-team-config");
const { genuiChatHandler } = require("./lib/genui-chat-handler");
const { streamViaRovoDev, generateTextViaRovoDev } = require("./lib/rovodev-gateway");
const { healthCheck: rovoDevHealthCheck } = require("./lib/rovodev-client");
const { getEnvVars } = require("./lib/ai-gateway-helpers");

console.log("[STARTUP] Dependencies loaded");

// ─── RovoDev Serve Detection ─────────────────────────────────────────────────
// When `pnpm run rovodev` is used, `dev-rovodev.js` writes the serve port to
// `.dev-rovodev-port`. The backend reads this file to decide whether to route
// chat traffic through the local RovoDev agent loop instead of AI Gateway.

const ROVODEV_PORT_FILE = path.join(__dirname, "..", ".dev-rovodev-port");

/** Cached availability state — refreshed on each request via the port file. */
let _rovoDevAvailable = false;
let _rovoDevChecked = false;

/**
 * Check whether a RovoDev Serve instance is reachable.
 * Reads the port file written by `dev-rovodev.js` and pings the health endpoint.
 * Caches the result so subsequent calls within the same process are fast.
 * Call `refreshRovoDevAvailability()` to re-check (e.g. at startup).
 */
async function refreshRovoDevAvailability() {
	try {
		const fs = require("fs");
		if (!fs.existsSync(ROVODEV_PORT_FILE)) {
			_rovoDevAvailable = false;
			_rovoDevChecked = true;
			return false;
		}

		const portStr = fs.readFileSync(ROVODEV_PORT_FILE, "utf8").trim();
		const port = parseInt(portStr, 10);
		if (isNaN(port) || port <= 0) {
			_rovoDevAvailable = false;
			_rovoDevChecked = true;
			return false;
		}

		// Set the env var so rovodev-client.js picks up the correct port
		process.env.ROVODEV_PORT = String(port);

		try {
			await rovoDevHealthCheck();
		} catch (healthCheckErr) {
			// Health check endpoint requires credentials, but the fact that it's
			// reachable and responding means RovoDev Serve is running.
			// 401/403 (missing credentials) is OK — it means the server is there.
			if (!healthCheckErr.message.includes("status 401") && !healthCheckErr.message.includes("status 403")) {
				throw healthCheckErr;
			}
			console.log(`[ROVODEV] Serve detected on port ${port} (health check requires auth)`);
		}

		_rovoDevAvailable = true;
		_rovoDevChecked = true;
		console.log(`[ROVODEV] Serve available on port ${port}`);
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
	const portFileExists = fs.existsSync(ROVODEV_PORT_FILE);

	// If the port file disappeared, RovoDev was stopped
	if (!portFileExists) {
		if (_rovoDevAvailable) {
			console.error("[ROVODEV] Port file removed — RovoDev Serve is no longer available");
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

// Debug logging
const DEBUG = process.env.DEBUG === "true";
function debugLog(section, message, data) {
	if (DEBUG) {
		console.log(`[DEBUG][${section}] ${message}`, data ? JSON.stringify(data, null, 2) : "");
	}
}

app.use(cors());
app.use(express.json());

console.log("[STARTUP] Middleware configured");

function buildSpeechEndpointUrl(gatewayUrl, endpointType) {
	if (typeof gatewayUrl !== "string" || !gatewayUrl.trim()) {
		return null;
	}

	try {
		const parsedUrl = new URL(gatewayUrl);
		const pathname = parsedUrl.pathname;

		if (endpointType === "google") {
			if (pathname.endsWith("/v1/google/v1/text:synthesize")) {
				return parsedUrl.toString();
			}

			if (/\/v1\/google\/publishers\/google\/v1\/chat\/completions$/.test(pathname)) {
				parsedUrl.pathname = pathname.replace(
					/\/v1\/google\/publishers\/google\/v1\/chat\/completions$/,
					"/v1/google/v1/text:synthesize"
				);
				return parsedUrl.toString();
			}

			if (/\/v1\/google\/v1\/chat\/completions$/.test(pathname)) {
				parsedUrl.pathname = pathname.replace(
					/\/v1\/google\/v1\/chat\/completions$/,
					"/v1/google/v1/text:synthesize"
				);
				return parsedUrl.toString();
			}

			if (pathname.endsWith("/chat/completions")) {
				parsedUrl.pathname = pathname.replace(/\/chat\/completions$/, "/text:synthesize");
				return parsedUrl.toString();
			}

			return null;
		}

		if (pathname.endsWith("/audio/speech")) {
			return parsedUrl.toString();
		}

		if (pathname.endsWith("/chat/completions")) {
			parsedUrl.pathname = pathname.replace(/\/chat\/completions$/, "/audio/speech");
			return parsedUrl.toString();
		}

		if (pathname.endsWith("/responses")) {
			parsedUrl.pathname = pathname.replace(/\/responses$/, "/audio/speech");
			return parsedUrl.toString();
		}

		if (pathname.endsWith("/v1/openai/v1")) {
			parsedUrl.pathname = `${pathname}/audio/speech`;
			return parsedUrl.toString();
		}

		return null;
	} catch {
		return null;
	}
}

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
 *
 * Priority:
 *   1. RovoDev Serve (if running — detected via `.dev-rovodev-port` file)
 *   2. AI Gateway — manual SSE for Bedrock, AI SDK for OpenAI/Google
 */
async function generateTextViaGateway({ system, prompt }) {
	// RovoDev Serve is required - no AI Gateway fallback
	const useRovoDev = await isRovoDevAvailable();
	if (!useRovoDev) {
		throw new Error(
			"RovoDev Serve is required but not available. " +
			"Please start RovoDev Serve with 'pnpm run rovodev' before using this feature."
		);
	}

	debugLog("GENERATE", "Routing through RovoDev Serve");
	return generateTextViaRovoDev({ system, prompt });
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


const agentsTeamConfigManager = createConfigManager();

const agentsTeamRunManager = createRunManager({
	baseDir: path.join(__dirname, "data"),
	buildSystemPrompt: null, // Not used in RovoDev-only mode
	configManager: agentsTeamConfigManager,
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
	return label.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
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
		return "Yes, let's cook!";
	}

	if (decision === "manual-approve") {
		return "Yes, and manually approve edits";
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
- The UI automatically renders option 3 as "Tell Rovo what to do...".
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
		return res.status(503).json({
			error: "RovoDev Serve is required but not available",
			details: "Please start RovoDev Serve with 'pnpm run rovodev' before using chat.",
		});
	}
});

app.post("/api/chat-sdk", async (req, res) => {
	try {
		const {
			messages,
			contextDescription,
			userName,
		} = req.body || {};

		// RovoDev Serve is required - no AI Gateway fallback
		const useRovoDev = await isRovoDevAvailable();
		if (!useRovoDev) {
			return res.status(503).json({
				error: "RovoDev Serve is required but not available",
				details: "Please start RovoDev Serve with 'pnpm run rovodev' before using chat.",
			});
		}

		const {
			message: latestUserMessage,
			conversationHistory,
		} = mapUiMessagesToConversation(messages);

		if (!latestUserMessage) {
			return res.status(400).json({ error: "A user message is required" });
		}

		const userMessageText = buildUserMessage(
			latestUserMessage,
			conversationHistory,
			contextDescription
		);

		const stream = createUIMessageStream({
			execute: async ({ writer }) => {
				const widgetLoadingPrefix = "WIDGET_LOADING:";
				const widgetDataPrefix = "WIDGET_DATA:";
				const thinkingStatusPrefix = "THINKING_STATUS:";
				const agentExecutionPrefix = "AGENT_EXECUTION:";
				const partialMarkerBufferLength =
					Math.max(widgetLoadingPrefix.length, widgetDataPrefix.length, thinkingStatusPrefix.length, agentExecutionPrefix.length) - 1;
				let textBuffer = "";
				const textId = `text-${Date.now()}`;
				const widgetId = `widget-${Date.now()}`;
				let textStarted = false;
				let assistantText = "";
				let widgetType = null;
				let latestPlanPayload = null;

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
								if (resolvedWidgetType === "plan") {
									latestPlanPayload = parsedWidget;
								}

								writer.write({
									type: "data-widget-data",
									id: widgetId,
									data: {
										type: resolvedWidgetType,
										payload: parsedWidget,
									},
								});

								writer.write({
									type: "data-widget-loading",
									id: widgetId,
									data: {
										type: resolvedWidgetType,
										loading: false,
									},
								});
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
								writer.write({
									type: "data-thinking-status",
									data: {
										label: parsedStatus.label || "Thinking...",
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
				};

				// RovoDev Serve: route through the local agent loop
				console.log("[CHAT-SDK] Routing through RovoDev Serve");
				await streamViaRovoDev({
					message: userMessageText,
					onTextDelta: handleStreamTextDelta,
				});

				processTextBuffer(true);

				// Generate mermaid fallback if plan widget was emitted but no diagram
				if (latestPlanPayload !== null && !hasCompleteMermaidDiagram(assistantText)) {
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
		res.status(500).json({
			error: "Internal server error",
			details: error.message,
		});
	}
});
app.post("/api/genui-chat", genuiChatHandler);

app.post("/api/sound-generation", async (req, res) => {
	try {
		const {
			input,
			voice,
			languageCode,
			speed,
			model,
			provider,
			responseFormat,
		} = req.body || {};

		const normalizedInput = getNonEmptyString(input);
		if (!normalizedInput) {
			return res.status(400).json({ error: "Input text is required" });
		}

		if (normalizedInput.length > 4096) {
			return res.status(400).json({
				error: "Input text must be 4096 characters or fewer",
			});
		}

		const normalizedVoice = getNonEmptyString(voice);
		const normalizedFormat = getNonEmptyString(responseFormat) || "mp3";
		const normalizedLanguageCode = getNonEmptyString(languageCode) || "en-US";
		const normalizedRequestedModel = getNonEmptyString(model);
		const normalizedRequestedProvider = getNonEmptyString(provider);

		if (normalizedRequestedModel && normalizedRequestedModel !== "tts-latest") {
			return res.status(400).json({
				error:
					"Sound generation only supports Google tts-latest in this endpoint.",
			});
		}

		if (normalizedRequestedProvider && normalizedRequestedProvider !== "google") {
			return res.status(400).json({
				error:
					"Sound generation only supports provider: google in this endpoint.",
			});
		}

		const normalizedFormatLower = normalizedFormat.toLowerCase();
		const audioEncodingByFormat = {
			mp3: "MP3",
			wav: "LINEAR16",
			pcm: "LINEAR16",
			ogg: "OGG_OPUS",
		};
		const resolvedAudioEncoding = audioEncodingByFormat[normalizedFormatLower] || "MP3";
		const contentTypeByEncoding = {
			MP3: "audio/mpeg",
			LINEAR16: "audio/wav",
			OGG_OPUS: "audio/ogg",
		};

		let normalizedSpeed = 1;
		if (typeof speed === "number" && Number.isFinite(speed)) {
			normalizedSpeed = speed;
		}

		if (normalizedSpeed < 0.25 || normalizedSpeed > 4) {
			return res.status(400).json({
				error: "Speed must be between 0.25 and 4.0",
			});
		}

		const ENV_VARS = getEnvVars();
		const resolvedGatewayUrl =
			ENV_VARS.AI_GATEWAY_URL_GOOGLE || ENV_VARS.AI_GATEWAY_URL;

		if (!resolvedGatewayUrl) {
			return res.status(500).json({ error: "Server configuration error" });
		}

		const endpointType = detectEndpointType(resolvedGatewayUrl);
		if (endpointType !== "google") {
			return res.status(400).json({
				error:
					"Sound generation is configured to use Google TTS (tts-latest). Set AI_GATEWAY_URL_GOOGLE to a Google endpoint.",
			});
		}

		const speechEndpointUrl = buildSpeechEndpointUrl(resolvedGatewayUrl, endpointType);
		if (!speechEndpointUrl) {
			return res.status(500).json({
				error:
					"Unable to derive speech endpoint URL from AI_GATEWAY_URL. Expected a path ending in /chat/completions or /responses.",
			});
		}

		let token;
		try {
			token = await getAuthToken();
		} catch (tokenError) {
			console.error("Sound generation token error:", tokenError);
			return res.status(500).json({ error: "Authentication failed" });
		}

		const speechPayload = {
			input: {
				text: normalizedInput,
			},
			voice: {
				languageCode: normalizedLanguageCode,
				...(normalizedVoice ? { name: normalizedVoice } : {}),
			},
			audioConfig: {
				audioEncoding: resolvedAudioEncoding,
				speakingRate: normalizedSpeed,
			},
		};

		const gatewayResponse = await fetch(speechEndpointUrl, {
			method: "POST",
			headers: getGatewayHeaders(ENV_VARS, token),
			body: JSON.stringify(speechPayload),
		});

		if (!gatewayResponse.ok) {
			const errorText = await gatewayResponse.text();
			console.error(
				"Sound generation gateway error:",
				gatewayResponse.status,
				errorText.substring(0, 500)
			);

			let errorMessage = "Failed to generate audio";
			if (errorText.trim()) {
				try {
					const parsed = JSON.parse(errorText);
					errorMessage =
						getNonEmptyString(parsed?.error?.message) ||
						getNonEmptyString(parsed?.message) ||
						getNonEmptyString(parsed?.error) ||
						getNonEmptyString(parsed?.details) ||
						errorText.trim();
				} catch {
					errorMessage = errorText.trim();
				}
			}

			return res.status(gatewayResponse.status).json({
				error: errorMessage,
			});
		}

		const responseContentType = gatewayResponse.headers.get("content-type") || "";
		let audioBytes;

		if (responseContentType.includes("application/json")) {
			const result = await gatewayResponse.json();
			const audioContent =
				getNonEmptyString(result?.audioContent) ||
				getNonEmptyString(result?.audio?.data) ||
				getNonEmptyString(result?.outputAudio?.audioContent);

			if (!audioContent) {
				return res.status(502).json({
					error: "Google TTS response did not include audioContent",
				});
			}

			audioBytes = Buffer.from(audioContent, "base64");
		} else {
			audioBytes = Buffer.from(await gatewayResponse.arrayBuffer());
		}

		const contentType =
			contentTypeByEncoding[resolvedAudioEncoding] ||
			gatewayResponse.headers.get("content-type") ||
			"audio/mpeg";
		const extension = normalizedFormatLower.replace(/[^a-z0-9]/gi, "") || "mp3";
		const filename = `speech-${Date.now()}.${extension}`;

		res.setHeader("Content-Type", contentType);
		res.setHeader("Content-Length", String(audioBytes.length));
		res.setHeader("Content-Disposition", `inline; filename="${filename}"`);
		return res.status(200).send(audioBytes);
	} catch (error) {
		console.error("Sound generation API error:", error);
		return res.status(500).json({
			error: "Internal server error",
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
		const result = await agentsTeamRunManager.getRunVisualSummary(runId);
		return res.status(200).json(result);
	} catch (error) {
		console.error("[AGENTS-RUN] Failed to load visual summary:", error);
		return res.status(500).json({ error: "Failed to load visual summary" });
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

	debugLog("HEALTH", "Auth configuration", {
		hasAsapKey: !!key,
		rovoDevAvailable,
	});

	const response = {
		status: "OK",
		message: "Backend server is working!",
		timestamp: new Date().toISOString(),
		authMethod: "ASAP",
		debugMode: DEBUG,
		rovoDevMode: rovoDevAvailable,
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
	console.log(`\n🤖 Chat Backend: ${rovoDevReady ? "RovoDev Serve (agent loop)" : "AI Gateway (direct)"}`);
	if (rovoDevReady) {
		console.log(`  ROVODEV_PORT: ${process.env.ROVODEV_PORT}`);
	}
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
