const fs = require("node:fs");
const path = require("node:path");
const { spawn, execSync } = require("node:child_process");
const { getRovodevBasePort } = require("./lib/worktree-ports");
const { isPortAvailable, checkRovodevHealth, resolveRovodevBin } = require("./lib/rovodev-utils");

try {
	require("dotenv").config({ path: path.join(process.cwd(), ".env.local") });
} catch {
	// ignore dotenv loading failures
}

const basePort = getRovodevBasePort();
const maxTries = Number.parseInt(process.env.PORT_SEARCH_MAX ?? "20", 10);
const poolSize = Math.max(1, Number.parseInt(process.env.ROVODEV_POOL_SIZE ?? "6", 10));
const defaultBillingSiteUrl = "https://hello.atlassian.net";
const configuredBillingSiteUrl =
	typeof process.env.ROVODEV_SITE_URL === "string" &&
	process.env.ROVODEV_SITE_URL.trim().length > 0
		? process.env.ROVODEV_SITE_URL.trim()
		: defaultBillingSiteUrl;
const portFile = path.join(process.cwd(), ".dev-rovodev-port");
const portsFile = path.join(process.cwd(), ".dev-rovodev-ports");

/**
 * Kill stale RovoDev instances on unhealthy ports.
 * Returns count of instances killed.
 */
const cleanupStaleInstances = async (minPort, maxPort) => {
	console.log(`[rovodev] Scanning for stale instances (ports ${minPort}-${maxPort})...`);
	let killed = 0;

	for (let port = minPort; port <= maxPort; port++) {
		const health = await checkRovodevHealth(port);

		if (health.status === "unreachable") {
			// Port is not responding, skip
			continue;
		}

		// Port is responding but unhealthy (MCP servers failed)
		if (!health.healthy) {
			console.log(
				`[rovodev] Found unhealthy instance on port ${port} (status: ${health.status}). Killing...`
			);
			try {
				// Try to kill by port number using lsof + kill
				execSync(`lsof -ti:${port} | xargs kill -9 2>/dev/null || true`, {
					stdio: "pipe",
				});
				killed++;
				await new Promise((resolve) => setTimeout(resolve, 500)); // Wait for kill to take effect
			} catch {
				// Ignore kill errors
			}
		}
	}

	if (killed > 0) {
		console.log(`[rovodev] Killed ${killed} stale instance(s).`);
	}

	return killed;
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
	// Clean up any stale/unhealthy instances before starting
	const scanMax = basePort + maxTries;
	await cleanupStaleInstances(basePort, scanMax);

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
			` (override with ROVODEV_SITE_URL)`
	);

	// Spawn one child per port
	const children = [];
	let firstError = null;

	for (const port of ports) {
		// Disable session token auth so the backend can call rovodev serve
		// without needing to coordinate Bearer tokens. This is safe because
		// rovodev serve only listens on 127.0.0.1.

		// Use --respect-configured-permissions to honor the global ~/.rovodev/config.yml
		// so you don't need to re-approve MCP servers on every restart.
		const spawnArgs = [
			...servePrefix,
			"serve",
			"--disable-session-token",
			"--respect-configured-permissions",
			"--site-url",
			configuredBillingSiteUrl,
			String(port),
		];
		console.log(`[rovodev] Starting: ${rovodevBin} ${spawnArgs.join(" ")}`);
		const child = spawn(rovodevBin, spawnArgs, {
			stdio: "inherit",
			env: {
				...process.env,
				ROVODEV_PORT: String(port),
			},
		});

		child._rovodevPort = port;

		child.on("error", (err) => {
			if (!firstError) {
				firstError = err;
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
				for (const c of children) {
					try { c.kill("SIGTERM"); } catch { /* ignore */ }
				}
				process.exit(1);
			}
		});

		child.on("exit", (code, signal) => {
			const remaining = children.filter((c) => c !== child && !c.killed);
			if (remaining.length === 0) {
				// Last child exited — clean up and exit
				cleanup();
				if (signal) {
					process.kill(process.pid, signal);
					return;
				}
				process.exit(code ?? 0);
			} else {
				console.warn(
					`[rovodev] Process on port ${child._rovodevPort} exited (code=${code}, signal=${signal}). ` +
					`${remaining.length} remaining.`
				);
			}
		});

		children.push(child);
	}

	const forwardSignal = (signal) => {
		for (const child of children) {
			try { child.kill(signal); } catch { /* ignore */ }
		}
	};

	process.on("SIGINT", forwardSignal);
	process.on("SIGTERM", forwardSignal);
};

run().catch((error) => {
	cleanup();
	console.error(error);
	process.exit(1);
});
