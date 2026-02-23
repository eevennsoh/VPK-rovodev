const test = require("node:test");
const assert = require("node:assert/strict");

const {
	buildGoogleStructuredFallback,
} = require("./genui-google-tool-fallback");

function buildCalendarEvent(index) {
	return {
		id: `evt-${index}`,
		summary: `Event ${index}`,
		start: {
			dateTime: `2026-03-${String((index % 28) + 1).padStart(2, "0")}T09:00:00Z`,
		},
		end: {
			dateTime: `2026-03-${String((index % 28) + 1).padStart(2, "0")}T10:00:00Z`,
		},
		htmlLink: `https://calendar.google.com/event?eid=${index}`,
	};
}

function buildDriveFile(index) {
	return {
		id: `file-${index}`,
		name: `File ${index}`,
		mimeType: "application/pdf",
		modifiedTime: `2026-03-${String((index % 28) + 1).padStart(2, "0")}T12:00:00Z`,
		webViewLink: `https://drive.google.com/file/d/${index}/view`,
		owners: [{ displayName: "Ee Venn Soh" }],
	};
}

test("buildGoogleStructuredFallback renders top 10 Google Calendar events", () => {
	const result = buildGoogleStructuredFallback({
		prompt: "List Google Calendar events",
		observations: [
			{
				phase: "result",
				toolName: "mcp__google_calendar__list_events",
				rawOutput: {
					calendarId: "primary",
					timeZone: "UTC",
					events: Array.from({ length: 12 }, (_, index) => buildCalendarEvent(index)),
				},
			},
		],
	});

	assert.ok(result);
	assert.equal(result.source, "tool-observation-google-calendar-structured");
	assert.match(result.summary, /Rendered 10 Google Calendar events/);
	assert.equal(result.spec.elements["calendar-events-timeline"]?.type, "Timeline");
	assert.equal(
		result.spec.elements["calendar-events-timeline"]?.props?.items?.length,
		10
	);
	assert.equal(
		result.spec.elements["calendar-events-timeline"]?.props?.items?.[0]?.title,
		"Event 0"
	);
});

test("buildGoogleStructuredFallback renders Google Calendar info when no events exist", () => {
	const result = buildGoogleStructuredFallback({
		prompt: "Show my Google Calendar",
		observations: [
			{
				phase: "result",
				toolName: "mcp__google_calendar__list_events",
				rawOutput: {
					calendarId: "primary",
					timeZone: "Australia/Sydney",
					summary: "Personal Calendar",
					events: [],
				},
			},
		],
	});

	assert.ok(result);
	assert.equal(result.source, "tool-observation-google-calendar-structured");
	assert.equal(result.summary, "Rendered Google Calendar details.");
	const serialized = JSON.stringify(result.spec);
	assert.match(serialized, /Calendar ID: primary/);
	assert.match(serialized, /Time zone: Australia\/Sydney/);
});

test("buildGoogleStructuredFallback renders top 10 Google Drive files", () => {
	const result = buildGoogleStructuredFallback({
		prompt: "List Google Drive files",
		observations: [
			{
				phase: "result",
				toolName: "mcp__google_drive__list_files",
				rawOutput: {
					files: Array.from({ length: 12 }, (_, index) => buildDriveFile(index)),
				},
			},
		],
	});

	assert.ok(result);
	assert.equal(result.source, "tool-observation-google-drive-structured");
	assert.match(result.summary, /Rendered 10 Google Drive files/);
	assert.ok(result.spec.elements["drive-file-9"]);
	assert.equal(result.spec.elements["drive-file-10"], undefined);
});

test("buildGoogleStructuredFallback renders Google Drive account info when no files exist", () => {
	const result = buildGoogleStructuredFallback({
		prompt: "List Google Drive files",
		observations: [
			{
				phase: "result",
				toolName: "mcp__google_drive__about",
				rawOutput: {
					user: {
						displayName: "Ee Venn Soh",
						emailAddress: "esoh@atlassian.com",
					},
					storageQuota: {
						usageInDrive: "129000000000",
						limit: "214748364800",
					},
				},
			},
		],
	});

	assert.ok(result);
	assert.equal(result.source, "tool-observation-google-drive-structured");
	assert.equal(result.summary, "Rendered Google Drive account details.");
	const serialized = JSON.stringify(result.spec);
	assert.match(serialized, /Account: Ee Venn Soh/);
	assert.match(serialized, /Email: esoh@atlassian.com/);
});

test("buildGoogleStructuredFallback parses stringified JSON raw output", () => {
	const result = buildGoogleStructuredFallback({
		prompt: "List Google Calendar events",
		observations: [
			{
				phase: "result",
				toolName: "mcp__google_calendar__list_events",
				rawOutput: JSON.stringify({
					calendarId: "primary",
					events: [buildCalendarEvent(1)],
				}),
			},
		],
	});

	assert.ok(result);
	assert.equal(result.source, "tool-observation-google-calendar-structured");
	assert.match(result.summary, /Rendered 1 Google Calendar event/);
});

test("buildGoogleStructuredFallback replaces generic tool metadata with Google Calendar defaults", () => {
	const result = buildGoogleStructuredFallback({
		prompt: "List Google Calendar events",
		title: "Tool results",
		description: "Generated from tool execution results and errors.",
		observations: [
			{
				phase: "result",
				toolName: "mcp__google_calendar__list_events",
				rawOutput: {
					events: [buildCalendarEvent(1)],
				},
			},
			{
				phase: "error",
				toolName: "mcp__google_calendar__list_events",
				text: "Transient timeout",
			},
		],
	});

	assert.ok(result);
	assert.equal(result.spec.elements["summary-card"]?.props?.title, "Google Calendar");
	assert.equal(
		result.spec.elements["summary-card"]?.props?.description,
		"Upcoming events from Google Calendar."
	);
});

test("buildGoogleStructuredFallback replaces generic tool metadata with Google Drive defaults", () => {
	const result = buildGoogleStructuredFallback({
		prompt: "List Google Drive files",
		title: "Tool results",
		description: "Generated from successful integration tool calls.",
		observations: [
			{
				phase: "result",
				toolName: "mcp__google_drive__list_files",
				rawOutput: {
					files: [buildDriveFile(1)],
				},
			},
			{
				phase: "error",
				toolName: "mcp__google_drive__list_files",
				text: "Temporary auth refresh failure",
			},
		],
	});

	assert.ok(result);
	assert.equal(result.spec.elements["summary-card"]?.props?.title, "Google Drive");
	assert.equal(
		result.spec.elements["summary-card"]?.props?.description,
		"Files from Google Drive."
	);
});
