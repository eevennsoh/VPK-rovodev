const test = require("node:test");
const assert = require("node:assert/strict");

const {
	resolveThinkingIndicatorVisibility,
} = require("./reasoning-display-phase.ts");

test("shows preloader only while request is active before backend thinking starts", () => {
	const visibility = resolveThinkingIndicatorVisibility({
			requestActive: true,
			hasThinkingStatusInline: false,
			hasBackendThinkingActivity: false,
			reasoningPhase: "idle",
		});

	assert.equal(visibility.shouldShowPreloader, true);
	assert.equal(visibility.shouldShowThinkingStatus, false);
	assert.equal(visibility.shouldShowAny, true);
});

test("switches to thinking status once backend thinking starts", () => {
	const visibility = resolveThinkingIndicatorVisibility({
		requestActive: true,
		hasThinkingStatusInline: false,
		hasBackendThinkingActivity: true,
		reasoningPhase: "thinking",
	});

	assert.equal(visibility.shouldShowPreloader, false);
	assert.equal(visibility.shouldShowThinkingStatus, true);
	assert.equal(visibility.shouldShowAny, true);
});

test("keeps completed thinking status visible after request ends", () => {
	const visibility = resolveThinkingIndicatorVisibility({
		requestActive: false,
		hasThinkingStatusInline: false,
		hasBackendThinkingActivity: true,
		reasoningPhase: "completed",
	});

	assert.equal(visibility.shouldShowPreloader, false);
	assert.equal(visibility.shouldShowThinkingStatus, true);
	assert.equal(visibility.shouldShowAny, true);
});

test("hides all indicators when request ended without backend thinking", () => {
	const visibility = resolveThinkingIndicatorVisibility({
		requestActive: false,
		hasThinkingStatusInline: false,
		hasBackendThinkingActivity: false,
		reasoningPhase: "idle",
	});

	assert.equal(visibility.shouldShowPreloader, false);
	assert.equal(visibility.shouldShowThinkingStatus, false);
	assert.equal(visibility.shouldShowAny, false);
});

test("suppresses floating indicators when inline thinking status is active", () => {
	const visibility = resolveThinkingIndicatorVisibility({
		requestActive: true,
		hasThinkingStatusInline: true,
		hasBackendThinkingActivity: true,
		reasoningPhase: "thinking",
	});

	assert.equal(visibility.shouldShowPreloader, false);
	assert.equal(visibility.shouldShowThinkingStatus, false);
	assert.equal(visibility.shouldShowAny, false);
});
