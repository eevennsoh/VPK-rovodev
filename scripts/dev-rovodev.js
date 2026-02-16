const net = require("node:net");
const fs = require("node:fs");
const path = require("node:path");
const { spawn } = require("node:child_process");
const { getRovodevBasePort } = require("./lib/worktree-ports");

const basePort = getRovodevBasePort();
const maxTries = Number.parseInt(process.env.PORT_SEARCH_MAX ?? "20", 10);
const portFile = path.join(process.cwd(), ".dev-rovodev-port");

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

const findAvailablePort = async () => {
	for (let attempt = 0; attempt < maxTries; attempt += 1) {
		const port = basePort + attempt;
		if (await isPortAvailable(port)) {
			return port;
		}
	}

	throw new Error(
		`No available port found from ${basePort} to ${basePort + maxTries - 1}.`
	);
};

const writePortFile = (port) => {
	fs.writeFileSync(portFile, String(port));
};

const cleanup = () => {
	try {
		fs.unlinkSync(portFile);
	} catch {
		// ignore missing file
	}
};

const readRecordedPort = () => {
	if (!fs.existsSync(portFile)) {
		return null;
	}

	try {
		const port = Number.parseInt(fs.readFileSync(portFile, "utf8").trim(), 10);
		if (!Number.isNaN(port) && port > 0) {
			return port;
		}
	} catch {
		// Ignore read errors
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
	const recordedPort = readRecordedPort();
	if (recordedPort !== null) {
		const inUse = !(await isPortAvailable(recordedPort));
		if (inUse) {
			writePortFile(recordedPort);
			console.log(
				`RovoDev serve is already running for this worktree on port ${recordedPort}. Reusing existing process.`
			);
			return;
		}
		cleanup();
	}

	const port = await findAvailablePort();

	if (port !== basePort) {
		console.log(`Port ${basePort} in use. Using ${port} instead.`);
	}

	writePortFile(port);

	const { bin: rovodevBin, servePrefix } = resolveRovodevBin();

	// Disable session token auth so the backend can call rovodev serve
	// without needing to coordinate Bearer tokens. This is safe because
	// rovodev serve only listens on 127.0.0.1.
	// When rovodev adds ROVODEV_SERVE_SESSION_TOKEN env var support,
	// we can switch to generating and sharing a token instead.

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

	child.on("error", (err) => {
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
		process.exit(1);
	});

	const forwardSignal = (signal) => {
		child.kill(signal);
	};

	process.on("SIGINT", forwardSignal);
	process.on("SIGTERM", forwardSignal);

	child.on("exit", (code, signal) => {
		cleanup();

		if (signal) {
			process.kill(process.pid, signal);
			return;
		}

		process.exit(code ?? 0);
	});
};

run().catch((error) => {
	cleanup();
	console.error(error);
	process.exit(1);
});
