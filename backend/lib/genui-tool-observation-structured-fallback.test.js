const test = require("node:test");
const assert = require("node:assert/strict");

const {
	buildToolObservationStructuredFallback,
} = require("./genui-tool-observation-structured-fallback");

test("buildToolObservationStructuredFallback renders sections for multiple tools", () => {
	const result = buildToolObservationStructuredFallback({
		prompt: "last 7 days of work",
		observations: [
			{
				phase: "result",
				toolName: "mcp__jira__search_issues",
				rawOutput: {
					issues: [
						{
							key: "AIDOPS-101",
							summary: "Agent Logo Change",
							status: "Work in progress",
						},
					],
				},
				text: "AIDOPS-101 returned",
			},
			{
				phase: "result",
				toolName: "mcp__confluence__search_pages",
				rawOutput: {
					results: [
						{
							title: "Project Documentation - Draft",
							space: "Playbook Sandbox",
							url: "https://hello.atlassian.net/wiki/spaces/PLAY/pages/1234",
						},
					],
				},
				text: "Project Documentation - Draft returned",
			},
			{
				phase: "result",
				toolName: "mcp__google_calendar__list_events",
				rawOutput: {
					events: [
						{
							summary: "Design Review",
							start: "2026-02-23T09:00:00Z",
						},
					],
				},
				text: "Design Review event",
			},
		],
	});

	assert.ok(result);
	assert.equal(result.source, "tool-observation-structured");
	assert.equal(result.resultCount, 3);
	assert.equal(result.errorCount, 0);
	assert.match(result.summary, /Rendered 3 tool events across 3 tools/);

	const serializedSpec = JSON.stringify(result.spec);
	assert.match(serializedSpec, /jira search issues \(1\)/i);
	assert.match(serializedSpec, /confluence search pages \(1\)/i);
	assert.match(serializedSpec, /google calendar list events \(1\)/i);
	assert.match(serializedSpec, /AIDOPS-101/);
	assert.match(serializedSpec, /Project Documentation - Draft/);
	assert.match(serializedSpec, /Design Review/);
});

test("buildToolObservationStructuredFallback falls back to text lines when payload is not JSON", () => {
	const result = buildToolObservationStructuredFallback({
		prompt: "show tool output",
		observations: [
			{
				phase: "result",
				toolName: "functions.exec_command",
				text: "line one\nline two\nline three",
			},
		],
	});

	assert.ok(result);
	assert.equal(result.source, "tool-observation-structured");

	const serializedSpec = JSON.stringify(result.spec);
	assert.match(serializedSpec, /line one/);
	assert.match(serializedSpec, /line two/);
	assert.match(serializedSpec, /line three/);
});

test("buildToolObservationStructuredFallback removes tool-definition/schema noise from Slack create message results", () => {
	const result = buildToolObservationStructuredFallback({
		prompt: "Send Slack message",
		observations: [
			{
				phase: "result",
				toolName: "slack_slack_atlassian_channel_create_message",
				text: [
					"<tool>slack_slack_atlassian_channel_create_message(channelId: string, text: string): Send a message to a channel in Slack.</tool> { \"type\": \"object\", \"properties\": { \"channelId\": { \"type\": \"string\" } } }",
					"<tool>slack_slack_atlassian_channel_create_message(channelId: string, text: string): Send a message to a channel in Slack.</tool>",
				].join("\n"),
			},
		],
	});

	assert.ok(result);
	const serializedSpec = JSON.stringify(result.spec);
	assert.doesNotMatch(serializedSpec, /<tool>/i);
	assert.doesNotMatch(serializedSpec, /channelId/i);
	assert.doesNotMatch(serializedSpec, /Send a message to a channel in Slack/i);
	assert.match(serializedSpec, /Slack message sent\./i);
});

test("buildToolObservationStructuredFallback uses concise Slack success fallback when only schema payload remains", () => {
	const result = buildToolObservationStructuredFallback({
		prompt: "Send Slack message",
		observations: [
			{
				phase: "result",
				toolName: "slack_slack_atlassian_channel_create_message",
				rawOutput: {
					type: "object",
					properties: {
						channelId: { type: "string" },
						text: { type: "string" },
					},
					required: ["channelId", "text"],
				},
				text: "{\"type\":\"object\",\"properties\":{\"channelId\":{\"type\":\"string\"}}}",
			},
		],
	});

	assert.ok(result);
	const serializedSpec = JSON.stringify(result.spec);
	assert.match(serializedSpec, /Slack message sent\./i);
	assert.doesNotMatch(serializedSpec, /channelId/i);
});

