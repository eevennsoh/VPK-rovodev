const MAX_TASKS = 20;
const DEFAULT_MIN_TASKS = 2;
const MAX_RECURSION_DEPTH = 6;

function getNonEmptyString(value) {
	if (typeof value !== "string") {
		return null;
	}

	const trimmedValue = value.trim();
	return trimmedValue.length > 0 ? trimmedValue : null;
}

function normalizeWhitespace(value) {
	return value.replace(/\s+/g, " ").trim();
}

function truncateWords(value, maxWords) {
	const words = value.split(/\s+/).filter(Boolean);
	return words.slice(0, maxWords).join(" ").trim();
}

function looksLikeGenericTitle(value) {
	const normalized = normalizeWhitespace((value || "").toLowerCase());
	if (!normalized) {
		return true;
	}

	return (
		normalized === "plan" ||
		normalized === "execution plan" ||
		normalized === "project plan" ||
		normalized === "todo plan" ||
		normalized === "task plan"
	);
}

function derivePlanTitle(tasks, preferredTitle) {
	const normalizedPreferredTitle = getNonEmptyString(preferredTitle);
	if (normalizedPreferredTitle && !looksLikeGenericTitle(normalizedPreferredTitle)) {
		return truncateWords(normalizedPreferredTitle, 8);
	}

	for (const task of tasks) {
		const normalizedLabel = getNonEmptyString(task.label);
		if (!normalizedLabel) {
			continue;
		}

		return truncateWords(normalizedLabel, 8);
	}

	return "Implementation plan";
}

function isUpdateTodoToolName(toolName) {
	const normalizedToolName = getNonEmptyString(toolName);
	if (!normalizedToolName) {
		return false;
	}

	const lowered = normalizedToolName.toLowerCase();
	if (lowered === "update_todo") {
		return true;
	}

	return /(?:^|[./:_-])update_todo$/.test(lowered);
}

function normalizeBlockedBy(value) {
	if (!Array.isArray(value)) {
		return [];
	}

	return value
		.filter((entry) => typeof entry === "string" && entry.trim().length > 0)
		.map((entry) => entry.trim());
}

function normalizeTaskRecord(record, fallbackIndex) {
	if (!record || typeof record !== "object") {
		return null;
	}

	const label =
		getNonEmptyString(record.content) ||
		getNonEmptyString(record.label) ||
		getNonEmptyString(record.title) ||
		getNonEmptyString(record.task) ||
		getNonEmptyString(record.text) ||
		getNonEmptyString(record.active_form);
	if (!label) {
		return null;
	}

	const idValue = getNonEmptyString(record.id);
	const id = idValue || `task-${fallbackIndex + 1}`;

	return {
		id,
		label: normalizeWhitespace(label),
		blockedBy: normalizeBlockedBy(record.blockedBy),
	};
}

function collectTasksFromTodoArray(value, maxTasks) {
	if (!Array.isArray(value)) {
		return [];
	}

	const tasks = [];
	for (const [index, entry] of value.entries()) {
		const normalizedTask = normalizeTaskRecord(entry, index);
		if (!normalizedTask) {
			continue;
		}

		tasks.push(normalizedTask);
		if (tasks.length >= maxTasks) {
			break;
		}
	}

	return tasks;
}

function parseJsonCandidate(value) {
	if (typeof value !== "string") {
		return null;
	}

	try {
		return JSON.parse(value);
	} catch {
		return null;
	}
}

function parseTodoJsonLine(line) {
	const trimmedLine = line.trim();
	if (!trimmedLine) {
		return null;
	}

	const lineWithoutListPrefix = trimmedLine.replace(/^[-*+]\s+/, "");
	const directJson = parseJsonCandidate(lineWithoutListPrefix);
	if (directJson) {
		return directJson;
	}

	const objectMatch = lineWithoutListPrefix.match(/(\{[\s\S]*\})/);
	if (!objectMatch?.[1]) {
		return null;
	}

	return parseJsonCandidate(objectMatch[1]);
}

function extractTodoBlock(text) {
	const markerIndex = text.toLowerCase().indexOf("<todo>");
	if (markerIndex === -1) {
		return null;
	}

	let block = text.slice(markerIndex + "<todo>".length);
	const endIndex = block.toLowerCase().indexOf("</todo>");
	if (endIndex !== -1) {
		block = block.slice(0, endIndex);
	}

	return block;
}

