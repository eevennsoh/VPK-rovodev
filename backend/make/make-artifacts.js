const fs = require("node:fs/promises");
const path = require("node:path");

const MAX_LIST_LIMIT = 200;

function getNonEmptyString(value) {
	if (typeof value !== "string") {
		return null;
	}

	const trimmed = value.trim();
	return trimmed.length > 0 ? trimmed : null;
}

function toIsoDate() {
	return new Date().toISOString();
}

function getTimestampFromIsoString(value) {
	if (typeof value !== "string" || !value.trim()) {
		return Number.NaN;
	}

	return Date.parse(value);
}

function toStorageId(runId, runArtifactId) {
	return `run_${encodeURIComponent(runId)}__artifact_${encodeURIComponent(runArtifactId)}`;
}

function buildArtifactsRootDir(baseDir) {
	return path.join(baseDir, "artifacts");
}

function buildArtifactFilePath(artifactsRootDir, artifactId) {
	return path.join(artifactsRootDir, `${artifactId}.json`);
}

function safeJsonParse(rawValue) {
	try {
		return JSON.parse(rawValue);
	} catch {
		return null;
	}
}

function toSerializableArtifact(rawArtifact) {
	if (!rawArtifact || typeof rawArtifact !== "object") {
		return null;
	}

	const id = getNonEmptyString(rawArtifact.id);
	const runId = getNonEmptyString(rawArtifact.runId);
	const runArtifactId = getNonEmptyString(rawArtifact.runArtifactId);
	const title = getNonEmptyString(rawArtifact.title);
	const type = getNonEmptyString(rawArtifact.type);
	if (!id || !runId || !runArtifactId || !title || !type) {
		return null;
	}

	const createdAt = getNonEmptyString(rawArtifact.createdAt) || toIsoDate();
	const updatedAt = getNonEmptyString(rawArtifact.updatedAt) || createdAt;

	return {
		id,
		runId,
		runArtifactId,
		title,
		type,
		url: getNonEmptyString(rawArtifact.url) || undefined,
		path: getNonEmptyString(rawArtifact.path) || undefined,
		mimeType: getNonEmptyString(rawArtifact.mimeType) || undefined,
		sizeBytes:
			typeof rawArtifact.sizeBytes === "number" && Number.isFinite(rawArtifact.sizeBytes)
				? rawArtifact.sizeBytes
				: undefined,
		createdAt,
		updatedAt,
		iteration:
			typeof rawArtifact.iteration === "number" && Number.isFinite(rawArtifact.iteration)
				? rawArtifact.iteration
				: 1,
		taskId: getNonEmptyString(rawArtifact.taskId) || undefined,
		runStatus: getNonEmptyString(rawArtifact.runStatus) || undefined,
		planTitle: getNonEmptyString(rawArtifact.planTitle) || undefined,
	};
}

function normalizeLimit(rawLimit) {
	if (typeof rawLimit === "number" && Number.isInteger(rawLimit) && rawLimit > 0) {
		return Math.min(rawLimit, MAX_LIST_LIMIT);
	}

	if (typeof rawLimit === "string") {
		const parsed = Number.parseInt(rawLimit, 10);
		if (Number.isInteger(parsed) && parsed > 0) {
			return Math.min(parsed, MAX_LIST_LIMIT);
		}
	}

	return MAX_LIST_LIMIT;
}

function sortArtifactsByRecency(left, right) {
	const updatedDelta =
		getTimestampFromIsoString(right.updatedAt) - getTimestampFromIsoString(left.updatedAt);
	if (updatedDelta !== 0) {
		return updatedDelta;
	}

	const createdDelta =
		getTimestampFromIsoString(right.createdAt) - getTimestampFromIsoString(left.createdAt);
	if (createdDelta !== 0) {
		return createdDelta;
	}

	return right.id.localeCompare(left.id);
}

