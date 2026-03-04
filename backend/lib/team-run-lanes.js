const MAX_TEAM_AGENT_COUNT = 4;
const DEFAULT_CONTEXT_MAX_MESSAGES = 12;
const DEFAULT_CONTEXT_MAX_CHARS = 8000;
const DEFAULT_CONTEXT_MAX_ENTRY_CHARS = 1200;
const DEFAULT_FALLBACK_LANE_NAMES = [
	"Implementation Agent",
	"Frontend Agent",
	"Backend Agent",
	"QA Agent",
	"Integration Agent",
	"Platform Agent",
	"Validation Agent",
	"Release Agent",
];

const TOKEN_STOPWORDS = new Set([
	"a",
	"an",
	"and",
	"are",
	"as",
	"at",
	"be",
	"build",
	"by",
	"create",
	"for",
	"from",
	"implement",
	"in",
	"into",
	"is",
	"it",
	"of",
	"on",
	"or",
	"set",
	"setup",
	"task",
	"tasks",
	"that",
	"the",
	"to",
	"up",
	"use",
	"with",
	"write",
]);

const TOKEN_SYNONYMS = new Map([
	["frontend", "frontend"],
	["ui", "frontend"],
	["ux", "frontend"],
	["client", "frontend"],
	["component", "frontend"],
	["components", "frontend"],
	["layout", "frontend"],
	["styles", "frontend"],
	["styling", "frontend"],
	["dashboard", "frontend"],
	["dashboards", "frontend"],
	["css", "frontend"],
	["backend", "backend"],
	["api", "backend"],
	["server", "backend"],
	["endpoint", "backend"],
	["endpoints", "backend"],
	["service", "backend"],
	["services", "backend"],
	["database", "data"],
	["db", "data"],
	["data", "data"],
	["schema", "data"],
	["migration", "data"],
	["migrations", "data"],
	["query", "data"],
	["queries", "data"],
	["sql", "data"],
	["test", "qa"],
	["tests", "qa"],
	["testing", "qa"],
	["qa", "qa"],
	["quality", "qa"],
	["bug", "qa"],
	["bugs", "qa"],
	["review", "qa"],
	["check", "qa"],
	["checks", "qa"],
	["auth", "auth"],
	["authentication", "auth"],
	["security", "auth"],
	["integration", "integration"],
	["integrations", "integration"],
	["deploy", "deploy"],
	["deployment", "deploy"],
]);

const TOKEN_DISPLAY_NAMES = new Map([
	["frontend", "Frontend"],
	["backend", "Backend"],
	["data", "Data"],
	["qa", "QA"],
	["auth", "Auth"],
	["integration", "Integration"],
	["deploy", "Deployment"],
	["api", "API"],
	["ui", "UI"],
	["ux", "UX"],
	["db", "DB"],
	["ai", "AI"],
]);

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

function getNonEmptyString(value) {
	if (typeof value !== "string") {
		return null;
	}

	const trimmedValue = value.trim();
	return trimmedValue.length > 0 ? trimmedValue : null;
}

function normalizeTeamAgentCount(value, defaultValue = 1) {
	const parsedCount = typeof value === "number" ? value : Number.parseInt(value, 10);
	if (!Number.isFinite(parsedCount)) {
		return defaultValue;
	}

	const clamped = Math.max(1, Math.min(MAX_TEAM_AGENT_COUNT, Math.trunc(parsedCount)));
	return clamped;
}

function normalizeTaskToken(rawToken) {
	const cleaned = rawToken.toLowerCase().replace(/[^a-z0-9]/g, "");
	if (!cleaned || cleaned.length < 2) {
		return null;
	}
	if (TOKEN_STOPWORDS.has(cleaned)) {
		return null;
	}
	return TOKEN_SYNONYMS.get(cleaned) || cleaned;
}

function tokenizeTaskLabel(value) {
	const normalizedLabel = getNonEmptyString(value);
	if (!normalizedLabel) {
		return [];
	}

	return normalizedLabel
		.split(/[^a-zA-Z0-9]+/)
		.map((token) => normalizeTaskToken(token))
		.filter(Boolean);
}

function toLaneDisplayName(token) {
	const displayBase = TOKEN_DISPLAY_NAMES.get(token);
	if (!displayBase) {
		return null;
	}
	return `${displayBase} Agent`;
}

function collectLaneCandidateScores(tasks) {
	const scores = new Map();
	for (const task of tasks) {
		const tokens = tokenizeTaskLabel(task.label);
		for (const token of tokens) {
			scores.set(token, (scores.get(token) || 0) + 1);
		}
	}
	return scores;
}

