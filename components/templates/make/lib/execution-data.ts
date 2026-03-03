import type {
	AgentExecutionStatus,
	AgentExecutionUpdate,
	RovoUIMessage,
} from "@/lib/rovo-ui-messages";
import type { ParsedPlanTask } from "@/components/templates/shared/lib/plan-widget";
import type { AgentRun, AgentRunTask } from "@/lib/make-run-types";

export type TaskStatus = "todo" | "in-progress" | "in-review" | "failed" | "done";

export interface ExecutionTask {
	id: string;
	label: string;
	status: TaskStatus;
	agentName?: string;
}

export interface TaskExecution {
	taskId: string;
	taskLabel: string;
	agentId: string;
	agentName: string;
	agentAvatarUrl?: string;
	status: AgentExecutionStatus;
	content: string;
	attempts?: number;
	permanentlyFailed?: boolean;
}

/** Maximum total attempts per task (initial + 2 retries). */
export const MAX_TASK_ATTEMPTS = 3;

/**
 * Checks whether a task has exhausted all retry attempts.
 */
export function isTaskPermanentlyFailed(task: TaskExecution): boolean {
	return task.status === "failed" && (task.attempts ?? 1) >= MAX_TASK_ATTEMPTS;
}

/**
 * Checks whether a task is actively running or in-progress.
 * Used to filter which panes appear in the execution grid.
 */
export function isTaskActive(task: TaskExecution): boolean {
	return task.status === "working";
}

/**
 * Derive a short agent display name from a task label.
 * Extracts the key noun/verb phrase and appends "Agent".
 *
 * Examples:
 *   "Build the API endpoints" -> "API Agent"
 *   "Design the frontend layout" -> "Frontend Agent"
 *   "Write database migrations" -> "Database Agent"
 *   "Set up authentication" -> "Authentication Agent"
 */
export function deriveAgentNameFromTask(taskLabel: string): string {
	const cleaned = stripTaskMarkdownDecorators(taskLabel);

	// Try to extract a key noun from the label:
	// Pattern: look for common task verb prefixes and grab what follows
	const verbPrefixes =
		/^(?:build|create|design|develop|implement|set\s+up|write|add|configure|deploy|integrate|fix|update|refactor|test|review|optimize|migrate|generate|analyze|establish)\s+(?:the\s+|a\s+|an\s+)?/i;
	const afterVerb = cleaned.replace(verbPrefixes, "");

	// Take the first meaningful word(s) as the agent identity
	const words = afterVerb.split(/[\s\u2014\u2013\-:,]+/).filter(Boolean);
	if (words.length === 0) {
		return "Agent";
	}

	// Capitalize the first word and use it as the agent name
	const keyWord = words[0];
	const capitalized = keyWord.charAt(0).toUpperCase() + keyWord.slice(1).toLowerCase();

	// If the word already ends in "agent" (case-insensitive), just return it capitalized
	if (/agent$/i.test(capitalized)) {
		return capitalized;
	}

	return `${capitalized} Agent`;
}

export type AgentExecution = TaskExecution;

export interface TaskStatusGroups {
	done: ExecutionTask[];
	inReview: ExecutionTask[];
	inProgress: ExecutionTask[];
	failed: ExecutionTask[];
	todo: ExecutionTask[];
}

export interface ProgressDisplayTask {
	id: string;
	label: string;
	description: string;
	agentName?: string;
	agentAvatarSrc?: string;
}

export interface ProgressDisplayStatusGroups {
	done: ProgressDisplayTask[];
	inReview: ProgressDisplayTask[];
	inProgress: ProgressDisplayTask[];
	failed: ProgressDisplayTask[];
	todo: ProgressDisplayTask[];
}

/**
 * Returns true when the run is still in the task execution phase.
 * We keep the execution grid visible while any task is not marked done.
 */
export function isRunExecutionPhase(run: AgentRun | null): boolean {
	if (!run || run.status !== "running") {
		return false;
	}

	return run.tasks.some((task) => task.status !== "done");
}

function agentStatusToTaskStatus(agentStatus: AgentExecutionStatus): TaskStatus {
	if (agentStatus === "completed") return "done";
	if (agentStatus === "failed") return "failed";
	return "in-progress";
}

function runTaskStatusToTaskStatus(runTaskStatus: AgentRunTask["status"]): TaskStatus {
	if (runTaskStatus === "done") return "done";
	if (runTaskStatus === "in-progress") return "in-progress";
	if (runTaskStatus === "failed" || runTaskStatus === "blocked-failed") return "failed";
	return "todo";
}

function stripTaskMarkdownDecorators(label: string): string {
	return label
		.replace(/\*\*([^*\n]+)\*\*/g, "$1")
		.replace(/__([^_\n]+)__/g, "$1")
		.replace(/^[*_`\s]+/, "")
		.replace(/[\s*_`]+$/, "")
		.trim();
}

export function extractTaskHeading(label: string): string {
	const normalizedLabel = stripTaskMarkdownDecorators(label);
	if (!normalizedLabel) return label || "Untitled task";
	const emDashIndex = normalizedLabel.indexOf("\u2014");
	if (emDashIndex === -1) return normalizedLabel;
	const heading = stripTaskMarkdownDecorators(normalizedLabel.slice(0, emDashIndex));
	return heading.length > 0 ? heading : normalizedLabel;
}

export function extractAgentExecutionUpdates(
	messages: ReadonlyArray<RovoUIMessage>
): AgentExecutionUpdate[] {
	const updates: AgentExecutionUpdate[] = [];

	for (const message of messages) {
		if (message.role !== "assistant") continue;

		for (const part of message.parts) {
			if (part.type !== "data-agent-execution") continue;
			const data = (part as { data: AgentExecutionUpdate }).data;
			if (data.agentId && data.taskId) {
				updates.push(data);
			}
		}
	}

	return updates;
}

