#!/usr/bin/env node
/**
 * Show port assignments for all git worktrees
 *
 * Usage: node scripts/show-worktree-ports.js
 */

const { execSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");
const { hashString } = require("./lib/worktree-ports");

function getWorktreeList() {
	try {
		const output = execSync("git worktree list --porcelain", {
			encoding: "utf8",
			stdio: ["pipe", "pipe", "pipe"],
		});

		const worktrees = [];
		let current = {};

		for (const line of output.split("\n")) {
			if (line.startsWith("worktree ")) {
				if (current.path) worktrees.push(current);
				current = { path: line.slice(9) };
			} else if (line.startsWith("branch ")) {
				current.branch = line.slice(7).replace("refs/heads/", "");
			} else if (line === "bare") {
				current.bare = true;
			}
		}
		if (current.path) worktrees.push(current);

		return worktrees;
	} catch {
		return [];
	}
}

function readPortFile(worktreePath, filename) {
	try {
		const portFile = path.join(worktreePath, filename);
		if (fs.existsSync(portFile)) {
			return fs.readFileSync(portFile, "utf8").trim();
		}
	} catch {
		// Ignore read errors
	}
	return null;
}

function main() {
	console.log("\n📍 VPK Worktree Port Assignments\n");
	console.log("━".repeat(70));

	const worktrees = getWorktreeList();

	if (worktrees.length === 0) {
		console.log("No git worktrees found.");
		return;
	}

	// Calculate port info for each worktree by simulating being in that directory
	for (const wt of worktrees) {
		if (wt.bare) continue;

		const name = path.basename(wt.path);
		const isMain = !wt.path.includes("/worktrees/");

		// Calculate the expected ports based on worktree name
		let frontendBase, backendBase;
		if (isMain) {
			frontendBase = 3000;
			backendBase = 8080;
		} else {
			// Extract worktree name from path
			const worktreeName = wt.branch || name;
			const slot = Math.abs(hashString(worktreeName)) % 50;
			const offset = slot * 2;
			frontendBase = 3000 + offset;
			backendBase = 8080 + offset;
		}

		// Check actual running ports
		const runningFrontend = readPortFile(wt.path, ".dev-frontend-port");
		const runningBackend = readPortFile(wt.path, ".dev-backend-port");

		const status = runningFrontend || runningBackend ? "🟢 RUNNING" : "⚪ stopped";

		console.log(`\n${isMain ? "📁" : "🌿"} ${name} ${isMain ? "(main)" : `(${wt.branch})`}`);
		console.log(`   Path: ${wt.path}`);
		console.log(`   Status: ${status}`);
		console.log(`   Reserved ports: frontend=${frontendBase}, backend=${backendBase}`);

		if (runningFrontend || runningBackend) {
			console.log(
				`   Active ports:   frontend=${runningFrontend || "—"}, backend=${runningBackend || "—"}`
			);
		}
	}

	console.log("\n" + "━".repeat(70));
	console.log("\n💡 Each worktree gets a deterministic port range based on its name.");
	console.log("   If the reserved port is busy, it will auto-increment by 1.\n");
}

main();
