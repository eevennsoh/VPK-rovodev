import type {
	AgentExecutionStatus,
	AgentExecutionUpdate,
	RovoUIMessage,
} from "@/lib/rovo-ui-messages";
import type { ParsedPlanTask } from "@/components/templates/shared/lib/plan-widget";
import type { AgentRun, AgentRunTask } from "@/lib/agents-team-run-types";

export type TaskStatus = "todo" | "in-progress" | "in-review" | "done" | "failed";

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
	todo: ExecutionTask[];
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
	const latestByAgent = new Map<string, TaskExecution>();

	for (const update of updates) {
		const existing = latestByAgent.get(update.agentId);
		if (existing) {
			const hasTaskChanged = existing.taskId !== update.taskId;
			existing.status = update.status;
			existing.agentName = update.agentName;
			existing.taskId = update.taskId;
			existing.taskLabel = update.taskLabel;
			if (update.content) {
				existing.content = hasTaskChanged
					? update.content
					: `${existing.content}${update.content}`;
			}
		} else {
			latestByAgent.set(update.agentId, {
				taskId: update.taskId,
				taskLabel: update.taskLabel,
				agentId: update.agentId,
				agentName: update.agentName,
				status: update.status,
				content: update.content ?? "",
			});
		}
	}

	return Array.from(latestByAgent.values());
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
		} else if (info.status === "in-progress" || info.status === "failed") {
			groups.inProgress.push(executionTask);
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
		} else if (mappedStatus === "in-progress" || mappedStatus === "failed") {
			groups.inProgress.push(executionTask);
		} else {
			groups.todo.push(executionTask);
		}
	}

	return groups;
}

export function deriveTaskExecutionsFromRun(
	run: AgentRun | null,
	updates: ReadonlyArray<AgentExecutionUpdate> = []
): TaskExecution[] {
	const streamedExecutions = buildTaskExecutions([...updates]).filter(
		(execution) => execution.status === "working"
	);
	if (!run) {
		return streamedExecutions;
	}

	const activeExecutions: TaskExecution[] = run.agents
		.filter((agent) => agent.status === "working")
		.flatMap((agent) => {
			const activeTask =
				(agent.currentTaskId
					? run.tasks.find((task) => task.id === agent.currentTaskId)
					: null) ||
				run.tasks.find(
					(task) => task.agentId === agent.agentId && task.status === "in-progress"
				);

			if (!activeTask) {
				return [];
			}

			return [
				{
					taskId: activeTask.id,
					taskLabel: activeTask.label,
					agentId: agent.agentId,
					agentName: agent.agentName,
					status: "working" as const,
					content:
						agent.latestContent ||
						activeTask.outputSummary ||
						activeTask.output ||
						"",
				},
			];
		});

	return activeExecutions.length > 0 ? activeExecutions : streamedExecutions;
}
