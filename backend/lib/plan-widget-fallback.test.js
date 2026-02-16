const test = require("node:test");
const assert = require("node:assert/strict");

const {
	extractPlanWidgetPayloadFromText,
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
