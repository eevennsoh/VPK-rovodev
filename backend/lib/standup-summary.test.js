const test = require("node:test");
const assert = require("node:assert/strict");

const {
	classifyStatus,
	buildStandupJql,
	mapIssueToStandupItem,
	buildStandupSummary,
	resolveLimit,
	createHttpError,
} = require("./standup-summary");

// ── classifyStatus ──────────────────────────────────────────────────────────

test("classifyStatus — exact match done statuses", () => {
	assert.equal(classifyStatus("Done"), "done");
	assert.equal(classifyStatus("done"), "done");
	assert.equal(classifyStatus("🎉 Done"), "done");
	assert.equal(classifyStatus("Closed"), "done");
	assert.equal(classifyStatus("Resolved"), "done");
	assert.equal(classifyStatus("Released"), "done");
	assert.equal(classifyStatus("Shipped"), "done");
	assert.equal(classifyStatus("Merged"), "done");
	assert.equal(classifyStatus("Completed"), "done");
	assert.equal(classifyStatus("Internal Prod Access Granted"), "done");
});

test("classifyStatus — exact match doing statuses", () => {
	assert.equal(classifyStatus("In Progress"), "doing");
	assert.equal(classifyStatus("In Review"), "doing");
	assert.equal(classifyStatus("In Development"), "doing");
	assert.equal(classifyStatus("Code Review"), "doing");
	assert.equal(classifyStatus("In Testing"), "doing");
	assert.equal(classifyStatus("🎨 Ready for UX"), "doing");
	assert.equal(classifyStatus("Ready for Review"), "doing");
	assert.equal(classifyStatus("Active"), "doing");
	assert.equal(classifyStatus("Open"), "doing");
});

test("classifyStatus — exact match blocker statuses", () => {
	assert.equal(classifyStatus("Blocked"), "blockers");
	assert.equal(classifyStatus("Needs Refinement"), "blockers");
	assert.equal(classifyStatus("On Hold"), "blockers");
	assert.equal(classifyStatus("Impediment"), "blockers");
	assert.equal(classifyStatus("Waiting"), "blockers");
	assert.equal(classifyStatus("Waiting for Support"), "blockers");
	assert.equal(classifyStatus("Escalated"), "blockers");
});

test("classifyStatus — case insensitive matching", () => {
	assert.equal(classifyStatus("DONE"), "done");
	assert.equal(classifyStatus("IN PROGRESS"), "doing");
	assert.equal(classifyStatus("BLOCKED"), "blockers");
	assert.equal(classifyStatus("  Done  "), "done");
});

test("classifyStatus — keyword fallback for unknown statuses", () => {
	assert.equal(classifyStatus("Task Completed Successfully"), "done");
	assert.equal(classifyStatus("PR Merged"), "done");
	assert.equal(classifyStatus("Deployment Released"), "done");
	assert.equal(classifyStatus("Blocked by external team"), "blockers");
	assert.equal(classifyStatus("Waiting for approval"), "blockers");
	assert.equal(classifyStatus("On Hold - pending review"), "blockers");
	assert.equal(classifyStatus("Escalated to management"), "blockers");
});

test("classifyStatus — unknown statuses default to doing", () => {
	assert.equal(classifyStatus("Some Random Status"), "doing");
	assert.equal(classifyStatus("Custom Workflow Step"), "doing");
	assert.equal(classifyStatus("Triaging"), "doing");
});

// ── buildStandupJql ─────────────────────────────────────────────────────────

test("buildStandupJql — defaults to 24h with no filters", () => {
	const jql = buildStandupJql();
	assert.equal(
		jql,
		"assignee = currentUser() AND updated >= -24h ORDER BY updated DESC",
	);
});

test("buildStandupJql — custom time window", () => {
	const jql = buildStandupJql({ hoursAgo: 48 });
	assert.equal(
		jql,
		"assignee = currentUser() AND updated >= -48h ORDER BY updated DESC",
	);
});

test("buildStandupJql — single project filter", () => {
	const jql = buildStandupJql({ projects: ["ASM"] });
	assert.equal(
		jql,
		'assignee = currentUser() AND project IN ("ASM") AND updated >= -24h ORDER BY updated DESC',
	);
});

