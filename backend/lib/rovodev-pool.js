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
 * @typedef {"available" | "busy" | "cooldown" | "unhealthy"} PortStatus
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
 * @param {number} [options.cooldownMs] - Delay before marking a released port as available (default 0)
 * @returns {{
 *   acquire: (opts?: { timeoutMs?: number; signal?: AbortSignal }) => Promise<PortHandle>;
 *   acquireExcluding: (excludedIndices: number[], opts?: { timeoutMs?: number; signal?: AbortSignal }) => Promise<PortHandle>;
 *   acquireByIndex: (index: number, opts?: { timeoutMs?: number; signal?: AbortSignal }) => Promise<PortHandle>;
 *   acquireByPort: (port: number, opts?: { timeoutMs?: number; signal?: AbortSignal }) => Promise<PortHandle>;
 *   updatePorts: (newPorts: number[]) => void;
 *   getStatus: () => PoolStatus;
 *   shutdown: () => void;
 * }}
 */
function createRovoDevPool(ports, options = {}) {
	const {
		healthCheckIntervalMs = DEFAULT_HEALTH_CHECK_INTERVAL_MS,
		cooldownMs = 0,
	} = options;

	/** @type {PortEntry[]} */
	const entries = ports.map((port) => ({
		port,
		status: "available",
		lastHealthCheck: Date.now(),
		acquiredAt: null,
	}));

	/** @type {Array<{ resolve: (handle: PortHandle) => void; reject: (err: Error) => void }>} */
	const waiters = [];

	/** @type {Array<{ resolve: (handle: PortHandle) => void; reject: (err: Error) => void; targetIndex: number }>} */
	const indexedWaiters = [];

	/** @type {Array<{ resolve: (handle: PortHandle) => void; reject: (err: Error) => void; excludedIndices: Set<number> }>} */
	const excludingWaiters = [];

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

				const makeAvailable = () => {
					entry.status = "available";
					entry.acquiredAt = null;
					// Check indexed waiters first (sticky assignment takes priority)
					tryNotifyIndexedWaiter(entry);
					tryNotifyExcludingWaiter(entry);
					tryNotifyWaiter();
				};

				if (cooldownMs > 0) {
					// Keep port in "busy" state briefly so rovodev serve can
					// finish clearing its internal turn state before we hand
					// the port to the next caller.
					entry.status = "cooldown";
					setTimeout(makeAvailable, cooldownMs);
				} else {
					makeAvailable();
				}
			},
			releaseAsUnhealthy: () => {
				if (released) {
					return;
				}
				released = true;
				entry.status = "unhealthy";
				entry.acquiredAt = null;
				// Don't notify waiters — port is not available.
				// The periodic health check will recover it.
			},
		};
	}

	function tryNotifyIndexedWaiter(releasedEntry) {
		const entryIndex = entries.indexOf(releasedEntry);
		if (entryIndex === -1) {
			return;
		}

		const waiterIdx = indexedWaiters.findIndex(
			(w) => w.targetIndex === entryIndex
		);
		if (waiterIdx === -1) {
			return;
		}

		// Re-acquire the entry for the indexed waiter
		releasedEntry.status = "busy";
		releasedEntry.acquiredAt = Date.now();

		const waiter = indexedWaiters.splice(waiterIdx, 1)[0];
		waiter.resolve(createHandle(releasedEntry));
	}

	function tryNotifyExcludingWaiter(releasedEntry) {
		if (excludingWaiters.length === 0) {
			return;
		}

		const entryIndex = entries.indexOf(releasedEntry);
		if (entryIndex === -1) {
			return;
		}

		// Guard: entry may have been claimed by a prior notifier (e.g. indexedWaiter)
		if (releasedEntry.status !== "available") {
			return;
		}

		const waiterIdx = excludingWaiters.findIndex(
			(w) => !w.excludedIndices.has(entryIndex)
		);
		if (waiterIdx === -1) {
			return;
		}

		releasedEntry.status = "busy";
		releasedEntry.acquiredAt = Date.now();

		const waiter = excludingWaiters.splice(waiterIdx, 1)[0];
		waiter.resolve(createHandle(releasedEntry));
	}

	// ── Acquire by index ────────────────────────────────────────────────

	/**
	 * Acquire a specific port by its index in the pool.
	 * Used for sticky session assignment (e.g., multiports demo where each
	 * chat panel is pinned to a dedicated rovodev port).
	 *
	 * @param {number} index - Zero-based index into the pool
	 * @param {object} [opts]
	 * @param {number} [opts.timeoutMs] - Maximum wait time (default 30s)
	 * @param {AbortSignal} [opts.signal] - Abort signal for early cancellation
	 * @returns {Promise<PortHandle>}
	 */
	function acquireByIndex(index, { timeoutMs = 30_000, signal } = {}) {
		if (shuttingDown) {
			return Promise.reject(new Error("Pool is shutting down"));
		}

		if (index < 0 || index >= entries.length) {
			return Promise.reject(
				new Error(
					`Port index ${index} is out of range (pool has ${entries.length} ports)`
				)
			);
		}

		const entry = entries[index];

		// Fast path — the target port is available
		if (entry.status === "available") {
			entry.status = "busy";
			entry.acquiredAt = Date.now();
			return Promise.resolve(createHandle(entry));
		}

		// Slow path — wait for the specific port to be released
		return new Promise((resolve, reject) => {
			const cleanup = () => {
				const idx = indexedWaiters.indexOf(waiter);
				if (idx !== -1) {
					indexedWaiters.splice(idx, 1);
				}
			};

			const waiter = { resolve, reject, targetIndex: index };
			indexedWaiters.push(waiter);

			const timer = setTimeout(() => {
				cleanup();
				const err = new Error(
					`RovoDev port ${entry.port} (index ${index}) is busy — timed out after ${Math.ceil(timeoutMs / 1000)}s`
				);
				err.code = "ROVODEV_PORT_BUSY";
				reject(err);
			}, timeoutMs);

			if (signal) {
				const onAbort = () => {
					clearTimeout(timer);
					cleanup();
					reject(new Error("Port acquire aborted"));
				};

				if (signal.aborted) {
					clearTimeout(timer);
					cleanup();
					reject(new Error("Port acquire aborted"));
					return;
				}

				signal.addEventListener("abort", onAbort, { once: true });

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
				const origResolve = waiter.resolve;
				waiter.resolve = (handle) => {
					clearTimeout(timer);
					origResolve(handle);
				};
			}
		});
	}

	// ── Acquire by port ─────────────────────────────────────────────────

	/**
	 * Acquire a specific port by numeric port value.
	 *
	 * @param {number} port - Port number to acquire (e.g. 8001)
	 * @param {object} [opts]
	 * @param {number} [opts.timeoutMs] - Maximum wait time (default 30s)
	 * @param {AbortSignal} [opts.signal] - Abort signal for early cancellation
	 * @returns {Promise<PortHandle>}
	 */
	function acquireByPort(port, opts = {}) {
		if (!Number.isInteger(port) || port <= 0) {
			return Promise.reject(new Error(`Invalid port ${port}`));
		}

		const index = entries.findIndex((entry) => entry.port === port);
		if (index === -1) {
			const knownPorts = entries.map((entry) => entry.port).join(", ");
			return Promise.reject(
				new Error(
					`RovoDev port ${port} is not part of the active pool (${knownPorts})`
				)
			);
		}

		return acquireByIndex(index, opts);
	}

	// ── Acquire excluding ──────────────────────────────────────────────

	/**
	 * Acquire an available port, skipping specific indices.
	 * Used by background tasks (suggestions, question cards) to avoid ports
	 * pinned to interactive chat panels.
	 *
	 * Falls back to unrestricted `acquire()` if all non-excluded ports are
	 * busy/unhealthy.
	 *
	 * @param {number[]} excludedIndices - Zero-based indices to skip
	 * @param {object} [opts]
	 * @param {number} [opts.timeoutMs] - Maximum wait time (default 30s)
	 * @param {AbortSignal} [opts.signal] - Abort signal for early cancellation
	 * @returns {Promise<PortHandle>}
	 */
	function acquireExcluding(excludedIndices, { timeoutMs = 30_000, signal } = {}) {
		if (shuttingDown) {
			return Promise.reject(new Error("Pool is shutting down"));
		}

		const excluded = new Set(excludedIndices);

		// Fast path — grab an available non-excluded port immediately
		for (let i = 0; i < entries.length; i++) {
			if (excluded.has(i)) {
				continue;
			}
			const entry = entries[i];
			if (entry.status === "available") {
				entry.status = "busy";
				entry.acquiredAt = Date.now();
				return Promise.resolve(createHandle(entry));
			}
		}

		// Fall back to unrestricted acquire if no non-excluded port can
		// become available — either because none exist or because they are
		// all unhealthy. Waiting for an unhealthy port is futile (the
		// process may be dead); using a pinned port that has already
		// completed its chat stream is better than blocking indefinitely.
		const hasUsableNonExcluded = entries.some(
			(e, i) => !excluded.has(i) && e.status !== "unhealthy"
		);
		if (!hasUsableNonExcluded) {
			return acquire({ timeoutMs, signal });
		}

		// Slow path — wait for a non-excluded port to become available
		return new Promise((resolve, reject) => {
			const waiter = { resolve, reject, excludedIndices: excluded };
			excludingWaiters.push(waiter);

			const cleanup = () => {
				const idx = excludingWaiters.indexOf(waiter);
				if (idx !== -1) {
					excludingWaiters.splice(idx, 1);
				}
			};

			const timer = setTimeout(() => {
				cleanup();
				const err = new Error(
					`All non-excluded RovoDev ports are busy — timed out after ${Math.ceil(timeoutMs / 1000)}s`
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
				const origResolve = waiter.resolve;
				waiter.resolve = (handle) => {
					clearTimeout(timer);
					origResolve(handle);
				};
			}
		});
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
			if (entry.status === "busy" || entry.status === "cooldown") {
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

	// ── In-place port update ───────────────────────────────────────────

	/**
	 * Update the pool's port set without destroying active handles.
	 * Ports that are currently busy are left untouched. New ports are added
	 * as available. Ports that are no longer in the new set AND are not busy
	 * are removed.
	 *
	 * @param {number[]} newPorts
	 */
	function updatePorts(newPorts) {
		const newSet = new Set(newPorts);

		// Remove entries that are no longer needed and not busy
		for (let i = entries.length - 1; i >= 0; i--) {
			const entry = entries[i];
			if (!newSet.has(entry.port) && entry.status !== "busy" && entry.status !== "cooldown") {
				entries.splice(i, 1);
			}
		}

		// Reject indexed waiters whose target index is now out of range
		// (indices shifted due to entry removal above)
		for (let i = indexedWaiters.length - 1; i >= 0; i--) {
			if (indexedWaiters[i].targetIndex >= entries.length) {
				const waiter = indexedWaiters.splice(i, 1)[0];
				waiter.reject(new Error("Port index invalidated by pool update"));
			}
		}

		// Add new ports that don't already exist
		const existingPorts = new Set(entries.map((e) => e.port));
		for (const port of newPorts) {
			if (!existingPorts.has(port)) {
				entries.push({
					port,
					status: "available",
					lastHealthCheck: Date.now(),
					acquiredAt: null,
				});
			}
		}

		// Wake up any waiters that might now be satisfiable
		for (const entry of entries) {
			if (entry.status === "available") {
				tryNotifyIndexedWaiter(entry);
				tryNotifyExcludingWaiter(entry);
				tryNotifyWaiter();
			}
		}
	}

	// ── Status ──────────────────────────────────────────────────────────

	function getStatus() {
		let available = 0;
		let busy = 0;
		let unhealthy = 0;
		for (const entry of entries) {
			if (entry.status === "available") available++;
			else if (entry.status === "busy" || entry.status === "cooldown") busy++;
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
		while (indexedWaiters.length > 0) {
			const waiter = indexedWaiters.shift();
			waiter.reject(new Error("Pool is shutting down"));
		}
		while (excludingWaiters.length > 0) {
			const waiter = excludingWaiters.shift();
			waiter.reject(new Error("Pool is shutting down"));
		}
		// Release all busy entries
		for (const entry of entries) {
			entry.status = "available";
			entry.acquiredAt = null;
		}
	}

	return { acquire, acquireExcluding, acquireByIndex, acquireByPort, updatePorts, getStatus, shutdown };
}

module.exports = { createRovoDevPool };
