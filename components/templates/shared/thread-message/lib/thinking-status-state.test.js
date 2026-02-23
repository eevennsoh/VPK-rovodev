const test = require("node:test");
const assert = require("node:assert/strict");

const {
	isThinkingStatusActive,
	isThinkingStatusLifecycleStreaming,
	isPostToolsGenuiGeneration,
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

test("detects post-tools GenUI generation while waiting for widget data", () => {
	assert.equal(
		isPostToolsGenuiGeneration({
			widgetType: "genui-preview",
			isWidgetLoading: true,
			hasAnyToolCalls: true,
			hasRunningToolCalls: false,
		}),
		true
	);
});

test("does not mark post-tools GenUI generation while tools are still running", () => {
	assert.equal(
		isPostToolsGenuiGeneration({
			widgetType: "genui-preview",
			isWidgetLoading: true,
			hasAnyToolCalls: true,
			hasRunningToolCalls: true,
		}),
		false
	);
});

test("does not mark post-tools GenUI generation when no tool calls were observed", () => {
	assert.equal(
		isPostToolsGenuiGeneration({
			widgetType: "genui-preview",
			isWidgetLoading: true,
			hasAnyToolCalls: false,
			hasRunningToolCalls: false,
		}),
		false
	);
});
