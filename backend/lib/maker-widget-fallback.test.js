const test = require("node:test");
const assert = require("node:assert/strict");

const {
	extractPlanWidgetPayloadFromText,
	extractProgressivePlanWidgetPayloadFromText,
	extractPlanWidgetPayloadFromStructuredText,
} = require("./maker-widget-fallback");

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
	assert.equal(result.title, "Define event goals and format");
	assert.deepEqual(
		result.tasks.map((task) => task.label),
		[
			"Define event goals and format",
			"Establish budget and sponsorship",
		]
	);
});

test("falls back to first task heading when plan title is generic", () => {
	const input = `Plan

Action items
- [ ] Design onboarding flow — align activation milestones
- [ ] Validate onboarding copy`;

	const result = extractPlanWidgetPayloadFromText(input);
	assert.ok(result);
	assert.equal(result.title, "Design onboarding flow");
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

test("progressive extractor replaces generic title with first task heading", () => {
	const input = `Execution plan
1. Deploy staging build
2. Validate smoke tests`;
	const result = extractProgressivePlanWidgetPayloadFromText(input);
	assert.ok(result);
	assert.equal(result.title, "Deploy staging build");
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

test("strips inline markdown bold markers from checklist labels", () => {
	const input = `# Conference planning plan

Action items
- [ ] **Define conference identity and date** — choose theme
- [ ] **Draft budget and funding model** — estimate costs`;
	const result = extractProgressivePlanWidgetPayloadFromText(input, {
		requireActionItemsHeading: true,
	});

	assert.ok(result);
	assert.deepEqual(
		result.tasks.map((task) => task.label),
		[
			"Define conference identity and date — choose theme",
			"Draft budget and funding model — estimate costs",
		]
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

test("structured extractor parses phase-based numbered plan text", () => {
	const input = [
		"Team Event Plan",
		"",
		"Phase 1: Define & Scope",
		"1. Confirm headcount and attendee list",
		"2. Set the date and time",
		"",
		"Phase 2: Plan Activities",
		"3. Book a venue or virtual platform",
		"4. Plan 2-3 activities",
	].join("\n");

	const result = extractPlanWidgetPayloadFromStructuredText(input);
	assert.ok(result);
	assert.equal(result.type, "plan");
	assert.equal(result.title, "Team Event Plan");
	assert.deepEqual(
		result.tasks.map((task) => task.label),
		[
			"Confirm headcount and attendee list",
			"Set the date and time",
			"Book a venue or virtual platform",
			"Plan 2-3 activities",
		]
	);
});

test("structured extractor prefers concise plan heading over intro narrative for title", () => {
	const input = [
		"Thanks for the details! Let me put together a balanced team event plan for you.",
		"",
		"🎉 Team Event Plan",
		"",
		"Phase 1: Define & Scope",
		"1. Confirm headcount and attendee list",
		"2. Set the date and time",
	].join("\n");

	const result = extractPlanWidgetPayloadFromStructuredText(input);
	assert.ok(result);
	assert.equal(result.title, "🎉 Team Event Plan");
	assert.equal(result.tasks.length, 2);
});

test("structured extractor rejects clarification-style numbered questions", () => {
	const input = [
		"I'd love to help. Let me ask a few questions first.",
		"1. What type of event?",
		"2. Team size and location?",
		"3. Timeline and budget?",
	].join("\n");

	const result = extractPlanWidgetPayloadFromStructuredText(input);
	assert.equal(result, null);
});

test("extractPlanWidgetPayloadFromText infers DAG dependencies", () => {
	const input = [
		"# Project plan",
		"",
		"Action items",
		"- Research authentication options",
		"- Design authentication flow",
		"- Implement authentication service",
		"- Test authentication service",
	].join("\n");

	const result = extractPlanWidgetPayloadFromText(input);
	assert.ok(result);
	assert.equal(result.tasks.length, 4);
	// Research (phase 0) has no deps
	assert.deepEqual(result.tasks[0].blockedBy, []);
	// Design (phase 1) depends on Research (shared "authentication")
	assert.deepEqual(result.tasks[1].blockedBy, ["task-1"]);
	// Implement (phase 2) depends on Design
	assert.deepEqual(result.tasks[2].blockedBy, ["task-2"]);
	// Test (phase 3) depends on Implement
	assert.deepEqual(result.tasks[3].blockedBy, ["task-3"]);
});

test("extractProgressivePlanWidgetPayloadFromText infers DAG dependencies", () => {
	const input = [
		"Rollout plan",
		"1. Design frontend layout",
		"2. Design backend architecture",
		"3. Build frontend components",
		"4. Build backend services",
	].join("\n");

	const result = extractProgressivePlanWidgetPayloadFromText(input);
	assert.ok(result);
	assert.equal(result.tasks.length, 4);
	// Design tasks are same-phase, independent
	assert.deepEqual(result.tasks[0].blockedBy, []);
	assert.deepEqual(result.tasks[1].blockedBy, []);
	// Build frontend depends on Design frontend
	assert.deepEqual(result.tasks[2].blockedBy, ["task-1"]);
	// Build backend depends on Design backend
	assert.deepEqual(result.tasks[3].blockedBy, ["task-2"]);
});

test("flat tasks with no phase keywords remain independent after inference", () => {
	const input = [
		"# Todo",
		"",
		"Action items",
		"- Send email to stakeholders",
		"- Update spreadsheet",
		"- Schedule meeting",
	].join("\n");

	const result = extractPlanWidgetPayloadFromText(input);
	assert.ok(result);
	assert.equal(result.tasks.length, 3);
	// None of these labels match phase keywords, so all stay independent
	assert.deepEqual(result.tasks[0].blockedBy, []);
	assert.deepEqual(result.tasks[1].blockedBy, []);
	assert.deepEqual(result.tasks[2].blockedBy, []);
});
