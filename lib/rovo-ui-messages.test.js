const test = require("node:test");
const assert = require("node:assert/strict");

const {
	hasTurnCompleteSignal,
	getThinkingToolCallSummaries,
} = require("./rovo-ui-messages.ts");

test("returns false when turn-complete signal is absent", () => {
	assert.equal(
		hasTurnCompleteSignal({
			parts: [
				{
					type: "data-thinking-status",
					data: { label: "Thinking" },
				},
			],
		}),
		false
	);
});

test("returns true when turn-complete signal exists", () => {
	assert.equal(
		hasTurnCompleteSignal({
			parts: [
				{
					type: "text",
					text: "Done",
					state: "done",
				},
				{
					type: "data-turn-complete",
					data: { timestamp: "2026-02-23T00:00:00.000Z" },
				},
			],
		}),
		true
	);
});

test("getThinkingToolCallSummaries resolves running tools on turn completion", () => {
	const summaries = getThinkingToolCallSummaries({
		parts: [
			{
				type: "data-thinking-event",
				data: {
					eventId: "event-start-1",
					phase: "start",
					toolName: "atlassian_docs_search",
					toolCallId: "call-1",
					timestamp: "2026-02-23T00:00:00.000Z",
				},
			},
			{
				type: "data-turn-complete",
				data: { timestamp: "2026-02-23T00:00:01.000Z" },
			},
		],
	});

	assert.equal(summaries.length, 1);
	assert.equal(summaries[0].state, "completed");
	assert.equal(
		summaries[0].outputPreview,
		"Tool finished without an explicit result event."
	);
});

test("getThinkingToolCallSummaries labels request-user-input tools as awaiting answers", () => {
	const summaries = getThinkingToolCallSummaries({
		parts: [
			{
				type: "data-thinking-event",
				data: {
					eventId: "event-start-2",
					phase: "start",
					toolName: "ask_user_questions",
					toolCallId: "call-2",
					timestamp: "2026-03-02T00:00:00.000Z",
				},
			},
			{
				type: "data-turn-complete",
				data: { timestamp: "2026-03-02T00:00:01.000Z" },
			},
		],
	});

	assert.equal(summaries.length, 1);
	assert.equal(summaries[0].state, "completed");
	assert.equal(
		summaries[0].outputPreview,
		"Awaiting your answers in the question card."
	);
});
