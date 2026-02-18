import type { TaskExecution } from "./execution-data";

interface TaskExecutionUpdate {
	agentId: string;
	agentName: string;
	taskId: string;
	taskLabel: string;
	status: TaskExecution["status"];
	content?: string;
}

export type TaskExecutionByTaskId = Record<string, TaskExecution>;

export function applyExecutionUpdate(
	previousByTaskId: TaskExecutionByTaskId,
	update: TaskExecutionUpdate
): TaskExecutionByTaskId {
	if (!update.taskId || !update.agentId) {
		return previousByTaskId;
	}

	const existingExecution = previousByTaskId[update.taskId];
	if (existingExecution) {
		const nextContent = update.content
			? `${existingExecution.content}${update.content}`
			: existingExecution.content;
		const hasChanged =
			existingExecution.agentId !== update.agentId ||
			existingExecution.agentName !== update.agentName ||
			existingExecution.taskLabel !== update.taskLabel ||
			existingExecution.status !== update.status ||
			existingExecution.content !== nextContent;
		if (!hasChanged) {
			return previousByTaskId;
		}

		return {
			...previousByTaskId,
			[update.taskId]: {
				...existingExecution,
				agentId: update.agentId,
				agentName: update.agentName,
				taskLabel: update.taskLabel,
				status: update.status,
				content: nextContent,
			},
		};
	}

	return {
		...previousByTaskId,
		[update.taskId]: {
			taskId: update.taskId,
			taskLabel: update.taskLabel,
			agentId: update.agentId,
			agentName: update.agentName,
			status: update.status,
			content: update.content ?? "",
		},
	};
}

export function mergeStreamedExecutions(
	baseExecutions: ReadonlyArray<TaskExecution>,
	streamedExecutionsByTaskId: TaskExecutionByTaskId
): TaskExecution[] {
	const streamedExecutions = Object.values(streamedExecutionsByTaskId);
	if (streamedExecutions.length === 0) {
		return baseExecutions as TaskExecution[];
	}

	const streamedByTaskId = new Map(
		streamedExecutions.map((execution) => [execution.taskId, execution] as const)
	);

	const orderedExecutions = baseExecutions.map(
		(execution) => {
			const streamedExecution = streamedByTaskId.get(execution.taskId);
			if (!streamedExecution) {
				return execution;
			}

			const baseIsTerminal =
				execution.status === "completed" || execution.status === "failed";
			if (baseIsTerminal && streamedExecution.status === "working") {
				return execution;
			}

			return streamedExecution;
		}
	);
	const baseTaskIds = new Set(baseExecutions.map((execution) => execution.taskId));
	for (const streamedExecution of streamedExecutions) {
		if (!baseTaskIds.has(streamedExecution.taskId)) {
			orderedExecutions.push(streamedExecution);
		}
	}

	return orderedExecutions;
}
