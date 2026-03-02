const fs = require("node:fs");
const path = require("node:path");
const { spawn, execSync } = require("node:child_process");
const { getRovodevBasePort } = require("./lib/worktree-ports");
const { isPortAvailable, checkRovodevHealth, resolveRovodevBin } = require("./lib/rovodev-utils");
const { dedupeAllowedMcpServersInConfig } = require("./lib/rovodev-config");

const envLocalPath = path.join(process.cwd(), ".env.local");
const envExamplePath = path.join(process.cwd(), ".env.local.example");
if (!fs.existsSync(envLocalPath) && fs.existsSync(envExamplePath)) {
	fs.copyFileSync(envExamplePath, envLocalPath);
	console.log("[rovodev] Created .env.local from .env.local.example");
}

try {
	require("dotenv").config({ path: envLocalPath });
} catch {
	// ignore dotenv loading failures
}

const basePort = getRovodevBasePort();
const maxTries = Number.parseInt(process.env.PORT_SEARCH_MAX ?? "20", 10);
const poolSize = Math.max(1, Number.parseInt(process.env.ROVODEV_POOL_SIZE ?? "1", 10));
const forceCleanStart = process.env.ROVODEV_FORCE_CLEAN_START === "true";
const configuredBillingSiteUrl = (process.env.ROVODEV_BILLING_URL ?? "").trim();
if (!configuredBillingSiteUrl) {
	console.error("[rovodev] ROVODEV_BILLING_URL is not set in .env.local");
	process.exit(1);
}
const portFile = path.join(process.cwd(), ".dev-rovodev-port");
const portsFile = path.join(process.cwd(), ".dev-rovodev-ports");

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const getListeningPids = (port) => {
	try {
		const output = execSync(`lsof -ti:${port} -sTCP:LISTEN`, {
			encoding: "utf8",
			stdio: ["pipe", "pipe", "pipe"],
		})
			.trim()
			.split("\n")
			.map((line) => Number.parseInt(line.trim(), 10))
			.filter((pid) => Number.isInteger(pid) && pid > 0);
		return Array.from(new Set(output));
	} catch {
		return [];
	}
};

/**
 * Gracefully stop all listeners in the candidate RovoDev port range.
 * Sends SIGTERM first to allow clean config-file shutdown, then escalates
 * to SIGKILL after a grace period for any processes that didn't exit.
 */
const cleanupAllInstances = async (minPort, maxPort) => {
	console.log(`[rovodev] Force clean start enabled. Stopping listeners on ports ${minPort}-${maxPort}...`);
	const signalledPids = new Set();

	for (let port = minPort; port <= maxPort; port++) {
		const pids = getListeningPids(port);
		for (const pid of pids) {
			if (signalledPids.has(pid)) {
				continue;
			}
			try {
				process.kill(pid, "SIGTERM");
				signalledPids.add(pid);
			} catch {
				// ignore kill failures (process may have already exited)
			}
		}
	}

	if (signalledPids.size === 0) {
		return;
	}

	console.log(`[rovodev] Sent SIGTERM to ${signalledPids.size} process(es). Waiting for graceful shutdown...`);
	await sleep(2000);

	// Escalate to SIGKILL for any survivors
	let forceKilled = 0;
	for (const pid of signalledPids) {
		try {
			process.kill(pid, 0); // check if still alive
			process.kill(pid, "SIGKILL");
			forceKilled++;
		} catch {
			// already exited — good
		}
	}

	if (forceKilled > 0) {
		console.log(`[rovodev] Force-killed ${forceKilled} process(es) that didn't exit gracefully.`);
		await sleep(250);
	}
};

/**
 * Gracefully stop stale RovoDev instances on unhealthy ports.
 * Sends SIGTERM first, waits for graceful shutdown, then escalates to SIGKILL.
 * Returns count of instances stopped.
 */
