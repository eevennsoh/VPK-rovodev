const test = require("node:test");
const assert = require("node:assert/strict");

const { isThinkingStatusActive } = require("./thinking-status-state.ts");

test("keeps thinking status active when thinking events exist without a status part", () => {
	assert.equal(
		isThinkingStatusActive({
			hasThinkingStatusPart: false,
			hasThinkingEvents: true,
			isRetryThinkingStatus: false,
			isStreaming: false,
		}),
		true
	);
});

test("hides retry status once streaming has completed", () => {
	assert.equal(
		isThinkingStatusActive({
			hasThinkingStatusPart: true,
			hasThinkingEvents: false,
			isRetryThinkingStatus: true,
			isStreaming: false,
		}),
		false
	);
});