function buildContextualLaneNames(tasks, laneCount, usedNames = new Set()) {
	const scores = collectLaneCandidateScores(tasks);
	const rankedTokens = Array.from(scores.entries())
		.sort((leftEntry, rightEntry) => {
			if (rightEntry[1] !== leftEntry[1]) {
				return rightEntry[1] - leftEntry[1];
			}
			return leftEntry[0].localeCompare(rightEntry[0]);
		})
		.map(([token]) => token);

	const laneNames = [];
	for (const token of rankedTokens) {
		if (laneNames.length >= laneCount) {
			break;
		}

		const candidateName = toLaneDisplayName(token);
		if (!candidateName) {
			continue;
		}
		const loweredCandidateName = candidateName.toLowerCase();
		if (usedNames.has(loweredCandidateName)) {
			continue;
		}

		laneNames.push(candidateName);
		usedNames.add(loweredCandidateName);
	}

	let fallbackIndex = 0;
	while (laneNames.length < laneCount) {
		const baseName =
			DEFAULT_FALLBACK_LANE_NAMES[
				fallbackIndex % DEFAULT_FALLBACK_LANE_NAMES.length
			];
		const cycle = Math.floor(
			fallbackIndex / DEFAULT_FALLBACK_LANE_NAMES.length
		);
		const fallbackName = cycle > 0 ? `${baseName} ${cycle + 1}` : baseName;
		fallbackIndex += 1;
		const loweredFallbackName = fallbackName.toLowerCase();
		if (usedNames.has(loweredFallbackName)) {
			continue;
		}

		laneNames.push(fallbackName);
		usedNames.add(loweredFallbackName);
	}

	return laneNames;
}

function normalizeConfiguredLaneNames(configuredLaneNames, laneCount) {
	if (!Array.isArray(configuredLaneNames)) {
		return [];
	}

	const normalizedLaneNames = [];
	const usedNames = new Set();
	for (const rawName of configuredLaneNames) {
		if (normalizedLaneNames.length >= laneCount) {
			break;
		}

		const normalizedName = getNonEmptyString(rawName);
		if (!normalizedName) {
			continue;
		}

		const loweredName = normalizedName.toLowerCase();
		if (usedNames.has(loweredName)) {
			continue;
		}

		normalizedLaneNames.push(normalizedName);
		usedNames.add(loweredName);
	}

	return normalizedLaneNames;
}

function resolveRunLaneDefinitions({
	tasks,
	agentCount,
	configuredLaneNames,
}) {
	const laneCount = normalizeTeamAgentCount(agentCount, 1);
	const safeTasks = Array.isArray(tasks) ? tasks : [];

	const laneNames = normalizeConfiguredLaneNames(configuredLaneNames, laneCount);
	const usedNames = new Set(laneNames.map((laneName) => laneName.toLowerCase()));

	if (laneNames.length < laneCount) {
		laneNames.push(
			...buildContextualLaneNames(safeTasks, laneCount - laneNames.length, usedNames)
		);
	}

	return laneNames.map((agentName, index) => ({
		agentId: `lane-${index + 1}`,
		agentName,
		laneIndex: index,
	}));
}

function buildLaneTokenMap(laneDefinitions) {
	return laneDefinitions.map((lane) => {
		const laneTokens = tokenizeTaskLabel(lane.agentName).filter(
			(token) => token !== "team" && token !== "generalist" && token !== "agent"
		);
		return laneTokens;
	});
}

function resolveTaskLaneIndex({
	task,
	laneDefinitions,
	laneTokenMap,
	laneLoad,
}) {
	const explicitLaneIndexMatch = /^lane-(\d+)$/i.exec(getNonEmptyString(task.agentId) || "");
	if (explicitLaneIndexMatch) {
		const laneIndex = Number.parseInt(explicitLaneIndexMatch[1], 10) - 1;
		if (laneIndex >= 0 && laneIndex < laneDefinitions.length) {
			return laneIndex;
		}
	}

	const normalizedAgentName = (getNonEmptyString(task.agentName) || "").toLowerCase();
	if (normalizedAgentName) {
		const byNameIndex = laneDefinitions.findIndex(
			(lane) => lane.agentName.toLowerCase() === normalizedAgentName
		);
		if (byNameIndex >= 0) {
			return byNameIndex;
		}
	}

	const taskTokens = tokenizeTaskLabel(task.label);
	let bestLaneIndex = -1;
	let bestScore = 0;

	for (let index = 0; index < laneDefinitions.length; index += 1) {
		const laneTokens = laneTokenMap[index];
		if (!laneTokens || laneTokens.length === 0) {
			continue;
		}

		let score = 0;
		for (const laneToken of laneTokens) {
			if (taskTokens.includes(laneToken)) {
				score += 1;
			}
		}

		if (score > bestScore) {
			bestLaneIndex = index;
			bestScore = score;
			continue;
		}

		if (score === bestScore && score > 0 && bestLaneIndex >= 0) {
			if (laneLoad[index] < laneLoad[bestLaneIndex]) {
				bestLaneIndex = index;
			} else if (
				laneLoad[index] === laneLoad[bestLaneIndex] &&
				index < bestLaneIndex
			) {
				bestLaneIndex = index;
			}
		}
	}

	if (bestLaneIndex >= 0) {
		return bestLaneIndex;
	}

	return laneDefinitions.reduce((bestIndex, _lane, index) => {
		if (laneLoad[index] < laneLoad[bestIndex]) {
			return index;
		}
		if (laneLoad[index] === laneLoad[bestIndex] && index < bestIndex) {
			return index;
		}
		return bestIndex;
	}, 0);
}