function createArtifactManager({ baseDir }) {
	const artifactsRootDir = buildArtifactsRootDir(baseDir);

	const writeArtifactFile = async (artifact) => {
		await fs.mkdir(artifactsRootDir, { recursive: true });
		await fs.writeFile(
			buildArtifactFilePath(artifactsRootDir, artifact.id),
			`${JSON.stringify(artifact, null, 2)}\n`,
			"utf8"
		);
	};

	const readArtifactFile = async (artifactId) => {
		try {
			const raw = await fs.readFile(buildArtifactFilePath(artifactsRootDir, artifactId), "utf8");
			return toSerializableArtifact(safeJsonParse(raw));
		} catch (error) {
			if (error && typeof error === "object" && error.code === "ENOENT") {
				return null;
			}

			throw error;
		}
	};

	const readAllArtifacts = async () => {
		let entries;
		try {
			entries = await fs.readdir(artifactsRootDir, { withFileTypes: true });
		} catch (error) {
			if (error && typeof error === "object" && error.code === "ENOENT") {
				return [];
			}

			throw error;
		}

		const artifactFiles = entries
			.filter((entry) => entry.isFile() && entry.name.endsWith(".json"))
			.map((entry) => entry.name.slice(0, -".json".length));

		const artifacts = [];
		for (const artifactId of artifactFiles) {
			const artifact = await readArtifactFile(artifactId);
			if (artifact) {
				artifacts.push(artifact);
			}
		}

		return artifacts;
	};

	const listArtifacts = async ({ limit, runId } = {}) => {
		const normalizedRunId = getNonEmptyString(runId);
		const effectiveLimit = normalizeLimit(limit);
		const artifacts = await readAllArtifacts();
		const filtered = normalizedRunId
			? artifacts.filter((artifact) => artifact.runId === normalizedRunId)
			: artifacts;

		return filtered.sort(sortArtifactsByRecency).slice(0, effectiveLimit);
	};

	const getArtifact = async (artifactId) => {
		const normalizedArtifactId = getNonEmptyString(artifactId);
		if (!normalizedArtifactId) {
			return null;
		}

		return readArtifactFile(normalizedArtifactId);
	};

	const deleteArtifactsByRun = async (runId) => {
		const normalizedRunId = getNonEmptyString(runId);
		if (!normalizedRunId) {
			return;
		}

		const artifacts = await readAllArtifacts();
		const targets = artifacts.filter((artifact) => artifact.runId === normalizedRunId);
		await Promise.all(
			targets.map((artifact) =>
				fs.rm(buildArtifactFilePath(artifactsRootDir, artifact.id), {
					force: true,
				})
			)
		);
	};

	const upsertFromRun = async (run) => {
		if (!run || typeof run !== "object") {
			return [];
		}

		const runId = getNonEmptyString(run.runId) || getNonEmptyString(run.id);
		if (!runId) {
			return [];
		}

		if (getNonEmptyString(run.status) !== "completed") {
			return [];
		}

		const rawArtifacts = Array.isArray(run.artifacts) ? run.artifacts : [];
		const now = toIsoDate();
		const nextArtifacts = rawArtifacts
			.map((rawArtifact) => {
				if (!rawArtifact || typeof rawArtifact !== "object") {
					return null;
				}

				const runArtifactId = getNonEmptyString(rawArtifact.id);
				const title = getNonEmptyString(rawArtifact.title);
				const type = getNonEmptyString(rawArtifact.type);
				if (!runArtifactId || !title || !type) {
					return null;
				}

				const createdAt = getNonEmptyString(rawArtifact.createdAt) || now;
				const updatedAt = now;

				return toSerializableArtifact({
					id: toStorageId(runId, runArtifactId),
					runId,
					runArtifactId,
					title,
					type,
					url: rawArtifact.url,
					path: rawArtifact.path,
					mimeType: rawArtifact.mimeType,
					sizeBytes: rawArtifact.sizeBytes,
					createdAt,
					updatedAt,
					iteration: rawArtifact.iteration,
					taskId: rawArtifact.taskId,
					runStatus: run.status,
					planTitle: run.plan?.title,
				});
			})
			.filter(Boolean);

		await fs.mkdir(artifactsRootDir, { recursive: true });
		await Promise.all(nextArtifacts.map((artifact) => writeArtifactFile(artifact)));

		const existingArtifactsForRun = await listArtifacts({
			runId,
			limit: MAX_LIST_LIMIT,
		});
		const nextArtifactIds = new Set(nextArtifacts.map((artifact) => artifact.id));
		await Promise.all(
			existingArtifactsForRun
				.filter((artifact) => !nextArtifactIds.has(artifact.id))
				.map((artifact) =>
					fs.rm(buildArtifactFilePath(artifactsRootDir, artifact.id), {
						force: true,
					})
				)
		);

		return nextArtifacts;
	};

	return {
		listArtifacts,
		getArtifact,
		upsertFromRun,
		deleteArtifactsByRun,
	};
}

module.exports = {
	createArtifactManager,
};
