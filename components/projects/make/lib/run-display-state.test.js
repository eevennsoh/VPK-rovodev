const test = require("node:test");
const assert = require("node:assert/strict");

const { resolveSidebarRunDisplayState } = require("./run-display-state.ts");

test("shows completed when running run has no active or failed tasks", () => {
	const run = {
		status: "running",
		tasks: [
			{ id: "task-1", completedAt: "2026-03-05T10:00:02.000Z" },
			{ id: "task-2", completedAt: "2026-03-05T10:00:05.000Z" },
		],
		completedAt: null,
		updatedAt: "2026-03-05T10:00:08.000Z",
	};

	const state = resolveSidebarRunDisplayState(run, {
		inReview: [],
		inProgress: [],
		failed: [],
		todo: [],
	});

	assert.equal(state.status, "completed");
	assert.equal(state.completedAt, "2026-03-05T10:00:05.000Z");
});

test("shows failed when running run has no active tasks and failed tasks remain", () => {
	const run = {
		status: "running",
		tasks: [
			{ id: "task-1", completedAt: "2026-03-05T10:00:02.000Z" },
			{ id: "task-2", completedAt: "2026-03-05T10:00:04.000Z" },
		],
		completedAt: null,
		updatedAt: "2026-03-05T10:00:08.000Z",
	};

	const state = resolveSidebarRunDisplayState(run, {
		inReview: [],
		inProgress: [],
		failed: [{ id: "task-2" }],
		todo: [],
	});

	assert.equal(state.status, "failed");
	assert.equal(state.completedAt, "2026-03-05T10:00:04.000Z");
});

test("keeps running when active tasks remain", () => {
	const run = {
		status: "running",
		tasks: [{ id: "task-1", completedAt: null }],
		completedAt: null,
		updatedAt: "2026-03-05T10:00:08.000Z",
	};

	const state = resolveSidebarRunDisplayState(run, {
		inReview: [],
		inProgress: [{ id: "task-1" }],
		failed: [],
		todo: [],
	});

	assert.equal(state.status, "running");
	assert.equal(state.completedAt, null);
});

test("reuses existing completed-run timing resolution", () => {
	const run = {
		status: "completed",
		tasks: [],
		completedAt: "2026-03-05T10:00:00.000Z",
		updatedAt: "2026-03-05T10:00:09.000Z",
		summary: { createdAt: "2026-03-05T10:00:04.000Z" },
		genuiSummary: { createdAt: "2026-03-05T10:00:06.000Z" },
	};

	const state = resolveSidebarRunDisplayState(run, {
		inReview: [],
		inProgress: [],
		failed: [],
		todo: [],
	});

	assert.equal(state.status, "completed");
	assert.equal(state.completedAt, "2026-03-05T10:00:09.000Z");
});

test("falls back to run updatedAt when no task completion timestamp exists", () => {
	const run = {
		status: "running",
		tasks: [{ id: "task-1", completedAt: null }],
		completedAt: null,
		updatedAt: "2026-03-05T10:00:08.000Z",
	};

	const state = resolveSidebarRunDisplayState(run, {
		inReview: [],
		inProgress: [],
		failed: [],
		todo: [],
	});

	assert.equal(state.status, "completed");
	assert.equal(state.completedAt, "2026-03-05T10:00:08.000Z");
});
