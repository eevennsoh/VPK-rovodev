const test = require("node:test");
const assert = require("node:assert/strict");

const { buildUserMessage } = require("./config");

test("buildUserMessage adds Jira/Confluence non-TWG guardrail for last-7-days work prompts", () => {
	const message = buildUserMessage("Last 7 days of work", [], undefined);

	assert.match(message, /do not call any Teamwork Graph tools/i);
	assert.match(message, /Make these 2 tool calls/i);
});

test("buildUserMessage does not add last-7-days guardrail for unrelated prompts", () => {
	const message = buildUserMessage("Draft Confluence page", [], undefined);

	assert.doesNotMatch(message, /do not call any Teamwork Graph tools/i);
	assert.doesNotMatch(message, /Make these 2 tool calls/i);
});

test("buildUserMessage avoids duplicating the guardrail when context already includes it", () => {
	const contextDescription = [
		"[Tool Guardrail]",
		"For this request, do not call any Teamwork Graph tools.",
		"[End Tool Guardrail]",
		"",
		"[Tool Requirement]",
		"Make these 2 tool calls for this request:",
		"[End Tool Requirement]",
	].join("\n");

	const message = buildUserMessage(
		"Search for all work I have done in the last 7 days from Jira and Confluence",
		[],
		contextDescription
	);
	const guardrailMatches = message.match(/\[Tool Guardrail\]/g) ?? [];
	const requirementMatches = message.match(/\[Tool Requirement\]/g) ?? [];

	assert.equal(guardrailMatches.length, 1);
	assert.equal(requirementMatches.length, 1);
});
