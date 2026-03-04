const test = require("node:test");
const assert = require("node:assert/strict");

const {
	parseMakeNavigationIntent,
	parseMakeNavigationPrompt,
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

test("createMakeEntryHref creates intent URLs", () => {
	assert.equal(createMakeEntryHref("fresh-chat"), "/make?intent=fresh-chat");
	assert.equal(createMakeEntryHref("fresh-make"), "/make?intent=fresh-make");
});

test("createMakeEntryHref includes prompt when provided", () => {
	assert.equal(
		createMakeEntryHref("fresh-make", "Build a todo app"),
		"/make?intent=fresh-make&prompt=Build+a+todo+app"
	);
});

test("parseMakeNavigationPrompt extracts prompt", () => {
	assert.equal(
		parseMakeNavigationPrompt(new URLSearchParams("prompt=Build+a+todo+app")),
		"Build a todo app"
	);
	assert.equal(parseMakeNavigationPrompt(new URLSearchParams("")), null);
	assert.equal(parseMakeNavigationPrompt(new URLSearchParams("prompt=")), null);
});

test("clearMakeNavigationIntentParams removes intent, prompt, and thread", () => {
	const params = new URLSearchParams(
		"intent=fresh-chat&prompt=hello&thread=abc123&foo=bar"
	);
	const cleanedParams = clearMakeNavigationIntentParams(params);

	assert.equal(cleanedParams.get("foo"), "bar");
	assert.equal(cleanedParams.has("intent"), false);
	assert.equal(cleanedParams.has("prompt"), false);
	assert.equal(cleanedParams.has("thread"), false);

	// Original params remain unchanged.
	assert.equal(params.get("intent"), "fresh-chat");
	assert.equal(params.get("prompt"), "hello");
	assert.equal(params.get("thread"), "abc123");
});
