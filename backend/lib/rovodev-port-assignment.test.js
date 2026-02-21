const test = require("node:test");
const assert = require("node:assert/strict");

const {
	STRICT_ROVODEV_PORTS,
	resolveStrictRovoDevPortCandidates,
	resolveStrictRovoDevPortAssignment,
	buildRovoDevPortBindingInstruction,
} = require("./rovodev-port-assignment");

test("resolveStrictRovoDevPortAssignment falls back to strict defaults", () => {
	assert.deepEqual(STRICT_ROVODEV_PORTS, [8000, 8001, 8002]);
	assert.equal(
		resolveStrictRovoDevPortAssignment(0, { activePorts: [] }).rovoPort,
		8000
	);
	assert.equal(
		resolveStrictRovoDevPortAssignment(1, { activePorts: [] }).rovoPort,
		8001
	);
	assert.equal(
		resolveStrictRovoDevPortAssignment(2, { activePorts: [] }).rovoPort,
		8002
	);
});

test("resolveStrictRovoDevPortCandidates returns panel shard ports", () => {
	const candidates = resolveStrictRovoDevPortCandidates(1, {
		activePorts: [8000, 8001, 8002, 8003, 8004, 8005],
	});

	assert.deepEqual(candidates, [8001, 8004]);
});

test("resolveStrictRovoDevPortAssignment prefers an available candidate", () => {
	const assignment = resolveStrictRovoDevPortAssignment(0, {
		activePorts: [8000, 8001, 8002, 8003, 8004, 8005],
		poolStatus: {
			ports: [
				{ port: 8000, status: "busy" },
				{ port: 8003, status: "available" },
				{ port: 8001, status: "available" },
				{ port: 8004, status: "available" },
				{ port: 8002, status: "available" },
				{ port: 8005, status: "available" },
			],
		},
	});

	assert.equal(assignment.rovoPort, 8003);
	assert.deepEqual(assignment.candidatePorts, [8000, 8003]);
});

test("resolveStrictRovoDevPortAssignment supports indices beyond 2 with active ports", () => {
	const assignment = resolveStrictRovoDevPortAssignment(3, {
		activePorts: [8000, 8001, 8002, 8003, 8004, 8005],
	});

	assert.equal(assignment.rovoPort, 8000);
	assert.deepEqual(assignment.candidatePorts, [8000, 8003]);
	assert.equal(assignment.panelLabel, "3");
});

test("resolveStrictRovoDevPortAssignment rejects invalid indices", () => {
	assert.throws(() => resolveStrictRovoDevPortAssignment(-1), (error) => {
		assert.equal(error.code, "INVALID_ROVODEV_PORT_INDEX");
		assert.match(error.message, /portIndex must be a non-negative integer/);
		return true;
	});
	assert.throws(() => resolveStrictRovoDevPortCandidates(-1), (error) => {
		assert.equal(error.code, "INVALID_ROVODEV_PORT_INDEX");
		return true;
	});
});

test("buildRovoDevPortBindingInstruction includes exact bound port", () => {
	const instruction = buildRovoDevPortBindingInstruction({
		portIndex: 1,
		rovoPort: 8001,
		panelLabel: "B",
	});

	assert.match(instruction, /pinned to RovoDev port 8001/);
	assert.match(instruction, /respond with exactly: 8001/);
});

test("resolveStrictRovoDevPortAssignment ignores unhealthy candidates when possible", () => {
	const assignment = resolveStrictRovoDevPortAssignment(2, {
		activePorts: [8000, 8001, 8002, 8003, 8004, 8005],
		poolStatus: {
			ports: [
				{ port: 8002, status: "unhealthy" },
				{ port: 8005, status: "busy" },
			],
		},
	});

	assert.equal(assignment.rovoPort, 8005);
});

test("resolveStrictRovoDevPortAssignment returns first candidate without pool status", () => {
	const assignment = resolveStrictRovoDevPortAssignment(0, {
		activePorts: [8000, 8001, 8002, 8003, 8004, 8005],
	});

	assert.equal(assignment.rovoPort, 8000);
	assert.deepEqual(assignment.candidatePorts, [8000, 8003]);
});

test("resolveStrictRovoDevPortCandidates falls back to strict ports when active list is empty", () => {
	const candidates = resolveStrictRovoDevPortCandidates(2, {
		activePorts: [],
	});

	assert.deepEqual(candidates, [8002]);
});

test("resolveStrictRovoDevPortCandidates maps repeated shard for larger indices", () => {
	const candidates = resolveStrictRovoDevPortCandidates(4, {
		activePorts: [8000, 8001, 8002, 8003, 8004, 8005],
	});

	assert.deepEqual(candidates, [8001, 8004]);
});

test("resolveStrictRovoDevPortAssignment keeps strict fallback for larger indices when no active ports", () => {
	const assignment = resolveStrictRovoDevPortAssignment(4, {
		activePorts: [],
	});

	assert.equal(assignment.rovoPort, 8001);
	assert.deepEqual(assignment.candidatePorts, [8001]);
});

