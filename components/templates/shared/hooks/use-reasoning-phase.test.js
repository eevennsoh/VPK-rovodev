const test = require("node:test");
const assert = require("node:assert/strict");

const { getReasoningPropsForPhase } = require("./use-reasoning-phase.ts");

test("thinking phase uses calm streaming trigger and animated dots", () => {
	const props = getReasoningPropsForPhase("thinking", undefined, true);

	assert.equal(props.isStreaming, true);
	assert.equal(props.streamingWave, false);
	assert.equal(props.animatedDots, true);
	assert.equal(props.triggerStreaming, true);
	assert.equal(props.defaultOpen, true);
});

test("preload phase keeps shimmer wave and disables animated dots", () => {
	const props = getReasoningPropsForPhase("preload", undefined, false);

	assert.equal(props.isStreaming, true);
	assert.equal(props.streamingWave, true);
	assert.equal(props.animatedDots, false);
	assert.equal(props.triggerStreaming, undefined);
});
