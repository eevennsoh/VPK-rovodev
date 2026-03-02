const test = require("node:test");
const assert = require("node:assert/strict");

const {
	MAKE_MODE_SOURCE,
	resolvePlanMode,
} = require("./make-mode-resolution");

test("resolvePlanMode enables plan mode only with explicit true and allowed source", () => {
	const resolved = resolvePlanMode({
		planMode: true,
		planModeSource: MAKE_MODE_SOURCE,
	});

	assert.equal(resolved.enabled, true);
	assert.equal(resolved.rejected, false);
	assert.equal(resolved.source, MAKE_MODE_SOURCE);
});

test("resolvePlanMode rejects explicit plan mode when source is missing", () => {
	const resolved = resolvePlanMode({
		planMode: true,
		planModeSource: undefined,
	});

	assert.equal(resolved.enabled, false);
	assert.equal(resolved.rejected, true);
	assert.equal(resolved.source, null);
});

test("resolvePlanMode rejects explicit plan mode when source is invalid", () => {
	const resolved = resolvePlanMode({
		planMode: true,
		planModeSource: "fullscreen-chat",
	});

	assert.equal(resolved.enabled, false);
	assert.equal(resolved.rejected, true);
	assert.equal(resolved.source, "fullscreen-chat");
});

test("resolvePlanMode ignores non-boolean truthy planMode values", () => {
	const resolved = resolvePlanMode({
		planMode: "true",
		planModeSource: MAKE_MODE_SOURCE,
	});

	assert.equal(resolved.enabled, false);
	assert.equal(resolved.rejected, false);
	assert.equal(resolved.source, MAKE_MODE_SOURCE);
});

test("resolvePlanMode ignores false planMode even with allowed source", () => {
	const resolved = resolvePlanMode({
		planMode: false,
		planModeSource: MAKE_MODE_SOURCE,
	});

	assert.equal(resolved.enabled, false);
	assert.equal(resolved.rejected, false);
	assert.equal(resolved.source, MAKE_MODE_SOURCE);
});
