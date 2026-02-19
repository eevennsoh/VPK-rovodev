const test = require("node:test");
const assert = require("node:assert/strict");

const {
	ASSISTANT_JSON_SUPPRESSION_TEXT,
	sanitizeAssistantNarrative,
	toPreview,
} = require("./tool-output-sanitizer");

test("toPreview truncates long structured payloads and tracks byte size", () => {
	const payload = {
		calendarId: "team@example.com",
		events: Array.from({ length: 120 }, (_, index) => ({
			id: `event-${index}`,
			summary: `Event ${index}`,
			start: { dateTime: `2026-02-${String((index % 28) + 1).padStart(2, "0")}T10:00:00` },
			end: { dateTime: `2026-02-${String((index % 28) + 1).padStart(2, "0")}T11:00:00` },
			location: "Remote",
		})),
	};

	const preview = toPreview(payload, {
		maxChars: 320,
		maxLines: 8,
	});

	assert.equal(typeof preview.text, "string");
	assert.equal(preview.truncated, true);
	assert.ok(preview.text.length <= 320);
	assert.ok(preview.bytes > preview.text.length);
});

test("toPreview keeps short text untouched", () => {
	const preview = toPreview("Short output");
	assert.equal(preview.text, "Short output");
	assert.equal(preview.truncated, false);
	assert.equal(preview.bytes, "Short output".length);
});

test("sanitizeAssistantNarrative replaces large JSON-like dumps", () => {
	const rawJson = JSON.stringify(
		{
			calendarId: "esoh@atlassian.com",
			timeZone: "Australia/Sydney",
			events: Array.from({ length: 80 }, (_, index) => ({
				id: `evt-${index}`,
				summary: `Deep work ${index}`,
				htmlLink: `https://www.google.com/calendar/event?eid=${index}`,
			})),
		},
		null,
		2
	);
	const assistantText = `Let me fetch your Google Calendar events.\n${rawJson}`;

	const sanitized = sanitizeAssistantNarrative(assistantText, {
		maxChars: 600,
		replacement: ASSISTANT_JSON_SUPPRESSION_TEXT,
	});

	assert.equal(sanitized.replaced, true);
	assert.match(sanitized.text, /Tool results were large and are omitted/);
});

test("sanitizeAssistantNarrative does not replace long non-JSON prose", () => {
	const longProse = Array.from({ length: 300 }, () => "status update")
		.join(" ")
		.trim();
	const sanitized = sanitizeAssistantNarrative(longProse, { maxChars: 600 });

	assert.equal(sanitized.replaced, false);
	assert.equal(sanitized.text, longProse);
});