test("buildStandupJql — multiple project filters", () => {
	const jql = buildStandupJql({ hoursAgo: 12, projects: ["ASM", "SLTNS", "GAIE"] });
	assert.equal(
		jql,
		'assignee = currentUser() AND project IN ("ASM", "SLTNS", "GAIE") AND updated >= -12h ORDER BY updated DESC',
	);
});

test("buildStandupJql — empty projects array treated as no filter", () => {
	const jql = buildStandupJql({ projects: [] });
	assert.equal(
		jql,
		"assignee = currentUser() AND updated >= -24h ORDER BY updated DESC",
	);
});

// ── resolveLimit ────────────────────────────────────────────────────────────

test("resolveLimit — defaults to 50 when not provided", () => {
	assert.equal(resolveLimit(), 50);
	assert.equal(resolveLimit(undefined), 50);
	assert.equal(resolveLimit(null), 50);
});

test("resolveLimit — respects valid limit values", () => {
	assert.equal(resolveLimit(10), 10);
	assert.equal(resolveLimit(1), 1);
	assert.equal(resolveLimit(100), 100);
	assert.equal(resolveLimit(50), 50);
});

test("resolveLimit — clamps to max 100", () => {
	assert.equal(resolveLimit(200), 100);
	assert.equal(resolveLimit(999), 100);
});

test("resolveLimit — clamps to min 1", () => {
	assert.equal(resolveLimit(0), 1);
	assert.equal(resolveLimit(-5), 1);
	assert.equal(resolveLimit(-100), 1);
});

test("resolveLimit — handles non-numeric values", () => {
	assert.equal(resolveLimit("abc"), 50);
	assert.equal(resolveLimit(NaN), 50);
	assert.equal(resolveLimit(Infinity), 50);
});

test("resolveLimit — floors fractional values", () => {
	assert.equal(resolveLimit(10.9), 10);
	assert.equal(resolveLimit(1.1), 1);
});

// ── createHttpError ─────────────────────────────────────────────────────────

test("createHttpError — creates Error with statusCode", () => {
	const error = createHttpError(400, "Bad request");
	assert.ok(error instanceof Error);
	assert.equal(error.message, "Bad request");
	assert.equal(error.statusCode, 400);
});

test("createHttpError — 500 server error", () => {
	const error = createHttpError(500, "Internal server error");
	assert.equal(error.statusCode, 500);
	assert.equal(error.message, "Internal server error");
});

// ── mapIssueToStandupItem ───────────────────────────────────────────────────

test("mapIssueToStandupItem — maps complete Jira issue", () => {
	const issue = {
		key: "ASM-47",
		fields: {
			summary: "Tools & Actions",
			status: { name: "Done" },
			assignee: { displayName: "Ee Venn Soh" },
			priority: { name: "Minor" },
			issuetype: { name: "Dependency" },
			project: { key: "ASM", name: "Agent Studio" },
			updated: "2026-02-10T10:00:00.000Z",
			created: "2025-07-21T08:00:00.000Z",
		},
	};

	const item = mapIssueToStandupItem(issue, "product-fabric.atlassian.net");

	assert.equal(item.key, "ASM-47");
	assert.equal(item.summary, "Tools & Actions");
	assert.equal(item.status, "Done");
	assert.equal(item.bucket, "done");
	assert.equal(item.priority, "Minor");
	assert.equal(item.type, "Dependency");
	assert.equal(item.assignee, "Ee Venn Soh");
	assert.equal(item.project, "Agent Studio");
	assert.equal(item.projectKey, "ASM");
	assert.equal(item.url, "https://product-fabric.atlassian.net/browse/ASM-47");
	assert.equal(item.updatedAt, "2026-02-10T10:00:00.000Z");
	assert.equal(item.createdAt, "2025-07-21T08:00:00.000Z");
});

test("mapIssueToStandupItem — handles missing fields with defaults", () => {
	const issue = {
		key: "TEST-1",
		fields: {},
	};

	const item = mapIssueToStandupItem(issue, "example.atlassian.net");

	assert.equal(item.key, "TEST-1");
	assert.equal(item.summary, "");
	assert.equal(item.status, "Unknown");
	assert.equal(item.bucket, "doing"); // unknown defaults to doing
	assert.equal(item.priority, "Medium");
	assert.equal(item.type, "Task");
	assert.equal(item.assignee, "Unassigned");
	assert.equal(item.project, "");
	assert.equal(item.projectKey, "");
	assert.equal(item.url, "https://example.atlassian.net/browse/TEST-1");
});

