const test = require("node:test");
const assert = require("node:assert/strict");

const {
	resolveToolFirstWidgetContentType,
} = require("./tool-first-widget-content-type");

test("prefers explicit tool-first domain mapping for translation", () => {
	const contentType = resolveToolFirstWidgetContentType({
		primaryDomains: ["google-translate"],
		prompt: "Translate this to Mandarin",
	});

	assert.equal(contentType, "translation");
});

test("maps Slack domain to message content type", () => {
	const contentType = resolveToolFirstWidgetContentType({
		primaryDomains: ["slack"],
		prompt: "Send a Slack message",
	});

	assert.equal(contentType, "message");
});

test("maps Teamwork Graph domain to work-item content type", () => {
	const contentType = resolveToolFirstWidgetContentType({
		primaryDomains: ["teamwork-graph"],
		prompt: "Summarize my last 7 days of work",
	});

	assert.equal(contentType, "work-item");
});

test("falls back to tool-name inference when domains are unavailable", () => {
	const contentType = resolveToolFirstWidgetContentType({
		lastRelevantToolName: "mcp__google_calendar__list_events",
		prompt: "Show upcoming events",
	});

	assert.equal(contentType, "calendar");
});

test("falls back to prompt inference when neither domains nor tool names exist", () => {
	const contentType = resolveToolFirstWidgetContentType({
		prompt: "Send Slack message to #general saying hello",
	});

	assert.equal(contentType, "message");
});

test("returns null when no known content type signal is present", () => {
	const contentType = resolveToolFirstWidgetContentType({
		prompt: "Tell me a joke",
	});

	assert.equal(contentType, null);
});

