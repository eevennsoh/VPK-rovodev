/**
 * Worktree-aware port reservation system
 *
 * Each git worktree gets a deterministic port range based on its name.
 * This prevents port conflicts when running multiple worktrees simultaneously.
 *
 * Port allocation strategy:
 * - Main worktree (or non-worktree): base ports (3000, 8080)
 * - Named worktrees: hash the name to get an offset (0-49), multiply by 2
 *   Frontend: 3000 + (offset * 2) → 3000, 3002, 3004, ..., 3098
 *   Backend:  8080 + (offset * 2) → 8080, 8082, 8084, ..., 8178
 *
 * The *2 multiplier leaves room for port-finding to increment by 1 if needed.
 */

const { execSync } = require("node:child_process");
const path = require("node:path");

/**
 * Simple string hash function (djb2)
 * Returns a positive integer
 */
function hashString(str) {
	let hash = 5381;
	for (let i = 0; i < str.length; i++) {
		hash = (hash * 33) ^ str.charCodeAt(i);
	}
	return Math.abs(hash);
}

/**
 * Get the current worktree name
 * Returns null if not in a worktree or if it's the main worktree
 */
function getWorktreeName() {
	try {
		// Get the git directory - for worktrees this points to .git/worktrees/<name>
		const gitDir = execSync("git rev-parse --git-dir", {
			encoding: "utf8",
			stdio: ["pipe", "pipe", "pipe"],
		}).trim();

		// Check if we're in a worktree (path contains /worktrees/)
		if (gitDir.includes("/worktrees/")) {
			// Extract worktree name from path like: /path/to/.git/worktrees/feature-branch
			const parts = gitDir.split("/worktrees/");
			if (parts.length > 1) {
				return parts[1].split("/")[0];
			}
		}

		// Check if we're the main worktree by comparing paths
		const toplevel = execSync("git rev-parse --show-toplevel", {
			encoding: "utf8",
			stdio: ["pipe", "pipe", "pipe"],
		}).trim();

		const commonDir = execSync("git rev-parse --git-common-dir", {
			encoding: "utf8",
			stdio: ["pipe", "pipe", "pipe"],
		}).trim();

		// If the common dir's parent matches toplevel, we're in main worktree
		const commonParent = path.dirname(path.resolve(commonDir));
		if (path.resolve(toplevel) === commonParent) {
			return null; // Main worktree, use default ports
		}

		// Fallback: use the directory name as worktree identifier
		return path.basename(toplevel);
	} catch {
		// Not in a git repo or git not available
		return null;
	}
}

/**
 * Calculate the base port offset for the current worktree
 * Returns 0 for main worktree, or a deterministic offset (0-98, even numbers) for others
 */
function getWorktreePortOffset() {
	const worktreeName = getWorktreeName();

	if (!worktreeName) {
		return 0; // Main worktree uses default ports
	}

	// Hash the worktree name to get a slot (0-49)
	const slot = hashString(worktreeName) % 50;

	// Multiply by 2 to leave room for port-finding fallback
	return slot * 2;
}

/**
 * Get the base frontend port for the current worktree
 */
function getFrontendBasePort() {
	const envPort = process.env.PORT;
	if (envPort) {
		return Number.parseInt(envPort, 10);
	}

	const defaultBase = 3000;
	const offset = getWorktreePortOffset();
	const basePort = defaultBase + offset;

	const worktreeName = getWorktreeName();
	if (worktreeName && offset > 0) {
		console.log(`[worktree: ${worktreeName}] Frontend base port: ${basePort}`);
	}

	return basePort;
}

/**
 * Get the base backend port for the current worktree
 */
function getBackendBasePort() {
	const envPort = process.env.BACKEND_PORT;
	if (envPort) {
		return Number.parseInt(envPort, 10);
	}

	const defaultBase = 8080;
	const offset = getWorktreePortOffset();
	const basePort = defaultBase + offset;

	const worktreeName = getWorktreeName();
	if (worktreeName && offset > 0) {
		console.log(`[worktree: ${worktreeName}] Backend base port: ${basePort}`);
	}

	return basePort;
}

/**
 * Get port info for the current worktree (useful for diagnostics)
 */
function getPortInfo() {
	const worktreeName = getWorktreeName();
	const offset = getWorktreePortOffset();

	return {
		worktreeName: worktreeName || "main",
		offset,
		frontendBase: 3000 + offset,
		backendBase: 8080 + offset,
	};
}

module.exports = {
	hashString,
	getWorktreeName,
	getWorktreePortOffset,
	getFrontendBasePort,
	getBackendBasePort,
	getPortInfo,
};
