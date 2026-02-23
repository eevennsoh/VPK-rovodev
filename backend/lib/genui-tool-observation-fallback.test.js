const test = require("node:test");
const assert = require("node:assert/strict");

const { buildToolObservationFallback } = require("./genui-tool-observation-fallback");

test("buildToolObservationFallback returns summarized mixed result/error context", () => {
	const fallback = buildToolObservationFallback({
		observations: [
			{
				phase: "result",
				toolName: "mcp__jira__search",
				text: "Found 2 issues updated in the last 7 days.",
			},
			{
				phase: "error",
				toolName: "mcp__confluence__search_pages",
				text: "403 forbidden",
			},
		],
	});

	assert.equal(fallback.hasObservations, true);
	assert.equal(fallback.resultCount, 1);
	assert.equal(fallback.errorCount, 1);
	assert.match(fallback.text, /Result \| mcp__jira__search/);
	assert.match(fallback.text, /Error \| mcp__confluence__search_pages/);
	assert.match(fallback.summary, /1 tool result/);
	assert.match(fallback.summary, /1 tool error/);
});

test("buildToolObservationFallback deduplicates duplicate entries", () => {
	const fallback = buildToolObservationFallback({
		observations: [
			{
				phase: "result",
				toolName: "mcp__slack__post_message",
				text: "Message sent to #eng",
			},
			{
				phase: "result",
				toolName: "mcp__slack__post_message",
				text: "Message sent to #eng",
			},
		],
	});

	assert.equal(fallback.hasObservations, true);
	assert.equal(fallback.observationCount, 1);
});

test("buildToolObservationFallback returns hasObservations=false for empty input", () => {
	const fallback = buildToolObservationFallback({
		observations: [],
	});

	assert.equal(fallback.hasObservations, false);
	assert.equal(fallback.text, "");
	assert.equal(fallback.resultCount, 0);
	assert.equal(fallback.errorCount, 0);
});

test("buildToolObservationFallback truncates to max observations", () => {
	const fallback = buildToolObservationFallback({
		observations: [
			{ phase: "result", toolName: "tool.a", text: "A" },
			{ phase: "result", toolName: "tool.b", text: "B" },
			{ phase: "result", toolName: "tool.c", text: "C" },
		],
		maxObservations: 2,
	});

	assert.equal(fallback.hasObservations, true);
	assert.equal(fallback.observationCount, 3);
	assert.match(fallback.text, /tool\.b/);
	assert.match(fallback.text, /tool\.c/);
	assert.match(fallback.text, /\+1 additional tool event omitted/);
});