const cleanupStaleInstances = async (minPort, maxPort) => {
	console.log(`[rovodev] Scanning for stale instances (ports ${minPort}-${maxPort})...`);
	const stalePids = new Set();

	for (let port = minPort; port <= maxPort; port++) {
		const health = await checkRovodevHealth(port);

		if (health.status === "unreachable") {
			// Port is not responding, skip
			continue;
		}

		// Port is responding but unhealthy (MCP servers failed)
		if (!health.healthy) {
			console.log(
				`[rovodev] Found unhealthy instance on port ${port} (status: ${health.status}). Stopping...`
			);
			const pids = getListeningPids(port);
			for (const pid of pids) {
				if (stalePids.has(pid)) {
					continue;
				}
				try {
					process.kill(pid, "SIGTERM");
					stalePids.add(pid);
				} catch {
					// ignore — process may have already exited
				}
			}
		}
	}

	if (stalePids.size === 0) {
		return 0;
	}

	console.log(`[rovodev] Sent SIGTERM to ${stalePids.size} stale process(es). Waiting for graceful shutdown...`);
	await sleep(2000);

	// Escalate to SIGKILL for any survivors
	let forceKilled = 0;
	for (const pid of stalePids) {
		try {
			process.kill(pid, 0); // check if still alive
			process.kill(pid, "SIGKILL");
			forceKilled++;
		} catch {
			// already exited — good
		}
	}

	if (forceKilled > 0) {
		console.log(`[rovodev] Force-killed ${forceKilled} process(es) that didn't exit gracefully.`);
		await sleep(250);
	}

	return stalePids.size;
};

const findAvailablePorts = async (count) => {
	const ports = [];
	for (let attempt = 0; attempt < maxTries && ports.length < count; attempt += 1) {
		const port = basePort + attempt;
		if (await isPortAvailable(port)) {
			ports.push(port);
		}
	}

	if (ports.length < count) {
		throw new Error(
			`Only found ${ports.length}/${count} available ports from ${basePort} to ${basePort + maxTries - 1}.`
		);
	}

	return ports;
};

const writePortFiles = (ports) => {
	// Write single port file for backward compat
	fs.writeFileSync(portFile, String(ports[0]));
	// Write JSON array of all ports
	fs.writeFileSync(portsFile, JSON.stringify(ports));
};

const cleanup = () => {
	try {
		fs.unlinkSync(portFile);
	} catch {
		// ignore missing file
	}
	try {
		fs.unlinkSync(portsFile);
	} catch {
		// ignore missing file
	}
};

const readRecordedPorts = () => {
	// Try the multi-port file first
	if (fs.existsSync(portsFile)) {
		try {
			const parsed = JSON.parse(fs.readFileSync(portsFile, "utf8").trim());
			if (Array.isArray(parsed) && parsed.length > 0 && parsed.every((p) => typeof p === "number" && p > 0)) {
				return parsed;
			}
		} catch {
			// Ignore parse errors
		}
	}

	// Fall back to single-port file
	if (fs.existsSync(portFile)) {
		try {
			const port = Number.parseInt(fs.readFileSync(portFile, "utf8").trim(), 10);
			if (!Number.isNaN(port) && port > 0) {
				return [port];
			}
		} catch {
			// Ignore read errors
		}
	}

	return null;
};

