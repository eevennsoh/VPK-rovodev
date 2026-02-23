const test = require("node:test");
const assert = require("node:assert/strict");

const {
	resolveToolFirstRoutingFlags,
} = require("./tool-first-routing-flags");

test("strict tool-first is disabled when pre-classification detects media intent", () => {
	const result = resolveToolFirstRoutingFlags({
		toolFirstMatched: true,
		inferredPromptIntent: "normal",
		preClassifiedIntent: "image",
	});

	assert.equal(result.mediaBypassIntent, "image");
	assert.equal(result.isMediaIntentBypass, true);
	assert.equal(result.isStrictToolFirstTurn, false);
});

test("strict tool-first is disabled when inferred intent is media and pre-classification is absent", () => {
	const result = resolveToolFirstRoutingFlags({
		toolFirstMatched: true,
		inferredPromptIntent: "audio",
		preClassifiedIntent: null,
	});

	assert.equal(result.mediaBypassIntent, "audio");
	assert.equal(result.isMediaIntentBypass, true);
	assert.equal(result.isStrictToolFirstTurn, false);
});

test("strict tool-first stays enabled for non-media intents", () => {
	const result = resolveToolFirstRoutingFlags({
		toolFirstMatched: true,
		inferredPromptIntent: "normal",
		preClassifiedIntent: null,
	});

	assert.equal(result.mediaBypassIntent, null);
	assert.equal(result.isMediaIntentBypass, false);
	assert.equal(result.isStrictToolFirstTurn, true);
});

test("strict tool-first remains disabled when no tool-first domain is matched", () => {
	const result = resolveToolFirstRoutingFlags({
		toolFirstMatched: false,
		inferredPromptIntent: "image",
		preClassifiedIntent: "image",
	});

	assert.equal(result.mediaBypassIntent, "image");
	assert.equal(result.isMediaIntentBypass, true);
	assert.equal(result.isStrictToolFirstTurn, false);
});
