import type {
	AgentExecutionStatus,
	AgentExecutionUpdate,
	RovoUIMessage,
} from "@/lib/rovo-ui-messages";
import type { ParsedPlanTask } from "@/components/templates/shared/lib/plan-widget";
import type { AgentRun, AgentRunTask } from "@/lib/plan-run-types";

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

	const agentsById = new Map(run.agents.map((agent) => [agent.agentId, agent] as const));

	const runExecutions: TaskExecution[] = run.tasks.flatMap((task) => {
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
			},
		];
	});

	return runExecutions.length > 0 ? runExecutions : streamedExecutions;
}
