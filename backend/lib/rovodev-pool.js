/**
 * RovoDev Serve Pool Manager.
 *
 * Manages a pool of `rovodev serve` ports so multiple LLM calls can run
 * concurrently — one per port. Each `set_chat_message` + `stream_chat`
 * pair is pinned to a single port via acquire/release.
 *
 * With a single port the pool acts as a simple mutex, semantically
 * identical to the previous single-process behavior.
 */

const { healthCheck } = require("./rovodev-client");

const DEFAULT_HEALTH_CHECK_INTERVAL_MS = 30_000;

/**
 * @typedef {"available" | "busy" | "unhealthy"} PortStatus
 *
 * @typedef {object} PortEntry
 * @property {number} port
 * @property {PortStatus} status
 * @property {number} lastHealthCheck
 * @property {number | null} acquiredAt
 *
 * @typedef {object} PortHandle
 * @property {number} port
 * @property {() => void} release
 *
 * @typedef {object} PoolStatus
 * @property {number} total
 * @property {number} available
 * @property {number} busy
 * @property {number} unhealthy
 * @property {PortEntry[]} ports
 */

/**
 * Create a RovoDev port pool.
 *
 * @param {number[]} ports - Array of port numbers to manage
 * @param {object} [options]
 * @param {number} [options.healthCheckIntervalMs] - Interval between health checks (default 30s)
 * @returns {{ acquire: (opts?: { timeoutMs?: number; signal?: AbortSignal }) => Promise<PortHandle>; getStatus: () => PoolStatus; shutdown: () => void }}
 */
function createRovoDevPool(ports, options = {}) {
	const { healthCheckIntervalMs = DEFAULT_HEALTH_CHECK_INTERVAL_MS } = options;

	/** @type {PortEntry[]} */
	const entries = ports.map((port) => ({
		port,
		status: "available",
		lastHealthCheck: Date.now(),
		acquiredAt: null,
	}));

	/** @type {Array<{ resolve: (handle: PortHandle) => void; reject: (err: Error) => void }>} */
	const waiters = [];

	let healthCheckTimer = null;
	let shuttingDown = false;

	// ── Notify pattern ──────────────────────────────────────────────────

	function tryNotifyWaiter() {
		if (waiters.length === 0) {
			return;
		}

		const entry = entries.find((e) => e.status === "available");
		if (!entry) {
			return;
		}

		entry.status = "busy";
		entry.acquiredAt = Date.now();

		const waiter = waiters.shift();
		waiter.resolve(createHandle(entry));
	}

	function createHandle(entry) {
		let released = false;
		return {
			port: entry.port,
			release: () => {
				if (released) {
					return;
				}
				released = true;
				entry.status = "available";
				entry.acquiredAt = null;
				tryNotifyWaiter();
			},
		};
	}

	// ── Acquire ─────────────────────────────────────────────────────────

	/**
	 * Acquire an available port from the pool.
	 *
	 * @param {object} [opts]
	 * @param {number} [opts.timeoutMs] - Maximum wait time (default 30s)
	 * @param {AbortSignal} [opts.signal] - Abort signal for early cancellation
	 * @returns {Promise<PortHandle>}
	 */
	function acquire({ timeoutMs = 30_000, signal } = {}) {
		if (shuttingDown) {
			return Promise.reject(new Error("Pool is shutting down"));
		}

		// Fast path — grab an available port immediately
		const entry = entries.find((e) => e.status === "available");
		if (entry) {
			entry.status = "busy";
			entry.acquiredAt = Date.now();
			return Promise.resolve(createHandle(entry));
		}

		// Slow path — wait for a release
		return new Promise((resolve, reject) => {
			const waiter = { resolve, reject };
			waiters.push(waiter);

			const cleanup = () => {
				const idx = waiters.indexOf(waiter);
				if (idx !== -1) {
					waiters.splice(idx, 1);
				}
			};

			const timer = setTimeout(() => {
				cleanup();
				const err = new Error(
					`All ${entries.length} RovoDev ports are busy — timed out after ${Math.ceil(timeoutMs / 1000)}s`
				);
				err.code = "ROVODEV_POOL_EXHAUSTED";
				reject(err);
			}, timeoutMs);

			if (signal) {
				const onAbort = () => {
					clearTimeout(timer);
					cleanup();
					reject(new Error("Pool acquire aborted"));
				};

				if (signal.aborted) {
					clearTimeout(timer);
					cleanup();
					reject(new Error("Pool acquire aborted"));
					return;
				}

				signal.addEventListener("abort", onAbort, { once: true });

				// Clean up abort listener when resolved
				const origResolve = waiter.resolve;
				waiter.resolve = (handle) => {
					clearTimeout(timer);
					signal.removeEventListener("abort", onAbort);
					origResolve(handle);
				};
				const origReject = waiter.reject;
				waiter.reject = (err) => {
					signal.removeEventListener("abort", onAbort);
					origReject(err);
				};
			} else {
				// Clean up timer when resolved
				const origResolve = waiter.resolve;
				waiter.resolve = (handle) => {
					clearTimeout(timer);
					origResolve(handle);
				};
			}
		});
	}

	// ── Health check ────────────────────────────────────────────────────

	async function runHealthChecks() {
		for (const entry of entries) {
			if (entry.status === "busy") {
				continue;
			}

			try {
				await healthCheck(entry.port);
				if (entry.status === "unhealthy") {
					console.log(`[ROVODEV-POOL] Port ${entry.port} recovered`);
				}
				entry.status = "available";
			} catch {
				if (entry.status !== "unhealthy") {
					console.warn(`[ROVODEV-POOL] Port ${entry.port} is unhealthy`);
				}
				entry.status = "unhealthy";
			}

			entry.lastHealthCheck = Date.now();
		}
	}

	if (healthCheckIntervalMs > 0) {
		healthCheckTimer = setInterval(runHealthChecks, healthCheckIntervalMs);
		// Don't prevent process exit
		if (healthCheckTimer.unref) {
			healthCheckTimer.unref();
		}
	}

	// ── Status ──────────────────────────────────────────────────────────

	function getStatus() {
		let available = 0;
		let busy = 0;
		let unhealthy = 0;
		for (const entry of entries) {
			if (entry.status === "available") available++;
			else if (entry.status === "busy") busy++;
			else unhealthy++;
		}
		return {
			total: entries.length,
			available,
			busy,
			unhealthy,
			ports: entries.map((e) => ({ ...e })),
		};
	}

	// ── Shutdown ────────────────────────────────────────────────────────

	function shutdown() {
		shuttingDown = true;
		if (healthCheckTimer) {
			clearInterval(healthCheckTimer);
			healthCheckTimer = null;
		}
		// Reject any pending waiters
		while (waiters.length > 0) {
			const waiter = waiters.shift();
			waiter.reject(new Error("Pool is shutting down"));
		}
		// Release all busy entries
		for (const entry of entries) {
			entry.status = "available";
			entry.acquiredAt = null;
		}
	}

	return { acquire, getStatus, shutdown };
}

module.exports = { createRovoDevPool };
