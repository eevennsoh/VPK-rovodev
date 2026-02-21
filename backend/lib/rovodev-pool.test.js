const test = require("node:test");
const assert = require("node:assert/strict");

const { createRovoDevPool } = require("./rovodev-pool");

test("acquireByPort acquires the exact requested port", async () => {
	const pool = createRovoDevPool([8000, 8001, 8002], {
		healthCheckIntervalMs: 0,
	});

	const handle = await pool.acquireByPort(8001);
	assert.equal(handle.port, 8001);

	handle.release();
	pool.shutdown();
});

test("acquireByPort rejects unknown ports", async () => {
	const pool = createRovoDevPool([8000, 8001, 8002], {
		healthCheckIntervalMs: 0,
	});

	await assert.rejects(
		() => pool.acquireByPort(8999),
		/not part of the active pool/
	);

	pool.shutdown();
});
