import type { RovoUIMessage } from "@/lib/rovo-ui-messages";

interface StringRecord {
	[key: string]: unknown;
}

export interface ParsedPlanTask {
	id: string;
	label: string;
	blockedBy: string[];
	agent?: string;
}

export interface ParsedPlanWidgetPayload {
	title: string;
	description?: string;
	emoji?: string;
	tasks: ParsedPlanTask[];
	agents: string[];
}

function isStringRecord(value: unknown): value is StringRecord {
	return typeof value === "object" && value !== null;
}

function getNonEmptyString(value: unknown): string | null {
	if (typeof value !== "string") {
		return null;
	}

	const trimmedValue = value.trim();
	return trimmedValue.length > 0 ? trimmedValue : null;
}

function parseTaskItem(
	taskItem: unknown,
	fallbackId: string
): ParsedPlanTask | null {
	if (typeof taskItem === "string") {
		const label = getNonEmptyString(taskItem);
		if (!label) return null;
		return { id: fallbackId, label, blockedBy: [] };
	}

	if (!isStringRecord(taskItem)) {
		return null;
	}

	const label =
		getNonEmptyString(taskItem.label) ??
		getNonEmptyString(taskItem.title) ??
		getNonEmptyString(taskItem.task) ??
		getNonEmptyString(taskItem.text);
	if (!label) return null;

	const id = getNonEmptyString(taskItem.id) ?? fallbackId;
	const blockedBy = Array.isArray(taskItem.blockedBy)
		? (taskItem.blockedBy.filter(
				(item) => typeof item === "string" && item.trim().length > 0
			) as string[])
		: [];
	const agent = getNonEmptyString(taskItem.agent) ?? undefined;

	return { id, label, blockedBy, agent };
}

export function parsePlanWidgetPayload(
	value: unknown
): ParsedPlanWidgetPayload | null {
	if (!isStringRecord(value)) {
		return null;
	}

	const record = isStringRecord(value.payload) ? value.payload : value;
	const title =
		getNonEmptyString(record.title) ??
		getNonEmptyString(record.name) ??
		getNonEmptyString(record.planTitle);
	const taskCandidates = Array.isArray(record.tasks)
		? record.tasks
		: Array.isArray(record.steps)
			? record.steps
			: null;

	if (!title || !taskCandidates) {
		return null;
	}

	const tasks = taskCandidates
		.map((task, index) => parseTaskItem(task, `task-${index + 1}`))
		.filter((task): task is ParsedPlanTask => task !== null);
	if (tasks.length === 0) {
		return null;
	}

	const description =
		getNonEmptyString(record.description) ??
		getNonEmptyString(record.subtitle) ??
		undefined;
	const emoji = getNonEmptyString(record.emoji) ?? undefined;

	const agentSet = new Set<string>();
	for (const task of tasks) {
		if (task.agent) {
			agentSet.add(task.agent);
		}
	}
	const agents = Array.from(agentSet).sort();

	return {
		title,
		description,
		emoji,
		tasks,
		agents,
	};
}

export function getLatestPlanWidgetPayload(
	messages: ReadonlyArray<RovoUIMessage>
): ParsedPlanWidgetPayload | null {
	for (let messageIndex = messages.length - 1; messageIndex >= 0; messageIndex--) {
		const message = messages[messageIndex];
		if (message.role !== "assistant") {
			continue;
		}

		for (let partIndex = message.parts.length - 1; partIndex >= 0; partIndex--) {
			const part = message.parts[partIndex] as {
				type?: string;
				data?: {
					type?: unknown;
					payload?: unknown;
				};
			};

			if (part.type !== "data-widget-data") {
				continue;
			}

			const widgetType = getNonEmptyString(part.data?.type);
			if (!widgetType) {
				continue;
			}

			if (widgetType !== "plan") {
				return null;
			}

			return parsePlanWidgetPayload(part.data?.payload);
		}
	}

	return null;
}