test("resolveStrictRovoDevPortCandidates deduplicates invalid and duplicate active ports", () => {
	const candidates = resolveStrictRovoDevPortCandidates(1, {
		activePorts: [8000, 8001, "bad", 8001, 0, -3, 8004],
	});

	assert.deepEqual(candidates, [8001]);
});

test("resolveStrictRovoDevPortAssignment defaults to first candidate when all candidates are unhealthy", () => {
	const assignment = resolveStrictRovoDevPortAssignment(1, {
		activePorts: [8000, 8001, 8002, 8003, 8004, 8005],
		poolStatus: {
			ports: [
				{ port: 8001, status: "unhealthy" },
				{ port: 8004, status: "unhealthy" },
			],
		},
	});

	assert.equal(assignment.rovoPort, 8001);
});

test("resolveStrictRovoDevPortAssignment handles unknown pool entries gracefully", () => {
	const assignment = resolveStrictRovoDevPortAssignment(0, {
		activePorts: [8000, 8001, 8002, 8003, 8004, 8005],
		poolStatus: {
			ports: [{ port: 9999, status: "available" }],
		},
	});

	assert.equal(assignment.rovoPort, 8000);
});

test("resolveStrictRovoDevPortAssignment supports pool status with mixed casing", () => {
	const assignment = resolveStrictRovoDevPortAssignment(0, {
		activePorts: [8000, 8001, 8002, 8003, 8004, 8005],
		poolStatus: {
			ports: [
				{ port: 8000, status: "BUSY" },
				{ port: 8003, status: "AVAILABLE" },
			],
		},
	});

	assert.equal(assignment.rovoPort, 8003);
});

test("resolveStrictRovoDevPortCandidates supports strict fallback shard mapping for high indices", () => {
	const candidates = resolveStrictRovoDevPortCandidates(7, {
		activePorts: [],
	});

	assert.deepEqual(candidates, [8001]);
});

test("buildRovoDevPortBindingInstruction includes exact bound port for high index labels", () => {
	const instruction = buildRovoDevPortBindingInstruction({
		portIndex: 7,
		rovoPort: 8004,
		panelLabel: "7",
	});

	assert.match(instruction, /port 8004/);
	assert.match(instruction, /index 7/);
});

test("resolveStrictRovoDevPortCandidates handles sparse active port arrays", () => {
	const candidates = resolveStrictRovoDevPortCandidates(2, {
		activePorts: [9000],
	});

	assert.deepEqual(candidates, [9000]);
});

test("resolveStrictRovoDevPortAssignment keeps deterministic first candidate for sparse arrays", () => {
	const assignment = resolveStrictRovoDevPortAssignment(5, {
		activePorts: [9000],
	});

	assert.equal(assignment.rovoPort, 9000);
	assert.deepEqual(assignment.candidatePorts, [9000]);
});

test("resolveStrictRovoDevPortCandidates uses modulo shard for uneven active ports", () => {
	const candidates = resolveStrictRovoDevPortCandidates(1, {
		activePorts: [8000, 8001, 8002, 8003],
	});

	assert.deepEqual(candidates, [8001]);
});

test("resolveStrictRovoDevPortAssignment returns available uneven shard candidate", () => {
	const assignment = resolveStrictRovoDevPortAssignment(1, {
		activePorts: [8000, 8001, 8002, 8003],
		poolStatus: {
			ports: [
				{ port: 8001, status: "available" },
			],
		},
	});

	assert.equal(assignment.rovoPort, 8001);
});

test("resolveStrictRovoDevPortCandidates allows active port list from pool snapshot", () => {
	const snapshotPorts = [
		{ port: 8100, status: "available" },
		{ port: 8101, status: "available" },
		{ port: 8102, status: "available" },
		{ port: 8103, status: "available" },
	];

	const candidates = resolveStrictRovoDevPortCandidates(0, {
		activePorts: snapshotPorts.map((entry) => entry.port),
	});

	assert.deepEqual(candidates, [8100, 8103]);
});

test("resolveStrictRovoDevPortAssignment selects non-unhealthy candidate when none are available", () => {
	const assignment = resolveStrictRovoDevPortAssignment(0, {
		activePorts: [8100, 8101, 8102, 8103],
		poolStatus: {
			ports: [
				{ port: 8100, status: "busy" },
				{ port: 8103, status: "unhealthy" },
			],
		},
	});

	assert.equal(assignment.rovoPort, 8100);
});

test("resolveStrictRovoDevPortCandidates throws when index is not integer", () => {
	assert.throws(
		() => resolveStrictRovoDevPortCandidates(1.2),
		(error) => {
			assert.equal(error.code, "INVALID_ROVODEV_PORT_INDEX");
			return true;
		}
	);
});
