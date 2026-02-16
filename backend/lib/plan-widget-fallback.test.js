const test = require("node:test");
const assert = require("node:assert/strict");

const {
	extractPlanWidgetPayloadFromText,
	extractProgressivePlanWidgetPayloadFromText,
} = require("./plan-widget-fallback");

test("extracts tasks from action items section", () => {
	const input = `# Conference planning plan\n\nScope\n- In: Venue\n\nAction items\n- [ ] Define event goals\n- [ ] Secure venue\n- [ ] Create agenda\n\nNext section\n- Notes`;

	const result = extractPlanWidgetPayloadFromText(input);
	assert.ok(result);
	assert.equal(result.type, "plan");
	assert.equal(result.title, "Conference planning plan");
	assert.deepEqual(
		result.tasks.map((task) => task.label),
		["Define event goals", "Secure venue", "Create agenda"]
	);
});

test("supports unicode checklist bullets", () => {
	const input = `Plan\n\nAction items\n• ☐ Define event goals and format\n• ☐ Establish budget and sponsorship`;

	const result = extractPlanWidgetPayloadFromText(input);
	assert.ok(result);
	assert.deepEqual(
		result.tasks.map((task) => task.label),
		[
			"Define event goals and format",
			"Establish budget and sponsorship",
		]
	);
});

test("returns null when section has fewer than two tasks", () => {
	const input = `Action items\n- [ ] Only one task`;
	const result = extractPlanWidgetPayloadFromText(input);
	assert.equal(result, null);
});

test("returns null when no action items heading exists", () => {
	const input = `Plan\n- [ ] Task one\n- [ ] Task two`;
	const result = extractPlanWidgetPayloadFromText(input);
	assert.equal(result, null);
});

test("extracts progressive plan payload without action items heading", () => {
	const input = `Conference rollout plan\n1. Define conference goals`;
	const result = extractProgressivePlanWidgetPayloadFromText(input);
	assert.ok(result);
	assert.equal(result.type, "plan");
	assert.equal(result.title, "Conference rollout plan");
	assert.deepEqual(
		result.tasks.map((task) => task.label),
		["Define conference goals"]
	);
});

test("strict progressive mode ignores clarification-style numbered lists", () => {
	const input = `Let me get the create-plan skill to help
6 tasks
1. What is the AI project about?
2. A chatbot / conversational agent
3. An AI-powered feature within an existing app
4. A standalone AI application
5. Something else?`;

	const result = extractProgressivePlanWidgetPayloadFromText(input, {
		requireActionItemsHeading: true,
	});

	assert.equal(result, null);
});

test("strict progressive mode requires action-items heading and returns tasks", () => {
	const input = `Planning draft

Action items
1. Define conference goals
2. Secure venue`;
	const result = extractProgressivePlanWidgetPayloadFromText(input, {
		requireActionItemsHeading: true,
	});

	assert.ok(result);
	assert.deepEqual(
		result.tasks.map((task) => task.label),
		["Define conference goals", "Secure venue"]
	);
});

test("progressive extractor expands tasks as more list items appear", () => {
	const partialInput = `Execution plan\n- Define conference goals`;
	const completeInput = `${partialInput}\n- Secure venue`;

	const partialResult = extractProgressivePlanWidgetPayloadFromText(partialInput);
	const completeResult = extractProgressivePlanWidgetPayloadFromText(completeInput);

	assert.ok(partialResult);
	assert.ok(completeResult);
	assert.deepEqual(
		partialResult.tasks.map((task) => task.id),
		["task-1"]
	);
	assert.deepEqual(
		completeResult.tasks.map((task) => task.id),
		["task-1", "task-2"]
	);
});

test("progressive extractor ignores generic lists without plan signal", () => {
	const input = `Shopping list\n- Apples\n- Oranges`;
	const result = extractProgressivePlanWidgetPayloadFromText(input);
	assert.equal(result, null);
});
