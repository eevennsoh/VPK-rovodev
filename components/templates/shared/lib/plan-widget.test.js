const test = require("node:test");
const assert = require("node:assert/strict");

const { getLatestPlanWidgetPayload } = require("./plan-widget.ts");

function createAssistantMessage(parts) {
	return {
		role: "assistant",
		id: `assistant-${Math.random().toString(36).slice(2, 8)}`,
		parts,
	};
}

function createPlanWidgetPart(overrides = {}) {
	return {
		type: "data-widget-data",
		data: {
			type: "plan",
			payload: {
				title: "Sprint Board Plan",
				tasks: [
					{ id: "task-1", label: "Create board shell" },
					{ id: "task-2", label: "Add drag and drop" },
				],
				...overrides,
			},
		},
	};
}

function createGenuiWidgetPart() {
	return {
		type: "data-widget-data",
		data: {
			type: "genui-preview",
			payload: {
				spec: {
					root: "main",
					elements: {},
				},
			},
		},
	};
}

test("getLatestPlanWidgetPayload keeps the latest plan when a newer non-plan widget exists in the same message", () => {
	const messages = [
		createAssistantMessage([
			createPlanWidgetPart(),
			createGenuiWidgetPart(),
		]),
	];

	const payload = getLatestPlanWidgetPayload(messages);
	assert.ok(payload);
	assert.equal(payload.title, "Sprint Board Plan");
	assert.equal(payload.tasks.length, 2);
	assert.equal(payload.tasks[0].id, "task-1");
});

test("getLatestPlanWidgetPayload continues scanning earlier messages when the newest message has only non-plan widgets", () => {
	const messages = [
		createAssistantMessage([createPlanWidgetPart({ title: "Older plan" })]),
		createAssistantMessage([createGenuiWidgetPart()]),
	];

	const payload = getLatestPlanWidgetPayload(messages);
	assert.ok(payload);
	assert.equal(payload.title, "Older plan");
	assert.equal(payload.tasks.length, 2);
});

test("getLatestPlanWidgetPayload returns null when no valid plan widget exists", () => {
	const messages = [
		createAssistantMessage([createGenuiWidgetPart()]),
	];

	assert.equal(getLatestPlanWidgetPayload(messages), null);
});
