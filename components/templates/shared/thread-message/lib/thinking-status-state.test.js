const test = require("node:test");
const assert = require("node:assert/strict");

const {
	isThinkingStatusActive,
	isThinkingStatusLifecycleStreaming,
} = require("./thinking-status-state.ts");

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

test("tracks thinking lifecycle streaming only while the active turn is in-flight", () => {
	assert.equal(
		isThinkingStatusLifecycleStreaming({
			isThinkingLifecycleStreaming: true,
			isThinkingStatusActive: true,
			hasBackendThinkingActivity: true,
		}),
		true
	);

	assert.equal(
		isThinkingStatusLifecycleStreaming({
			isThinkingLifecycleStreaming: false,
			isThinkingStatusActive: true,
			hasBackendThinkingActivity: true,
		}),
		false
	);
});
