const test = require("node:test");
const assert = require("node:assert/strict");

const {
	computeTaskStatusGroupsFromRun,
	deriveTaskExecutionsFromRun,
	isRunExecutionPhase,
} = require("./execution-data.ts");

test("derives separate task executions for repeated agent assignments", () => {
	const run = {
		tasks: [
			{
				id: "TASK-1",
				label: "Architecture",
				agentId: "agent-1",
				agentName: "Planner",
				status: "done",
				outputSummary: "Architecture output.",
				output: null,
				error: null,
			},
			{
				id: "TASK-2",
				label: "API design",
				agentId: "agent-1",
				agentName: "Planner",
				status: "in-progress",
				outputSummary: null,
				output: null,
				error: null,
			},
		],
		agents: [
			{
				agentId: "agent-1",
				agentName: "Planner",
				currentTaskId: "TASK-2",
				latestContent: "Streaming API notes.",
			},
		],
	};

	const executions = deriveTaskExecutionsFromRun(run);

	assert.equal(executions.length, 2);
	assert.deepEqual(
		executions.map((execution) => execution.taskId),
		["TASK-1", "TASK-2"]
	);
	assert.equal(executions[0].status, "completed");
	assert.equal(executions[1].status, "working");
	assert.equal(executions[1].content, "Streaming API notes.");
});

test("keeps completed task tiles visible when no agent is currently working", () => {
	const run = {
		tasks: [
			{
				id: "TASK-7",
				label: "Finalize summary",
				agentId: "agent-9",
				agentName: "Writer",
				status: "done",
				outputSummary: "Final summary complete.",
				output: null,
				error: null,
			},
		],
		agents: [
			{
				agentId: "agent-9",
				agentName: "Writer",
				currentTaskId: null,
				latestContent: "",
			},
		],
	};

	const executions = deriveTaskExecutionsFromRun(run);
	assert.equal(executions.length, 1);
	assert.equal(executions[0].taskId, "TASK-7");
	assert.equal(executions[0].status, "completed");
});

test("maps failed run tasks into the failed status group", () => {
	const groups = computeTaskStatusGroupsFromRun([
		{
			id: "task-1",
			label: "Do the thing",
			agentName: "Agent A",
			status: "done",
		},
		{
			id: "task-2",
			label: "Broken task",
			agentName: "Agent B",
			status: "failed",
		},
		{
			id: "task-3",
			label: "Blocked task",
			agentName: "Agent C",
			status: "blocked-failed",
		},
		{
			id: "task-4",
			label: "Waiting task",
			agentName: "Agent D",
			status: "todo",
		},
	]);

	assert.deepEqual(
		groups.done.map((task) => task.id),
		["task-1"]
	);
	assert.deepEqual(
		groups.failed.map((task) => task.id),
		["task-2", "task-3"]
	);
	assert.deepEqual(
		groups.todo.map((task) => task.id),
		["task-4"]
	);
});

test("reports execution phase while running with unfinished tasks", () => {
	const run = {
		status: "running",
		tasks: [
			{ id: "task-1", status: "done" },
			{ id: "task-2", status: "in-progress" },
		],
	};

	assert.equal(isRunExecutionPhase(run), true);
});

test("exits execution phase when all tasks are done even if run is still running", () => {
	const run = {
		status: "running",
		tasks: [
			{ id: "task-1", status: "done" },
			{ id: "task-2", status: "done" },
		],
	};

	assert.equal(isRunExecutionPhase(run), false);
});

test("returns false for non-running run statuses", () => {
	const completedRun = {
		status: "completed",
		tasks: [{ id: "task-1", status: "in-progress" }],
	};
	const failedRun = {
		status: "failed",
		tasks: [{ id: "task-1", status: "in-progress" }],
	};

	assert.equal(isRunExecutionPhase(completedRun), false);
	assert.equal(isRunExecutionPhase(failedRun), false);
});

test("returns false when run is missing", () => {
	assert.equal(isRunExecutionPhase(null), false);
});
