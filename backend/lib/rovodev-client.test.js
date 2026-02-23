const test = require("node:test");
const assert = require("node:assert/strict");

const { extractChunkFromEvent } = require("./rovodev-client");

test("extractChunkFromEvent bounds large retry-prompt payloads", () => {
	const largePayload = {
		calendarId: "esoh@atlassian.com",
		timeZone: "Australia/Sydney",
		events: Array.from({ length: 140 }, (_, index) => ({
			id: `ev-${index}`,
			status: "confirmed",
			summary: `Deep work ${index}`,
			htmlLink: `https://www.google.com/calendar/event?eid=${index}`,
		})),
	};

	const chunk = extractChunkFromEvent("retry-prompt", {
		content: largePayload,
		tool_name: "google_calendar",
		tool_call_id: "call-1",
	});

	assert.ok(chunk);
	assert.equal(chunk.type, "tool_result");
	assert.equal(chunk.toolName, "google_calendar");
	assert.equal(chunk.toolCallId, "call-1");
	assert.equal(typeof chunk.outputPreview, "string");
	assert.equal(chunk.text, chunk.outputPreview);
	assert.equal(chunk.outputTruncated, true);
	assert.ok(chunk.outputPreview.length <= 1200);
	assert.ok(chunk.outputBytes > chunk.outputPreview.length);
	assert.equal(typeof chunk.rawOutput, "object");
	assert.equal(Array.isArray(chunk.rawOutput.events), true);
	assert.equal(chunk.rawOutput.events.length, 140);
});

test("extractChunkFromEvent marks error payloads as tool_error", () => {
	const chunk = extractChunkFromEvent("tool-return", {
		content: "Error: Google Calendar API quota exceeded",
		tool_name: "google_calendar",
		tool_call_id: "call-2",
	});

	assert.ok(chunk);
	assert.equal(chunk.type, "tool_error");
	assert.equal(chunk.toolName, "google_calendar");
	assert.equal(chunk.toolCallId, "call-2");
	assert.equal(chunk.outputPreview, "Error: Google Calendar API quota exceeded");
	assert.equal(chunk.outputTruncated, false);
	assert.equal(chunk.rawOutput, "Error: Google Calendar API quota exceeded");
});

test("extractChunkFromEvent parses tool_result success payload variants", () => {
	const chunk = extractChunkFromEvent("tool_result", {
		status: "success",
		output: {
			events: [
				{ id: "event-1", summary: "Standup" },
			],
		},
		toolName: "google_calendar",
		callId: "call-3",
	});

	assert.ok(chunk);
	assert.equal(chunk.type, "tool_result");
	assert.equal(chunk.toolName, "google_calendar");
	assert.equal(chunk.toolCallId, "call-3");
	assert.equal(typeof chunk.outputPreview, "string");
	assert.equal(typeof chunk.rawOutput, "object");
	assert.equal(Array.isArray(chunk.rawOutput.events), true);
});

test("extractChunkFromEvent parses tool_result error payload variants", () => {
	const chunk = extractChunkFromEvent("tool_result", {
		status: "failed",
		error: "Permission denied for calendar",
		tool_name: "google_calendar",
		call_id: "call-4",
	});

	assert.ok(chunk);
	assert.equal(chunk.type, "tool_error");
	assert.equal(chunk.toolName, "google_calendar");
	assert.equal(chunk.toolCallId, "call-4");
	assert.match(chunk.outputPreview, /Permission denied/i);
});

test("extractChunkFromEvent treats structured error JSON output as tool_error", () => {
	const chunk = extractChunkFromEvent("tool_result", {
		output: JSON.stringify({
			httpStatus: 400,
			errors: [
				{
					type: "MCP_TOOL_CONFIGURATION_INVALID_INPUT",
					message: "restricted_action",
				},
			],
		}),
		tool_name: "mcp__integrations__invoke_tool",
		tool_call_id: "call-5",
	});

	assert.ok(chunk);
	assert.equal(chunk.type, "tool_error");
	assert.equal(chunk.toolName, "mcp__integrations__invoke_tool");
	assert.equal(chunk.toolCallId, "call-5");
	assert.match(chunk.outputPreview, /restricted_action/i);
});