function collectTasksFromText(value, maxTasks) {
	const text = getNonEmptyString(value);
	if (!text) {
		return [];
	}

	const todoBlock = extractTodoBlock(text) || text;
	const parsedTasks = [];

	const lines = todoBlock.split(/\r?\n/);
	for (const line of lines) {
		if (parsedTasks.length >= maxTasks) {
			break;
		}

		const parsedLine = parseTodoJsonLine(line);
		if (!parsedLine) {
			continue;
		}

		if (Array.isArray(parsedLine)) {
			const nestedTasks = collectTasksFromTodoArray(parsedLine, maxTasks - parsedTasks.length);
			parsedTasks.push(...nestedTasks);
			continue;
		}

		const normalizedTask = normalizeTaskRecord(parsedLine, parsedTasks.length);
		if (normalizedTask) {
			parsedTasks.push(normalizedTask);
		}
	}

	return parsedTasks;
}

function collectTasksFromRawOutput(value, maxTasks, depth = 0) {
	if (depth > MAX_RECURSION_DEPTH || value === null || value === undefined) {
		return [];
	}

	if (typeof value === "string") {
		return collectTasksFromText(value, maxTasks);
	}

	if (Array.isArray(value)) {
		const directTasks = collectTasksFromTodoArray(value, maxTasks);
		if (directTasks.length > 0) {
			return directTasks;
		}

		const nestedTasks = [];
		for (const entry of value) {
			if (nestedTasks.length >= maxTasks) {
				break;
			}

			const nextTasks = collectTasksFromRawOutput(
				entry,
				maxTasks - nestedTasks.length,
				depth + 1
			);
			if (nextTasks.length > 0) {
				nestedTasks.push(...nextTasks);
			}
		}

		return nestedTasks;
	}

	if (typeof value !== "object") {
		return [];
	}

	const record = value;

	const directTaskArrays = [
		record.todos,
		record.tasks,
		record.items,
	];
	for (const candidate of directTaskArrays) {
		const directTasks = collectTasksFromTodoArray(candidate, maxTasks);
		if (directTasks.length > 0) {
			return directTasks;
		}
	}

	const textKeys = [
		"output",
		"outputPreview",
		"result",
		"message",
		"text",
		"stdout",
		"content",
	];
	for (const key of textKeys) {
		const textTasks = collectTasksFromText(record[key], maxTasks);
		if (textTasks.length > 0) {
			return textTasks;
		}
	}

	for (const nestedValue of Object.values(record)) {
		const nestedTasks = collectTasksFromRawOutput(nestedValue, maxTasks, depth + 1);
		if (nestedTasks.length > 0) {
			return nestedTasks;
		}
	}

	return [];
}

function dedupeTasks(tasks, maxTasks) {
	const seenLabels = new Set();
	const dedupedTasks = [];

	for (const [index, task] of tasks.entries()) {
		const normalizedLabel = normalizeWhitespace(task.label).toLowerCase();
		if (!normalizedLabel || seenLabels.has(normalizedLabel)) {
			continue;
		}

		seenLabels.add(normalizedLabel);
		dedupedTasks.push({
			id: task.id || `task-${index + 1}`,
			label: normalizeWhitespace(task.label),
			blockedBy: Array.isArray(task.blockedBy) ? task.blockedBy : [],
		});
		if (dedupedTasks.length >= maxTasks) {
			break;
		}
	}

	return dedupedTasks.map((task, index) => ({
		id: `task-${index + 1}`,
		label: task.label,
		blockedBy: task.blockedBy,
	}));
}

function extractTasksFromObservation(observation, maxTasks) {
	if (!observation || typeof observation !== "object") {
		return [];
	}

	const rawOutputTasks = collectTasksFromRawOutput(observation.rawOutput, maxTasks);
	if (rawOutputTasks.length > 0) {
		return dedupeTasks(rawOutputTasks, maxTasks);
	}

	const textTasks = collectTasksFromText(observation.text, maxTasks);
	if (textTasks.length > 0) {
		return dedupeTasks(textTasks, maxTasks);
	}

	return [];
}

function extractUpdateTodoPlanPayloadFromObservations(observations, options = {}) {
	if (!Array.isArray(observations) || observations.length === 0) {
		return null;
	}

	const minTasks =
		typeof options.minTasks === "number" && options.minTasks > 0
			? Math.floor(options.minTasks)
			: DEFAULT_MIN_TASKS;
	const maxTasks =
		typeof options.maxTasks === "number" && options.maxTasks > 0
			? Math.floor(options.maxTasks)
			: MAX_TASKS;

	for (let index = observations.length - 1; index >= 0; index -= 1) {
		const observation = observations[index];
		if (!observation || typeof observation !== "object") {
			continue;
		}

		if (observation.phase !== "result") {
			continue;
		}

		if (!isUpdateTodoToolName(observation.toolName)) {
			continue;
		}

		const tasks = extractTasksFromObservation(observation, maxTasks);
		if (tasks.length < minTasks) {
			continue;
		}

		return {
			type: "plan",
			title: derivePlanTitle(tasks, options.title),
			tasks,
		};
	}

	return null;
}

module.exports = {
	extractUpdateTodoPlanPayloadFromObservations,
};