test("buildToolObservationStructuredFallback removes wrapper/schema lines while preserving non-slack meaningful text", () => {
	const result = buildToolObservationStructuredFallback({
		observations: [
			{
				phase: "result",
				toolName: "mcp__integrations__invoke_tool",
				text: [
					"<tool>google_google_calendar_atlassian_calendar_list_events(...)</tool>",
					"{\"type\":\"object\",\"properties\":{\"calendarId\":{\"type\":\"string\"}}}",
					"Fetched 2 calendar events for today.",
				].join("\n"),
			},
		],
	});

	assert.ok(result);
	const serializedSpec = JSON.stringify(result.spec);
	assert.match(serializedSpec, /Fetched 2 calendar events for today\./i);
	assert.doesNotMatch(serializedSpec, /<tool>/i);
	assert.doesNotMatch(serializedSpec, /calendarId/i);
});

test("buildToolObservationStructuredFallback reports omitted groups and events when limits apply", () => {
	const result = buildToolObservationStructuredFallback({
		observations: [
			{
				phase: "result",
				toolName: "tool.alpha",
				text: "alpha-1",
			},
			{
				phase: "result",
				toolName: "tool.alpha",
				text: "alpha-2",
			},
			{
				phase: "result",
				toolName: "tool.beta",
				text: "beta-1",
			},
		],
		maxToolGroups: 1,
		maxTotalEvents: 1,
		maxEventsPerTool: 1,
	});

	assert.ok(result);
	assert.equal(result.omittedGroups, 1);
	assert.equal(result.omittedEvents, 2);

	const serializedSpec = JSON.stringify(result.spec);
	assert.match(serializedSpec, /tool group omitted/i);
	assert.match(serializedSpec, /tool events omitted/i);
});

test("buildToolObservationStructuredFallback deduplicates repeated identical errors", () => {
	const result = buildToolObservationStructuredFallback({
		observations: [
			{
				phase: "error",
				toolName: "mcp__teamwork_graph__cypher_query",
				text: "SEMANTIC_ERROR invalid datetime format",
			},
			{
				phase: "error",
				toolName: "mcp__teamwork_graph__cypher_query",
				text: "SEMANTIC_ERROR invalid datetime format",
			},
		],
	});

	assert.ok(result);
	assert.equal(result.errorCount, 1);
	assert.equal(result.observationCount, 1);
	const serializedSpec = JSON.stringify(result.spec);
	assert.match(serializedSpec, /Tool results: 0 \| Tool errors: 1/i);
});

test("buildToolObservationStructuredFallback marks error-only payloads with retry-oriented description", () => {
	const result = buildToolObservationStructuredFallback({
		observations: [
			{
				phase: "error",
				toolName: "mcp__teamwork_graph__cypher_query",
				text: "SEMANTIC_ERROR invalid datetime format",
			},
		],
	});

	assert.ok(result);
	const serializedSpec = JSON.stringify(result.spec);
	assert.match(serializedSpec, /No successful tool results were returned/i);
});

test("buildToolObservationStructuredFallback uses result-focused description when mixed result and error observations exist", () => {
	const result = buildToolObservationStructuredFallback({
		observations: [
			{
				phase: "result",
				toolName: "mcp__google_calendar__list_events",
				text: "Returned one event",
			},
			{
				phase: "error",
				toolName: "mcp__google_calendar__list_events",
				text: "Timeout while fetching extended fields",
			},
		],
	});

	assert.ok(result);
	const serializedSpec = JSON.stringify(result.spec);
	assert.match(serializedSpec, /Generated from tool execution results\./i);
	assert.doesNotMatch(
		serializedSpec,
		/Generated from tool execution results and errors\./i
	);
});

test("buildToolObservationStructuredFallback returns null when no usable observations exist", () => {
	const result = buildToolObservationStructuredFallback({
		observations: [
			{
				phase: "start",
				toolName: "tool.alpha",
				text: "ignored",
			},
		],
	});

	assert.equal(result, null);
});