export function buildTaskExecutions(
	updates: AgentExecutionUpdate[]
): TaskExecution[] {
	const latestByTaskId = new Map<string, TaskExecution>();

	for (const update of updates) {
		const existing = latestByTaskId.get(update.taskId);
		if (existing) {
			existing.status = update.status;
			existing.agentName = update.agentName;
			existing.taskId = update.taskId;
			existing.taskLabel = update.taskLabel;
			if (update.content) {
				existing.content = `${existing.content}${update.content}`;
			}
		} else {
			latestByTaskId.set(update.taskId, {
				taskId: update.taskId,
				taskLabel: update.taskLabel,
				agentId: update.agentId,
				agentName: update.agentName,
				status: update.status,
				content: update.content ?? "",
			});
		}
	}

	return Array.from(latestByTaskId.values());
}

export function computeTaskStatusGroups(
	planTasks: ReadonlyArray<ParsedPlanTask>,
	updates: AgentExecutionUpdate[]
): TaskStatusGroups {
	const taskStatusMap = new Map<string, { status: TaskStatus; agentName?: string }>();

	for (const task of planTasks) {
		taskStatusMap.set(task.id, { status: "todo", agentName: task.agent });
	}

	for (const update of updates) {
		const existing = taskStatusMap.get(update.taskId);
		if (existing) {
			existing.status = agentStatusToTaskStatus(update.status);
			existing.agentName = update.agentName;
		}
	}

	const groups: TaskStatusGroups = {
		done: [],
		inReview: [],
		inProgress: [],
		failed: [],
		todo: [],
	};

	for (const task of planTasks) {
		const info = taskStatusMap.get(task.id);
		if (!info) continue;

		const executionTask: ExecutionTask = {
			id: task.id,
			label: task.label,
			status: info.status,
			agentName: info.agentName,
		};

		if (info.status === "done") {
			groups.done.push(executionTask);
		} else if (info.status === "in-review") {
			groups.inReview.push(executionTask);
		} else if (info.status === "in-progress") {
			groups.inProgress.push(executionTask);
		} else if (info.status === "failed") {
			groups.failed.push(executionTask);
		} else {
			groups.todo.push(executionTask);
		}
	}

	return groups;
}

export function computeTaskStatusGroupsFromRun(
	runTasks: ReadonlyArray<AgentRunTask>
): TaskStatusGroups {
	const groups: TaskStatusGroups = {
		done: [],
		inReview: [],
		inProgress: [],
		failed: [],
		todo: [],
	};

	for (const task of runTasks) {
		const mappedStatus = runTaskStatusToTaskStatus(task.status);
		const executionTask: ExecutionTask = {
			id: task.id,
			label: task.label,
			status: mappedStatus,
			agentName: task.agentName,
		};

		if (mappedStatus === "done") {
			groups.done.push(executionTask);
		} else if (mappedStatus === "in-review") {
			groups.inReview.push(executionTask);
		} else if (mappedStatus === "in-progress") {
			groups.inProgress.push(executionTask);
		} else if (mappedStatus === "failed") {
			groups.failed.push(executionTask);
		} else {
			groups.todo.push(executionTask);
		}
	}

	return groups;
}

function toProgressDisplayTask(task: ExecutionTask): ProgressDisplayTask {
	return {
		id: task.id,
		label: extractTaskHeading(task.label),
		description: task.id,
		agentName: task.agentName,
	};
}

export function toProgressDisplayStatusGroups(
	taskStatusGroups: TaskStatusGroups
): ProgressDisplayStatusGroups {
	return {
		done: taskStatusGroups.done.map(toProgressDisplayTask),
		inReview: taskStatusGroups.inReview.map(toProgressDisplayTask),
		inProgress: taskStatusGroups.inProgress.map(toProgressDisplayTask),
		failed: taskStatusGroups.failed.map(toProgressDisplayTask),
		todo: taskStatusGroups.todo.map(toProgressDisplayTask),
	};
}

export function deriveTaskExecutionsFromRun(
	run: AgentRun | null,
	updates: ReadonlyArray<AgentExecutionUpdate> = []
): TaskExecution[] {
	const streamedExecutions = buildTaskExecutions([...updates]);
	if (!run) {
		return streamedExecutions;
	}

	const agentsById = new Map(
		(run.agents ?? []).map((agent) => [agent.agentId, agent] as const),
	);

	const runExecutions: TaskExecution[] = (run.tasks ?? []).flatMap((task) => {
		if (task.status === "todo") {
			return [];
		}

		const status: AgentExecutionStatus =
			task.status === "done"
				? "completed"
				: task.status === "failed" || task.status === "blocked-failed"
					? "failed"
					: "working";
		const agent = agentsById.get(task.agentId);
		const isCurrentTask = agent?.currentTaskId === task.id;
		const content =
			(isCurrentTask ? agent?.latestContent : null) ||
			task.outputSummary ||
			task.output ||
			task.error ||
			"";

		return [
			{
				taskId: task.id,
				taskLabel: task.label,
				agentId: task.agentId,
				agentName: task.agentName || agent?.agentName || "Agent",
				status,
				content,
				attempts: task.attempts,
				permanentlyFailed: status === "failed" && task.attempts >= MAX_TASK_ATTEMPTS,
			},
		];
	});

	return runExecutions.length > 0 ? runExecutions : streamedExecutions;
}
