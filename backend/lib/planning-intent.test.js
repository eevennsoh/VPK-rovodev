const test = require("node:test");
const assert = require("node:assert/strict");

const { detectPlanningIntent } = require("./planning-intent");

test("detectPlanningIntent returns true for explicit planning prompts", () => {
	const planningPrompts = [
		"Create a rollout plan for migrating authentication to OAuth.",
		"Can you break this down into implementation steps?",
		"Draft an execution plan for launching this feature.",
		"Help me prepare a roadmap for the next sprint.",
		"help me coordinate on a team event",
	];

	for (const prompt of planningPrompts) {
		assert.equal(
			detectPlanningIntent(prompt),
			true,
			`Expected planning intent for: ${prompt}`
		);
	}
});

test("detectPlanningIntent returns false for non-execution plan topics", () => {
	const nonPlanningPrompts = [
		"Which enterprise plan should we buy?",
		"Compare our subscription plans for billing.",
		"I need a mobile data plan for my trip.",
		"What is our retirement plan matching policy?",
	];

	for (const prompt of nonPlanningPrompts) {
		assert.equal(
			detectPlanningIntent(prompt),
			false,
			`Expected non-planning intent for: ${prompt}`
		);
	}
});
