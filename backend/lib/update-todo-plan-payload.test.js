const test = require("node:test");
const assert = require("node:assert/strict");

const {
	extractUpdateTodoPlanPayloadFromObservations,
} = require("./update-todo-plan-payload");

test("extracts a plan payload from update_todo output text", () => {
	const payload = extractUpdateTodoPlanPayloadFromObservations([
		{
			phase: "result",
			toolName: "update_todo",
			text: [
				"Successfully replaced existing todos. Total: 3 tasks (3 pending).",
				"",
				"<todo>",
				'{"id":1,"content":"Audit existing sprint board code","status":"pending"}',
				'{"id":2,"content":"Add backlog and review columns","status":"pending"}',
				'{"id":3,"content":"Verify drag-and-drop across all columns","status":"pending"}',
			].join("\n"),
		},
	]);

	assert.ok(payload);
	assert.equal(payload.type, "plan");
	assert.equal(payload.title, "Audit existing sprint board code");
	assert.deepEqual(
		payload.tasks.map((task) => task.label),
		[
			"Audit existing sprint board code",
			"Add backlog and review columns",
			"Verify drag-and-drop across all columns",
		]
	);
});

test("uses raw output object when available", () => {
	const payload = extractUpdateTodoPlanPayloadFromObservations([
		{
			phase: "result",
			toolName: "update_todo",
			rawOutput: {
				output: "ok",
				todos: [
					{ id: 1, content: "Create sprint board route", status: "pending" },
					{ id: 2, content: "Wire local in-memory data", status: "pending" },
				],
			},
		},
	]);

	assert.ok(payload);
	assert.deepEqual(
		payload.tasks.map((task) => task.label),
		["Create sprint board route", "Wire local in-memory data"]
	);
});

test("prefers the most recent update_todo result", () => {
	const payload = extractUpdateTodoPlanPayloadFromObservations([
		{
			phase: "result",
			toolName: "update_todo",
			text: "<todo>\n{\"id\":1,\"content\":\"Old task\",\"status\":\"pending\"}\n{\"id\":2,\"content\":\"Old task 2\",\"status\":\"pending\"}",
		},
		{
			phase: "result",
			toolName: "update_todo",
			text: "<todo>\n{\"id\":1,\"content\":\"Latest task\",\"status\":\"pending\"}\n{\"id\":2,\"content\":\"Latest task 2\",\"status\":\"pending\"}",
		},
	]);

	assert.ok(payload);
	assert.deepEqual(
		payload.tasks.map((task) => task.label),
		["Latest task", "Latest task 2"]
	);
});

test("returns null when update_todo has fewer than minimum tasks", () => {
	const payload = extractUpdateTodoPlanPayloadFromObservations([
		{
			phase: "result",
			toolName: "update_todo",
			text: "<todo>\n{\"id\":1,\"content\":\"Only one task\",\"status\":\"pending\"}",
		},
	]);

	assert.equal(payload, null);
});
