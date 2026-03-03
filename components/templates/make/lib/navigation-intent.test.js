const test = require("node:test");
const assert = require("node:assert/strict");

const {
	parseMakeNavigationIntent,
	createMakeEntryHref,
	clearMakeNavigationIntentParams,
} = require("./navigation-intent.ts");

test("parseMakeNavigationIntent returns supported intents", () => {
	assert.equal(
		parseMakeNavigationIntent(new URLSearchParams("intent=fresh-chat")),
		"fresh-chat"
	);
	assert.equal(
		parseMakeNavigationIntent(new URLSearchParams("intent=fresh-make")),
		"fresh-make"
	);
});

test("parseMakeNavigationIntent returns null for missing or unknown values", () => {
	assert.equal(parseMakeNavigationIntent(new URLSearchParams("")), null);
	assert.equal(
		parseMakeNavigationIntent(new URLSearchParams("intent=resume-chat")),
		null
	);
});

test("createMakeEntryHref creates tab+intent URLs", () => {
	assert.equal(createMakeEntryHref("fresh-chat"), "/make?tab=chat&intent=fresh-chat");
	assert.equal(createMakeEntryHref("fresh-make"), "/make?tab=chat&intent=fresh-make");
});

test("clearMakeNavigationIntentParams removes only intent/thread", () => {
	const params = new URLSearchParams(
		"tab=chat&intent=fresh-chat&thread=abc123&foo=bar"
	);
	const cleanedParams = clearMakeNavigationIntentParams(params);

	assert.equal(cleanedParams.get("tab"), "chat");
	assert.equal(cleanedParams.get("foo"), "bar");
	assert.equal(cleanedParams.has("intent"), false);
	assert.equal(cleanedParams.has("thread"), false);

	// Original params remain unchanged.
	assert.equal(params.get("intent"), "fresh-chat");
	assert.equal(params.get("thread"), "abc123");
});
