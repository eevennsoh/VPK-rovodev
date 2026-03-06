import type {
	AgentRunListItem,
	AgentRunStatus,
	AgentRunTask,
} from "@/lib/make-run-types";
import type { TaskStatusGroups } from "./execution-data";

type RunDisplayStateInput = Pick<
	AgentRunListItem,
	"status" | "tasks" | "completedAt" | "updatedAt"
> &
	Partial<Pick<AgentRunListItem, "summary" | "genuiSummary">>;

type RunDisplayTaskGroups = Pick<
	TaskStatusGroups,
	"inReview" | "inProgress" | "failed" | "todo"
>;

export interface RunDisplayState {
	status: AgentRunStatus;
	completedAt: string | null;
}

function toTimestamp(value: string | null | undefined): number {
	if (!value) {
		return Number.NaN;
	}

	return Date.parse(value);
}

function resolveLatestTaskCompletedAt(tasks: ReadonlyArray<AgentRunTask>): string | null {
	let latestTimestamp = Number.NaN;
	let latestCompletedAt: string | null = null;

	for (const task of tasks) {
		const taskCompletedAt = task.completedAt;
		const taskTimestamp = toTimestamp(taskCompletedAt);
		if (!Number.isFinite(taskTimestamp)) {
			continue;
		}

		if (!Number.isFinite(latestTimestamp) || taskTimestamp > latestTimestamp) {
			latestTimestamp = taskTimestamp;
			latestCompletedAt = taskCompletedAt;
		}
	}

	return latestCompletedAt;
}

function resolveCompletedAtForFinalizedRun(run: RunDisplayStateInput): string | null {
	const candidates = [
		run.completedAt,
		run.summary?.createdAt,
		run.genuiSummary?.createdAt,
		run.updatedAt,
	];

	let latestTimestamp = Number.NaN;
	let latestValue: string | null = run.completedAt;
	for (const candidate of candidates) {
		const candidateTimestamp = toTimestamp(candidate);
		if (!Number.isFinite(candidateTimestamp)) {
			continue;
		}

		if (!Number.isFinite(latestTimestamp) || candidateTimestamp > latestTimestamp) {
			latestTimestamp = candidateTimestamp;
			latestValue = candidate ?? null;
		}
	}

	return latestValue;
}

function resolveDisplayStatus(
	runStatus: AgentRunStatus,
	taskStatusGroups: RunDisplayTaskGroups
): AgentRunStatus {
	if (runStatus !== "running") {
		return runStatus;
	}

	const hasActiveTasks =
		taskStatusGroups.inProgress.length > 0 ||
		taskStatusGroups.inReview.length > 0 ||
		taskStatusGroups.todo.length > 0;
	if (hasActiveTasks) {
		return "running";
	}

	return taskStatusGroups.failed.length > 0 ? "failed" : "completed";
}

export function resolveSidebarRunDisplayState(
	run: RunDisplayStateInput,
	taskStatusGroups: RunDisplayTaskGroups
): RunDisplayState {
	const status = resolveDisplayStatus(run.status, taskStatusGroups);

	if (status === "running") {
		return {
			status,
			completedAt: run.completedAt,
		};
	}

	if (run.status !== "running") {
		return {
			status,
			completedAt: resolveCompletedAtForFinalizedRun(run),
		};
	}

	const latestTaskCompletedAt = resolveLatestTaskCompletedAt(run.tasks);
	return {
		status,
		completedAt: latestTaskCompletedAt || run.completedAt || run.updatedAt,
	};
}
