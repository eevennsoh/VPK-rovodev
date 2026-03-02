const test = require("node:test");
const assert = require("node:assert/strict");

const {
	buildPlanDescriptionFallback,
} = require("./plan-description-fallback.ts");

function createPlanPayload(tasks) {
	return {
		title: "Sprint board plan",
		description: undefined,
		tasks,
		agents: [],
	};
}

test("buildPlanDescriptionFallback keeps narrative first and reuses existing mermaid", () => {
	const messageText = `# Plan

Implement the sprint board update in four phases.

\`\`\`mermaid
graph TD
  task_1["Plan"]
  task_2["Build"]
  task_1 --> task_2
\`\`\``;

	const description = buildPlanDescriptionFallback({
		messageText,
		planPayload: createPlanPayload([
			{ id: "task-1", label: "Plan", blockedBy: [] },
			{ id: "task-2", label: "Build", blockedBy: [] },
		]),
	});

	assert.match(
		description,
		/^Implement the sprint board update in four phases\./
	);
	assert.match(description, /### Task dependency graph/);
	assert.equal((description.match(/```mermaid/g) || []).length, 1);
	assert.ok(!description.includes("Inferred order"));
});

test("buildPlanDescriptionFallback generates inferred linear mermaid when dependencies are missing", () => {
	const description = buildPlanDescriptionFallback({
		messageText: "# Plan\n\nDeliver the board refresh with the agreed scope.",
		planPayload: createPlanPayload([
			{ id: "task-1", label: "Review scope", blockedBy: [] },
			{ id: "task-2", label: "Implement changes", blockedBy: [] },
			{ id: "task-3", label: "Validate behavior", blockedBy: [] },
		]),
	});

	assert.match(description, /### Task dependency graph/);
	assert.match(description, /Inferred order: tasks are shown in a simple linear sequence/);
	assert.match(description, /task_1 --> task_2/);
	assert.match(description, /task_2 --> task_3/);
});

test("buildPlanDescriptionFallback does not add inferred note for explicit dependencies", () => {
	const description = buildPlanDescriptionFallback({
		messageText: "# Plan\n\nShip work by dependency order.",
		planPayload: createPlanPayload([
			{ id: "task-1", label: "Design", blockedBy: [] },
			{ id: "task-2", label: "Build", blockedBy: ["task-1"] },
		]),
	});

	assert.match(description, /task_1 --> task_2/);
	assert.ok(!description.includes("Inferred order"));
});
