const net = require("node:net");
const fs = require("node:fs");
const path = require("node:path");
const { spawn } = require("node:child_process");
const { getRovodevBasePort } = require("./lib/worktree-ports");

const basePort = getRovodevBasePort();
const maxTries = Number.parseInt(process.env.PORT_SEARCH_MAX ?? "20", 10);
const poolSize = Math.max(1, Number.parseInt(process.env.ROVODEV_POOL_SIZE ?? "6", 10));
const portFile = path.join(process.cwd(), ".dev-rovodev-port");
const portsFile = path.join(process.cwd(), ".dev-rovodev-ports");

const unsupportedErrors = new Set([
	"EADDRNOTAVAIL",
	"EAFNOSUPPORT",
	"EPROTONOSUPPORT",
	"ENOTSUP",
]);

const canListen = (options, { allowUnsupported = false } = {}) =>
	new Promise((resolve) => {
		const server = net.createServer();
		server.unref();
		server.once("error", (err) => {
			if (err.code === "EADDRINUSE" || err.code === "EACCES") {
				resolve(false);
				return;
			}
			if (allowUnsupported && unsupportedErrors.has(err.code)) {
				resolve(true);
				return;
			}
			resolve(false);
		});
		server.once("listening", () => {
			server.close(() => resolve(true));
		});
		server.listen(options);
	});

const isPortAvailable = async (port) => {
	const ipv4Available = await canListen({ port, host: "0.0.0.0" }, {
		allowUnsupported: true,
	});
	if (!ipv4Available) {
		return false;
	}

	const ipv6Available = await canListen(
		{ port, host: "::", ipv6Only: true },
		{ allowUnsupported: true }
	);

	return ipv6Available !== false;
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

/**
 * Resolve the rovodev binary and return { bin, args } where `args` are any
 * extra arguments that must be prepended before "serve".
 *
 * For standalone `rovodev` binary: { bin: "/path/to/rovodev", servePrefix: [] }
 * For `acli` wrapper:              { bin: "/path/to/acli", servePrefix: ["rovodev"] }
 */
const resolveRovodevBin = () => {
	const { execSync } = require("node:child_process");

	// 1. Check PATH for `rovodev` first
	try {
		const binPath = execSync("which rovodev", {
			encoding: "utf8",
			stdio: ["pipe", "pipe", "pipe"],
		}).trim();
		if (binPath) {
			return { bin: binPath, servePrefix: [] };
		}
	} catch {
		// not on PATH
	}

	// 2. Check PATH for `acli` (user-managed, typically more up-to-date)
	try {
		const acliBinPath = execSync("which acli", {
			encoding: "utf8",
			stdio: ["pipe", "pipe", "pipe"],
		}).trim();
		if (acliBinPath) {
			console.log(`[rovodev] Using acli wrapper: ${acliBinPath}`);
			return { bin: acliBinPath, servePrefix: ["rovodev"] };
		}
	} catch {
		// not on PATH
	}

	// 3. Check ~/.rovodev/bin as a common install location
	const homeDir = require("node:os").homedir();
	const homeBinPath = path.join(homeDir, ".rovodev", "bin", "rovodev");
	if (fs.existsSync(homeBinPath)) {
		return { bin: homeBinPath, servePrefix: [] };
	}

	// 4. Search Atlascode extension paths (Cursor / VS Code)
	//    The binary is installed per-workspace under:
	//    ~/Library/Application Support/{Cursor,Code}/User/workspaceStorage/*/
	//      atlassian.atlascode/atlascode-rovodev-bin/*/atlassian_cli_rovodev
	const editorDirs = [
		path.join(homeDir, "Library", "Application Support", "Cursor", "User", "workspaceStorage"),
		path.join(homeDir, "Library", "Application Support", "Code", "User", "workspaceStorage"),
		path.join(homeDir, ".config", "Cursor", "User", "workspaceStorage"),
		path.join(homeDir, ".config", "Code", "User", "workspaceStorage"),
	];

	let latestBin = null;
	let latestVersion = [0, 0, 0];

	const parseVersion = (v) => {
		const parts = v.split(".").map(Number);
		return [parts[0] || 0, parts[1] || 0, parts[2] || 0];
	};

	const isNewerVersion = (a, b) => {
		for (let i = 0; i < 3; i++) {
			if (a[i] !== b[i]) return a[i] > b[i];
		}
		return false;
	};

	for (const editorDir of editorDirs) {
		if (!fs.existsSync(editorDir)) {
			continue;
		}

		let workspaceDirs;
		try {
			workspaceDirs = fs.readdirSync(editorDir);
		} catch {
			continue;
		}

		for (const wsDir of workspaceDirs) {
			const rovodevBinDir = path.join(
				editorDir,
				wsDir,
				"atlassian.atlascode",
				"atlascode-rovodev-bin"
			);

			if (!fs.existsSync(rovodevBinDir)) {
				continue;
			}

			let versions;
			try {
				versions = fs.readdirSync(rovodevBinDir);
			} catch {
				continue;
			}

			for (const version of versions) {
				const binPath = path.join(rovodevBinDir, version, "atlassian_cli_rovodev");
				if (fs.existsSync(binPath)) {
					const parsed = parseVersion(version);
					if (!latestBin || isNewerVersion(parsed, latestVersion)) {
						latestBin = binPath;
						latestVersion = parsed;
					}
				}
			}
		}
	}

	if (latestBin) {
		console.log(`[rovodev] Found Atlascode binary (v${latestVersion.join(".")}): ${latestBin}`);
		return { bin: latestBin, servePrefix: [] };
	}

	return { bin: "rovodev", servePrefix: [] };
};

const run = async () => {
	// Check if existing pool processes are still running
	const recordedPorts = readRecordedPorts();
	if (recordedPorts !== null) {
		// Check if all recorded ports are in use (processes still running)
		const allInUse = (
			await Promise.all(recordedPorts.map(async (p) => !(await isPortAvailable(p))))
		).every(Boolean);

		if (allInUse) {
			writePortFiles(recordedPorts);
			console.log(
				`RovoDev serve pool already running on ports ${recordedPorts.join(", ")}. Reusing existing processes.`
			);
			return;
		}

		cleanup();
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

	// Spawn one child per port
	const children = [];
	let firstError = null;

	for (const port of ports) {
		// Disable session token auth so the backend can call rovodev serve
		// without needing to coordinate Bearer tokens. This is safe because
		// rovodev serve only listens on 127.0.0.1.

		// Start rovodev serve without --restore so we get fresh sessions
		// and avoid leaking sessions from other workspaces.
		const spawnArgs = [...servePrefix, "serve", "--disable-session-token", String(port)];
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
