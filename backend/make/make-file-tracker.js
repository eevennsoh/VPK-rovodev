const fs = require("node:fs/promises");
const path = require("node:path");
const { execFile } = require("node:child_process");

const CREATED_FILES_FILENAME = "created-files.json";

/**
 * Directories and files that must never be deleted, even if they appear in
 * the untracked-files delta. Paths are relative to the project root and are
 * matched as prefixes (directories) or exact names (files).
 */
const PROTECTED_PREFIXES = [
	"backend/",
	"node_modules/",
	".git/",
	".cursor/",
	".claude/",
	".codex/",
	"scripts/",
	"types/",
	"rovo/",
];

const PROTECTED_FILES = new Set([
	"package.json",
	"pnpm-lock.yaml",
	"tsconfig.json",
	"next.config.ts",
	"tailwind.config.ts",
	"postcss.config.mjs",
	".gitignore",
	".env",
	".env.local",
	"CLAUDE.md",
	"AGENTS-LESSONS.md",
]);

function resolveProjectRoot() {
	// Project root is two levels up from backend/make/
	return path.resolve(__dirname, "..", "..");
}

/**
 * Returns true if the relative file path is considered safe to delete.
 */
function isSafeToDelete(relativePath) {
	if (!relativePath || typeof relativePath !== "string") {
		return false;
	}

	// Reject absolute paths or path traversal
	if (path.isAbsolute(relativePath) || relativePath.includes("..")) {
		return false;
	}

	// Reject protected prefixes
	for (const prefix of PROTECTED_PREFIXES) {
		if (relativePath.startsWith(prefix)) {
			return false;
		}
	}

	// Reject protected files
	if (PROTECTED_FILES.has(relativePath)) {
		return false;
	}

	return true;
}

/**
 * Snapshots the current set of untracked files (excluding gitignored) in the
 * project root via `git ls-files --others --exclude-standard`.
 */
function snapshotUntrackedFiles() {
	const projectRoot = resolveProjectRoot();
	return new Promise((resolve, reject) => {
		execFile(
			"git",
			["ls-files", "--others", "--exclude-standard"],
			{ cwd: projectRoot, maxBuffer: 10 * 1024 * 1024 },
			(error, stdout) => {
				if (error) {
					reject(error);
					return;
				}

				const files = new Set(
					stdout
						.split("\n")
						.map((line) => line.trim())
						.filter(Boolean)
				);
				resolve(files);
			}
		);
	});
}

/**
 * Returns the set of files present in `after` but not in `before`.
 */
function computeCreatedFiles(before, after) {
	const created = [];
	for (const file of after) {
		if (!before.has(file)) {
			created.push(file);
		}
	}
	return created;
}

/**
 * Reads the persisted created-files list from the run's data directory.
 */
async function readCreatedFilesFromDisk(runDir) {
	try {
		const raw = await fs.readFile(
			path.join(runDir, CREATED_FILES_FILENAME),
			"utf8"
		);
		const parsed = JSON.parse(raw);
		return Array.isArray(parsed) ? parsed : [];
	} catch {
		return [];
	}
}

/**
 * Persists the created-files list to the run's data directory.
 */
async function writeCreatedFilesToDisk(runDir, files) {
	await fs.mkdir(runDir, { recursive: true });
	await fs.writeFile(
		path.join(runDir, CREATED_FILES_FILENAME),
		JSON.stringify(files, null, 2) + "\n",
		"utf8"
	);
}

/**
 * Deletes the given files (relative paths) from the project root.
 * Skips protected paths and non-existent files. After deleting files,
 * cleans up empty parent directories up to the project root.
 */
async function deleteCreatedFiles(filePaths, logger = console) {
	const projectRoot = resolveProjectRoot();
	const deletedDirs = new Set();

	for (const relativePath of filePaths) {
		if (!isSafeToDelete(relativePath)) {
			logger.warn(
				`[make-file-tracker] Skipping protected path: ${relativePath}`
			);
			continue;
		}

		const absolutePath = path.resolve(projectRoot, relativePath);

		// Extra safety: ensure resolved path is within project root
		if (!absolutePath.startsWith(projectRoot + path.sep)) {
			logger.warn(
				`[make-file-tracker] Path escapes project root: ${relativePath}`
			);
			continue;
		}

		try {
			await fs.unlink(absolutePath);
			deletedDirs.add(path.dirname(absolutePath));
		} catch (error) {
			if (error && error.code !== "ENOENT") {
				logger.warn(
					`[make-file-tracker] Failed to delete ${relativePath}: ${error.message}`
				);
			}
		}
	}

	// Clean up empty parent directories, bottom-up
	await cleanEmptyDirectories(deletedDirs, projectRoot);
}

/**
 * Removes empty directories, walking up from each starting directory
 * toward the project root. Stops when a directory is non-empty or when
 * reaching the project root.
 */
async function cleanEmptyDirectories(dirPaths, projectRoot) {
	const visited = new Set();

	for (const startDir of dirPaths) {
		let dir = startDir;

		while (
			dir !== projectRoot &&
			dir.startsWith(projectRoot + path.sep) &&
			!visited.has(dir)
		) {
			visited.add(dir);

			try {
				const entries = await fs.readdir(dir);
				if (entries.length > 0) {
					break;
				}
				await fs.rmdir(dir);
			} catch {
				break;
			}

			dir = path.dirname(dir);
		}
	}
}

/**
 * Creates a simple async mutex for serializing before/after snapshots
 * across concurrent tasks within the same run.
 */
function createSnapshotLock() {
	let chain = Promise.resolve();

	return {
		acquire() {
			let release;
			const next = new Promise((resolve) => {
				release = resolve;
			});
			const wait = chain;
			chain = chain.then(() => next);
			return wait.then(() => release);
		},
	};
}

module.exports = {
	snapshotUntrackedFiles,
	computeCreatedFiles,
	readCreatedFilesFromDisk,
	writeCreatedFilesToDisk,
	deleteCreatedFiles,
	createSnapshotLock,
	isSafeToDelete,
	CREATED_FILES_FILENAME,
};
