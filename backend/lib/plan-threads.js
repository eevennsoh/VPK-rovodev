/**
 * Thread persistence for plan chat threads.
 *
 * Storage layout:
 *   backend/data/plan-threads/{threadId}/thread.json
 *
 * Each thread.json: { id, title, messages, createdAt, updatedAt }
 * Timestamps are ISO-8601 strings on disk.
 */

const fs = require("node:fs/promises");
const path = require("node:path");

const RETENTION_LIMIT = 30;

function createId() {
	return `thread-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function toIsoDate() {
	return new Date().toISOString();
}

function safeJsonParse(rawValue) {
	try {
		return JSON.parse(rawValue);
	} catch {
		return null;
	}
}

function getTimestampFromIsoString(value) {
	if (typeof value !== "string" || !value.trim()) {
		return Number.NaN;
	}

	return Date.parse(value);
}

function buildThreadPaths(baseDir, threadId) {
	const threadDir = path.join(baseDir, threadId);
	return {
		threadDir,
		threadFilePath: path.join(threadDir, "thread.json"),
	};
}

function createThreadManager({ baseDir, logger }) {
	const threadsRootDir = path.join(baseDir, "plan-threads");

	const writeJsonFile = async (filePath, payload) => {
		await fs.mkdir(path.dirname(filePath), { recursive: true });
		await fs.writeFile(
			filePath,
			`${JSON.stringify(payload, null, 2)}\n`,
			"utf8"
		);
	};

	const readThreadFile = async (threadId) => {
		const paths = buildThreadPaths(threadsRootDir, threadId);
		try {
			const raw = await fs.readFile(paths.threadFilePath, "utf8");
			const parsed = safeJsonParse(raw);
			if (!parsed || typeof parsed !== "object" || !parsed.id) {
				return null;
			}

			return parsed;
		} catch (error) {
			if (error.code === "ENOENT") {
				return null;
			}

			throw error;
		}
	};

	const pruneOldestThreads = async (currentThreads) => {
		if (currentThreads.length <= RETENTION_LIMIT) {
			return;
		}

		const sorted = [...currentThreads].sort((a, b) => {
			const aTime = getTimestampFromIsoString(a.updatedAt);
			const bTime = getTimestampFromIsoString(b.updatedAt);
			return bTime - aTime;
		});

		const toDelete = sorted.slice(RETENTION_LIMIT);
		for (const thread of toDelete) {
			try {
				const paths = buildThreadPaths(threadsRootDir, thread.id);
				await fs.rm(paths.threadDir, { recursive: true, force: true });
			} catch (error) {
				logger.error(
					`[AGENTS-THREAD] Failed to prune thread ${thread.id}:`,
					error
				);
			}
		}
	};

	const listThreads = async ({ limit } = {}) => {
		let entries;
		try {
			entries = await fs.readdir(threadsRootDir);
		} catch (error) {
			if (error.code === "ENOENT") {
				return [];
			}

			throw error;
		}

		const threads = [];
		for (const entry of entries) {
			const thread = await readThreadFile(entry);
			if (thread) {
				threads.push(thread);
			}
		}

		threads.sort((a, b) => {
			const aTime = getTimestampFromIsoString(a.updatedAt);
			const bTime = getTimestampFromIsoString(b.updatedAt);
			return bTime - aTime;
		});

		const effectiveLimit =
			typeof limit === "number" && limit > 0 ? limit : RETENTION_LIMIT;
		return threads.slice(0, effectiveLimit);
	};

	const getThread = async (threadId) => {
		return readThreadFile(threadId);
	};

	const createThread = async ({
		id,
		title,
		messages,
		createdAt,
		updatedAt,
	}) => {
		const threadId = id || createId();
		const now = toIsoDate();
		const thread = {
			id: threadId,
			title: title || "New chat",
			messages: Array.isArray(messages) ? messages : [],
			createdAt: createdAt || now,
			updatedAt: updatedAt || now,
		};

		const paths = buildThreadPaths(threadsRootDir, threadId);
		await writeJsonFile(paths.threadFilePath, thread);

		const allThreads = await listThreads({
			limit: RETENTION_LIMIT + 10,
		});
		await pruneOldestThreads(allThreads);

		return thread;
	};

	const updateThread = async (threadId, fields) => {
		const existing = await readThreadFile(threadId);
		if (!existing) {
			return null;
		}

		const updated = { ...existing };
		if (fields.title !== undefined) {
			updated.title = fields.title;
		}

		if (fields.messages !== undefined) {
			updated.messages = fields.messages;
		}

		updated.updatedAt = fields.updatedAt || toIsoDate();

		const paths = buildThreadPaths(threadsRootDir, threadId);
		await writeJsonFile(paths.threadFilePath, updated);

		return updated;
	};

	const deleteThread = async (threadId) => {
		const paths = buildThreadPaths(threadsRootDir, threadId);
		try {
			await fs.rm(paths.threadDir, { recursive: true, force: true });
		} catch (error) {
			if (error.code !== "ENOENT") {
				throw error;
			}
		}
	};

	return {
		listThreads,
		getThread,
		createThread,
		updateThread,
		deleteThread,
	};
}

module.exports = { createThreadManager };
