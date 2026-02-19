/**
 * Interactive one-time setup for RovoDev.
 *
 * Launches `acli rovodev` (the interactive CLI) so you can approve MCP servers,
 * accept terms, and verify everything works. Approvals persist to
 * ~/.rovodev/config.yml and are reused by the headless pool started via
 * `pnpm run rovodev`.
 *
 * Usage:
 *   pnpm run rovodev:setup
 */

const { spawn } = require("node:child_process");
const { resolveRovodevBin } = require("./lib/rovodev-utils");

const run = () => {
	const { bin, servePrefix } = resolveRovodevBin();

	const spawnArgs = [...servePrefix];

	console.log("=".repeat(60));
	console.log("RovoDev Setup — interactive session");
	console.log(`\nStarting: ${bin} ${spawnArgs.join(" ") || "(interactive mode)"}`);
	console.log("=".repeat(60));
	console.log("\nApprove MCP servers and accept any prompts.");
	console.log("When done, exit with /quit or Ctrl+C,");
	console.log("then start the dev server with: pnpm run rovodev\n");

	const child = spawn(bin, spawnArgs, {
		stdio: "inherit",
	});

	child.on("error", (err) => {
		if (err.code === "ENOENT") {
			console.error(
				`\nError: "${bin}" not found.\n` +
				`Install the Rovo Dev CLI ("rovodev" or "acli") first.\n`
			);
		} else {
			console.error("Failed to start rovodev:", err.message);
		}
		process.exit(1);
	});

	child.on("exit", (code, signal) => {
		console.log("\n" + "=".repeat(60));
		console.log("Setup complete. Run: pnpm run rovodev");
		console.log("=".repeat(60));
		if (signal) {
			process.kill(process.pid, signal);
			return;
		}
		process.exit(code ?? 0);
	});

	const forwardSignal = (sig) => {
		try { child.kill(sig); } catch { /* ignore */ }
	};
	process.on("SIGINT", forwardSignal);
	process.on("SIGTERM", forwardSignal);
};

run();