test("mapIssueToStandupItem — handles null assignee", () => {
	const issue = {
		key: "TEST-2",
		fields: {
			summary: "No assignee issue",
			status: { name: "In Progress" },
			assignee: null,
			priority: { name: "High" },
			issuetype: { name: "Story" },
			project: { key: "TEST", name: "Test Project" },
			updated: "2026-03-01T12:00:00.000Z",
			created: "2026-03-01T10:00:00.000Z",
		},
	};

	const item = mapIssueToStandupItem(issue, "test.atlassian.net");

	assert.equal(item.assignee, "Unassigned");
	assert.equal(item.bucket, "doing");
});

test("mapIssueToStandupItem — classifies blocked status", () => {
	const issue = {
		key: "BLK-1",
		fields: {
			summary: "Blocked item",
			status: { name: "Needs Refinement" },
			priority: { name: "Critical" },
			issuetype: { name: "Bug" },
			project: { key: "BLK", name: "Blocker" },
			updated: "2026-03-02T09:00:00.000Z",
			created: "2026-03-01T09:00:00.000Z",
		},
	};

	const item = mapIssueToStandupItem(issue, "test.atlassian.net");

	assert.equal(item.bucket, "blockers");
	assert.equal(item.status, "Needs Refinement");
});

// ── buildStandupSummary ─────────────────────────────────────────────────────

test("buildStandupSummary — groups items into buckets with correct metrics", () => {
	const items = [
		{ key: "A-1", bucket: "done", status: "Done" },
		{ key: "A-2", bucket: "done", status: "Closed" },
		{ key: "A-3", bucket: "doing", status: "In Progress" },
		{ key: "A-4", bucket: "blockers", status: "Blocked" },
		{ key: "A-5", bucket: "blockers", status: "On Hold" },
	];

	const summary = buildStandupSummary(items, "test.atlassian.net", 24);

	assert.equal(summary.siteUrl, "test.atlassian.net");
	assert.equal(summary.timeWindowHours, 24);
	assert.equal(typeof summary.generatedAt, "string");

	// Metrics
	assert.equal(summary.metrics.total, 5);
	assert.equal(summary.metrics.done, 2);
	assert.equal(summary.metrics.doing, 1);
	assert.equal(summary.metrics.blockers, 2);

	// Buckets
	assert.equal(summary.buckets.done.length, 2);
	assert.equal(summary.buckets.doing.length, 1);
	assert.equal(summary.buckets.blockers.length, 2);

	// Items preserved
	assert.equal(summary.items.length, 5);
});

test("buildStandupSummary — handles empty items list", () => {
	const summary = buildStandupSummary([], "test.atlassian.net", 24);

	assert.equal(summary.metrics.total, 0);
	assert.equal(summary.metrics.done, 0);
	assert.equal(summary.metrics.doing, 0);
	assert.equal(summary.metrics.blockers, 0);
	assert.equal(summary.buckets.done.length, 0);
	assert.equal(summary.buckets.doing.length, 0);
	assert.equal(summary.buckets.blockers.length, 0);
	assert.equal(summary.items.length, 0);
});

test("buildStandupSummary — all items in one bucket", () => {
	const items = [
		{ key: "D-1", bucket: "done" },
		{ key: "D-2", bucket: "done" },
		{ key: "D-3", bucket: "done" },
	];

	const summary = buildStandupSummary(items, "test.atlassian.net", 48);

	assert.equal(summary.timeWindowHours, 48);
	assert.equal(summary.metrics.total, 3);
	assert.equal(summary.metrics.done, 3);
	assert.equal(summary.metrics.doing, 0);
	assert.equal(summary.metrics.blockers, 0);
});

test("buildStandupSummary — generatedAt is a valid ISO timestamp", () => {
	const summary = buildStandupSummary([], "test.atlassian.net", 24);
	const parsed = new Date(summary.generatedAt);
	assert.ok(!isNaN(parsed.getTime()), "generatedAt should be a valid date");
});
