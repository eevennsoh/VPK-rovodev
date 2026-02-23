const test = require("node:test");
const assert = require("node:assert/strict");

const {
	hasTurnCompleteSignal,
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