function assignTasksToLanes(tasks, laneDefinitions) {
	if (!Array.isArray(tasks) || tasks.length === 0) {
		return [];
	}
	if (!Array.isArray(laneDefinitions) || laneDefinitions.length === 0) {
		return tasks;
	}

	const laneTokenMap = buildLaneTokenMap(laneDefinitions);
	const laneLoad = laneDefinitions.map(() => 0);

	return tasks.map((task) => {
		const laneIndex = resolveTaskLaneIndex({
			task,
			laneDefinitions,
			laneTokenMap,
			laneLoad,
		});
		laneLoad[laneIndex] += 1;
		const lane = laneDefinitions[laneIndex];

		return {
			...task,
			agentId: lane.agentId,
			agentName: lane.agentName,
		};
	});
}

function normalizeConversationEntry(entry, maxEntryChars) {
	if (!entry || typeof entry !== "object") {
		return null;
	}

	const type =
		entry.role === "assistant" || entry.type === "assistant"
			? "assistant"
			: "user";
	let content =
		getNonEmptyString(entry.content) || getNonEmptyString(entry.text) || null;
	if (!content) {
		return null;
	}

	if (content.length > maxEntryChars) {
		content = `${content.slice(0, Math.max(1, maxEntryChars - 3))}...`;
	}

	return {
		type,
		content,
	};
}

function resolveConversationBudget(options = {}) {
	const maxMessages =
		getPositiveInteger(options.maxMessages) ||
		getPositiveInteger(process.env.AGENTS_TEAM_CONTEXT_MAX_MESSAGES) ||
		DEFAULT_CONTEXT_MAX_MESSAGES;
	const maxChars =
		getPositiveInteger(options.maxChars) ||
		getPositiveInteger(process.env.AGENTS_TEAM_CONTEXT_MAX_CHARS) ||
		DEFAULT_CONTEXT_MAX_CHARS;
	const maxEntryChars =
		getPositiveInteger(options.maxEntryChars) ||
		getPositiveInteger(process.env.AGENTS_TEAM_CONTEXT_MAX_ENTRY_CHARS) ||
		DEFAULT_CONTEXT_MAX_ENTRY_CHARS;

	return {
		maxMessages,
		maxChars,
		maxEntryChars,
	};
}

function pruneConversationEntries(entries, budget) {
	if (!Array.isArray(entries) || entries.length === 0) {
		return [];
	}

	const boundedEntries = [];
	let totalChars = 0;

	for (let index = entries.length - 1; index >= 0; index -= 1) {
		if (boundedEntries.length >= budget.maxMessages) {
			break;
		}

		const entry = entries[index];
		if (!entry?.content) {
			continue;
		}

		const nextTotalChars = totalChars + entry.content.length;
		if (nextTotalChars > budget.maxChars && boundedEntries.length > 0) {
			continue;
		}

		boundedEntries.push(entry);
		totalChars = Math.min(nextTotalChars, budget.maxChars);
	}

	return boundedEntries.reverse();
}

function buildConversationContextWithBudget(rawConversation, options = {}) {
	if (!Array.isArray(rawConversation)) {
		return [];
	}

	const budget = resolveConversationBudget(options);
	const normalizedEntries = rawConversation
		.map((entry) => normalizeConversationEntry(entry, budget.maxEntryChars))
		.filter(Boolean);

	return pruneConversationEntries(normalizedEntries, budget);
}

function mergeConversationContextWithBudget(existingConversation, nextConversation, options = {}) {
	const mergedEntries = [
		...(Array.isArray(existingConversation) ? existingConversation : []),
		...(Array.isArray(nextConversation) ? nextConversation : []),
	];
	return buildConversationContextWithBudget(mergedEntries, options);
}

function ensureRunLaneDefinitions(run) {
	const safeRun = run && typeof run === "object" ? run : {};
	return resolveRunLaneDefinitions({
		tasks: Array.isArray(safeRun.tasks) ? safeRun.tasks : [],
		agentCount: normalizeTeamAgentCount(safeRun.agentCount, 1),
		configuredLaneNames: Array.isArray(safeRun?.plan?.agents)
			? safeRun.plan.agents
			: Array.isArray(safeRun.agents)
				? safeRun.agents.map((agent) => agent.agentName)
				: [],
	});
}

module.exports = {
	MAX_TEAM_AGENT_COUNT,
	normalizeTeamAgentCount,
	resolveRunLaneDefinitions,
	assignTasksToLanes,
	buildConversationContextWithBudget,
	mergeConversationContextWithBudget,
	ensureRunLaneDefinitions,
};
