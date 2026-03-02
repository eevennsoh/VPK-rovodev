const test = require("node:test");
const assert = require("node:assert/strict");

const { resolveRunCompletedAtForDisplay } = require("./run-timing.ts");

test("uses the latest summary-related timestamp for completed runs", () => {
	const completedAt = "2026-02-18T10:00:00.000Z";
	const summaryAt = "2026-02-18T10:00:04.000Z";
	const genuiAt = "2026-02-18T10:00:06.000Z";
	const updatedAt = "2026-02-18T10:00:09.000Z";

	const resolved = resolveRunCompletedAtForDisplay({
		status: "completed",
		completedAt,
		updatedAt,
		summary: { createdAt: summaryAt },
		genuiSummary: { createdAt: genuiAt },
	});

	assert.equal(resolved, updatedAt);
});

test("falls back to completedAt when summary timestamps are missing", () => {
	const completedAt = "2026-02-18T10:00:00.000Z";

	const resolved = resolveRunCompletedAtForDisplay({
		status: "failed",
		completedAt,
		updatedAt: "2026-02-18T10:00:00.000Z",
		summary: null,
		genuiSummary: null,
	});

	assert.equal(resolved, completedAt);
});

test("does not override active run timing", () => {
	const resolved = resolveRunCompletedAtForDisplay({
		status: "running",
		completedAt: null,
		updatedAt: "2026-02-18T10:00:09.000Z",
		summary: { createdAt: "2026-02-18T10:00:04.000Z" },
		genuiSummary: { createdAt: "2026-02-18T10:00:06.000Z" },
	});

	assert.equal(resolved, null);
});

test("ignores invalid timestamps", () => {
	const completedAt = "2026-02-18T10:00:00.000Z";

	const resolved = resolveRunCompletedAtForDisplay({
		status: "completed",
		completedAt,
		updatedAt: "not-a-date",
		summary: { createdAt: "also-not-a-date" },
		genuiSummary: null,
	});

	assert.equal(resolved, completedAt);
});