const run = async () => {
	const configState = dedupeAllowedMcpServersInConfig();
	if (configState.removed > 0) {
		console.log(
			`[rovodev] Removed ${configState.removed} duplicate MCP server approval(s) from ${configState.configPath}.`
		);
	}
	if (configState.exists) {
		console.log(`[rovodev] Using config: ${configState.configPath}`);
	}

	// Clean up instances before starting.
	const scanMax = basePort + maxTries - 1;
	if (forceCleanStart) {
		await cleanupAllInstances(basePort, scanMax);
		cleanup();
	} else {
		await cleanupStaleInstances(basePort, scanMax);
	}

	// Check if existing pool processes are still running
	const recordedPorts = readRecordedPorts();
	if (recordedPorts !== null) {
		// Check if all recorded ports are in use (processes still running)
		const allInUse = (
			await Promise.all(recordedPorts.map(async (p) => !(await isPortAvailable(p))))
		).every(Boolean);

		if (allInUse) {
			// Verify they're actually healthy, not just in use
			const healthChecks = await Promise.all(
				recordedPorts.map(async (p) => {
					const health = await checkRovodevHealth(p);
					return { port: p, healthy: health.healthy };
				})
			);

			const allHealthy = healthChecks.every((h) => h.healthy);
			if (allHealthy) {
				writePortFiles(recordedPorts);
				console.log(
					`RovoDev serve pool already running on ports ${recordedPorts.join(", ")}. Reusing existing processes.`
				);
				return;
			}

			// Some are unhealthy, clean up and restart
			console.log(`[rovodev] Some existing instances are unhealthy. Restarting...`);
			cleanup();
		} else {
			cleanup();
		}
	}

	const ports = await findAvailablePorts(poolSize);
	const firstPort = ports[0];

	if (ports.length === 1) {
		if (firstPort !== basePort) {
			console.log(`Port ${basePort} in use. Using ${firstPort} instead.`);
		}
	} else {
		console.log(`[rovodev] Pool of ${ports.length} ports: ${ports.join(", ")}`);
	}

	writePortFiles(ports);

	const { bin: rovodevBin, servePrefix } = resolveRovodevBin();
	console.log(
		`[rovodev] Billing site URL: ${configuredBillingSiteUrl}` +
			` (override with ROVODEV_BILLING_URL)`
	);

	// Spawn one child per port and keep each port supervised so a single stuck
	// instance can be restarted without tearing down the whole pool.
	const childrenByPort = new Map();
	const restartTimersByPort = new Map();
	let firstError = null;
	let shuttingDown = false;

	const buildSpawnArgsForPort = (port) => [
		// Disable session token auth so the backend can call rovodev serve
		// without needing to coordinate Bearer tokens. This is safe because
		// rovodev serve only listens on 127.0.0.1.

		// Use --respect-configured-permissions to honor the global ~/.rovodev/config.yml
		// so you don't need to re-approve MCP servers on every restart.
		...servePrefix,
		"serve",
		...(configState.exists ? ["--config-file", configState.configPath] : []),
		"--disable-session-token",
		"--respect-configured-permissions",
		"--site-url",
		configuredBillingSiteUrl,
		String(port),
	];

	const killAllChildren = (signal) => {
		for (const child of childrenByPort.values()) {
			try {
				child.kill(signal);
			} catch {
				// ignore
			}
		}
	};

	const spawnChildForPort = (port, { isRestart = false } = {}) => {
		const spawnArgs = buildSpawnArgsForPort(port);
		if (isRestart) {
			console.log(`[rovodev] Restarting process on port ${port}...`);
		}
		console.log(`[rovodev] Starting: ${rovodevBin} ${spawnArgs.join(" ")}`);
		const child = spawn(rovodevBin, spawnArgs, {
			stdio: "inherit",
			env: {
				...process.env,
				ROVODEV_PORT: String(port),
			},
		});

		child._rovodevPort = port;
		childrenByPort.set(port, child);

		child.on("error", (err) => {
			if (!firstError) {
				firstError = err;
				shuttingDown = true;
				cleanup();
				if (err.code === "ENOENT") {
					console.error(
						`\nError: "${rovodevBin}" command not found.\n` +
						`Install the Rovo Dev CLI ("rovodev" or "acli") first, then try again.\n` +
						`If it's already installed, make sure it's on your PATH.\n`
					);
				} else {
					console.error("Failed to start rovodev serve:", err.message);
				}
				// Kill remaining children and exit
				killAllChildren("SIGTERM");
				process.exit(1);
			}
		});

		child.on("exit", (code, signal) => {
			const currentChild = childrenByPort.get(port);
			if (currentChild === child) {
				childrenByPort.delete(port);
			}

			if (shuttingDown) {
				if (childrenByPort.size === 0) {
					cleanup();
					if (signal) {
						process.kill(process.pid, signal);
						return;
					}
					process.exit(code ?? 0);
				}
				return;
			}

			if (childrenByPort.size > 0) {
				console.warn(
					`[rovodev] Process on port ${child._rovodevPort} exited (code=${code}, signal=${signal}). ` +
					`${childrenByPort.size} other port(s) still running.`
				);
			} else {
				console.warn(
					`[rovodev] Process on port ${child._rovodevPort} exited (code=${code}, signal=${signal}). ` +
					`No ports currently running.`
				);
			}

			if (restartTimersByPort.has(port)) {
				clearTimeout(restartTimersByPort.get(port));
			}
			const restartTimer = setTimeout(() => {
				restartTimersByPort.delete(port);
				if (shuttingDown) {
					return;
				}
				spawnChildForPort(port, { isRestart: true });
			}, 1_500);
			restartTimersByPort.set(port, restartTimer);
		});
	};

	for (const port of ports) {
		spawnChildForPort(port);
	}

	const forwardSignal = (signal) => {
		shuttingDown = true;
		for (const timer of restartTimersByPort.values()) {
			clearTimeout(timer);
		}
		restartTimersByPort.clear();
		killAllChildren(signal);
	};

	process.on("SIGINT", forwardSignal);
	process.on("SIGTERM", forwardSignal);
};

run().catch((error) => {
	cleanup();
	console.error(error);
	process.exit(1);
});
