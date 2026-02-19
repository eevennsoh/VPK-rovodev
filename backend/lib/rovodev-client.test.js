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
});
