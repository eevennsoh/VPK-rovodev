const test = require("node:test");
const assert = require("node:assert/strict");

const {
	applyExecutionUpdate,
	mergeStreamedExecutions,
} = require("./task-execution-stream.ts");

test("keeps separate tiles when one agent moves between tasks", () => {
	let byTask = {};

	byTask = applyExecutionUpdate(byTask, {
		agentId: "agent-1",
		agentName: "Planner",
		taskId: "TASK-1",
		taskLabel: "Architecture",
		status: "working",
		content: "Claimed task.",
	});
	byTask = applyExecutionUpdate(byTask, {
		agentId: "agent-1",
		agentName: "Planner",
		taskId: "TASK-2",
		taskLabel: "API design",
		status: "working",
		content: "Started API schema.",
	});

	assert.deepEqual(Object.keys(byTask).sort(), ["TASK-1", "TASK-2"]);
	assert.equal(byTask["TASK-1"].taskLabel, "Architecture");
	assert.equal(byTask["TASK-2"].taskLabel, "API design");
});

test("appends content updates for the same task id", () => {
	let byTask = {};

	byTask = applyExecutionUpdate(byTask, {
		agentId: "agent-2",
		agentName: "Designer",
		taskId: "TASK-9",
		taskLabel: "Create mocks",
		status: "working",
		content: "Drafting wireframes",
	});
	byTask = applyExecutionUpdate(byTask, {
		agentId: "agent-2",
		agentName: "Designer",
		taskId: "TASK-9",
		taskLabel: "Create mocks",
		status: "working",
		content: " and refining spacing.",
	});

	assert.equal(
		byTask["TASK-9"].content,
		"Drafting wireframes and refining spacing."
	);
});

test("merges streamed updates by task id without collapsing same-agent tasks", () => {
	const baseExecutions = [
		{
			taskId: "TASK-1",
			taskLabel: "Architecture",
			agentId: "agent-1",
			agentName: "Planner",
			status: "completed",
			content: "Architecture summary.",
		},
		{
			taskId: "TASK-2",
			taskLabel: "API design",
			agentId: "agent-1",
			agentName: "Planner",
			status: "working",
			content: "Initial draft.",
		},
	];

	const merged = mergeStreamedExecutions(baseExecutions, {
		"TASK-2": {
			taskId: "TASK-2",
			taskLabel: "API design",
			agentId: "agent-1",
			agentName: "Planner",
			status: "completed",
			content: "Final API summary.",
		},
	});

	assert.equal(merged.length, 2);
	assert.equal(merged[0].taskId, "TASK-1");
	assert.equal(merged[0].content, "Architecture summary.");
	assert.equal(merged[1].taskId, "TASK-2");
	assert.equal(merged[1].status, "completed");
	assert.equal(merged[1].content, "Final API summary.");
});

test("keeps terminal base execution when stale stream reports working", () => {
	const baseExecutions = [
		{
			taskId: "TASK-4",
			taskLabel: "Publish release notes",
			agentId: "agent-7",
			agentName: "Writer",
			status: "completed",
			content: "Release notes published.",
		},
	];

	const merged = mergeStreamedExecutions(baseExecutions, {
		"TASK-4": {
			taskId: "TASK-4",
			taskLabel: "Publish release notes",
			agentId: "agent-7",
			agentName: "Writer",
			status: "working",
			content: "Drafting notes...",
		},
	});

	assert.equal(merged.length, 1);
	assert.equal(merged[0].status, "completed");
	assert.equal(merged[0].content, "Release notes published.");
});
