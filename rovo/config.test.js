const test = require("node:test");
const assert = require("node:assert/strict");

const { buildUserMessage } = require("./config");

test("buildUserMessage adds Jira/Confluence site-scope guidance for last-7-days work prompts", () => {
	const message = buildUserMessage("Last 7 days of work", [], undefined);

	assert.match(message, /\[Work Summary Scope\]/i);
	assert.match(message, /https:\/\/product-fabric\.atlassian\.net/i);
	assert.match(message, /https:\/\/hello\.atlassian\.net/i);
	assert.match(message, /Choose the tools needed/i);
});

test("buildUserMessage does not add last-7-days guardrail for unrelated prompts", () => {
	const message = buildUserMessage("Draft Confluence page", [], undefined);

	assert.doesNotMatch(message, /\[Work Summary Scope\]/i);
});

test("buildUserMessage avoids duplicating the guardrail when context already includes it", () => {
	const contextDescription = [
		"[Work Summary Scope]",
		'- Jira site_url: "https://product-fabric.atlassian.net"',
		'- Confluence site_url: "https://hello.atlassian.net"',
		"[End Work Summary Scope]",
	].join("\n");

	const message = buildUserMessage(
		"Search for all work I have done in the last 7 days from Jira and Confluence",
		[],
		contextDescription
	);
	const scopeMatches = message.match(/\[Work Summary Scope\]/g) ?? [];

	assert.equal(scopeMatches.length, 1);
});
