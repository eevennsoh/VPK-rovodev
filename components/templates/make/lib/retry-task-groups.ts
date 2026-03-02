import type { AgentRunTask } from "@/lib/make-run-types";

export type RetryTaskGroupKey = "failed" | "todo";

function isTaskInRetryGroup(task: AgentRunTask, groupKey: RetryTaskGroupKey): boolean {
	if (groupKey === "failed") {
		return task.status === "failed" || task.status === "blocked-failed";
	}

	return task.status === "todo";
}

function truncateLine(value: string | null | undefined, maxLength = 240): string | null {
	if (!value) {
		return null;
	}

	const normalizedValue = value.replace(/\s+/g, " ").trim();
	if (!normalizedValue) {
		return null;
	}

	if (normalizedValue.length <= maxLength) {
		return normalizedValue;
	}

	return `${normalizedValue.slice(0, maxLength - 1)}…`;
}

export function selectRetryTasks(
	runTasks: ReadonlyArray<AgentRunTask>,
	groupKey: RetryTaskGroupKey,
	taskIds: ReadonlyArray<string>
): AgentRunTask[] {
	const runTaskById = new Map(runTasks.map((task) => [task.id, task] as const));
	const selectedTasks: AgentRunTask[] = [];

	for (const taskId of taskIds) {
		const task = runTaskById.get(taskId);
		if (!task || !isTaskInRetryGroup(task, groupKey)) {
			continue;
		}

		selectedTasks.push(task);
	}

	return selectedTasks;
}

function getRetryGoal(groupKey: RetryTaskGroupKey): string {
	if (groupKey === "failed") {
		return "Recover and complete these failed tasks.";
	}

	return "Execute and complete these pending tasks.";
}

export function buildRetryPrompt(
	groupKey: RetryTaskGroupKey,
	selectedTasks: ReadonlyArray<AgentRunTask>
): string {
	const taskLines = selectedTasks.map((task) => `- ${task.id}: ${task.label}`);
	const headline =
		groupKey === "failed"
			? "Retry failed work for this run."
			: "Continue this run with pending work.";

	return [
		headline,
		getRetryGoal(groupKey),
		"Use minimal follow-up tasks and preserve completed outputs.",
		"",
		"Target tasks:",
		...taskLines,
	].join("\n");
}

export function buildRetryContextPrompt(
	groupKey: RetryTaskGroupKey,
	selectedTasks: ReadonlyArray<AgentRunTask>
): string {
	const contextHeader =
		groupKey === "failed"
			? "Retry context for failed tasks:"
			: "Execution context for pending tasks:";
	const contextLines = selectedTasks.map((task) => {
		const summary = truncateLine(task.outputSummary) || truncateLine(task.output);
		const error = truncateLine(task.error);
		const blockedByText =
			task.blockedBy.length > 0 ? task.blockedBy.join(", ") : "none";
		return [
			`- ${task.id}`,
			`  label: ${task.label}`,
			`  status: ${task.status}`,
			`  blockedBy: ${blockedByText}`,
			`  error: ${error ?? "none"}`,
			`  outputSummary: ${summary ?? "none"}`,
		].join("\n");
	});

	return [contextHeader, ...contextLines].join("\n");
}
