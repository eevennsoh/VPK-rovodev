const fs = require("node:fs/promises");
const path = require("node:path");

function createId() {
	return `upload-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function toIsoDate(value = Date.now()) {
	const date = value instanceof Date ? value : new Date(value);
	return date.toISOString();
}

function safeJsonParse(rawValue) {
	try {
		return JSON.parse(rawValue);
	} catch {
		return null;
	}
}

function normalizeUpload(rawUpload) {
	if (!rawUpload || typeof rawUpload !== "object") {
		return null;
	}

	const id = typeof rawUpload.id === "string" && rawUpload.id.trim()
		? rawUpload.id.trim()
		: null;
	if (!id) {
		return null;
	}

	return {
		id,
		filename:
			typeof rawUpload.filename === "string" && rawUpload.filename.trim()
				? rawUpload.filename.trim()
				: "upload.bin",
		mediaType:
			typeof rawUpload.mediaType === "string" && rawUpload.mediaType.trim()
				? rawUpload.mediaType.trim()
				: "application/octet-stream",
		sizeBytes:
			typeof rawUpload.sizeBytes === "number" && Number.isFinite(rawUpload.sizeBytes)
				? rawUpload.sizeBytes
				: 0,
		filePath:
			typeof rawUpload.filePath === "string" && rawUpload.filePath.trim()
				? rawUpload.filePath.trim()
				: null,
		createdAt:
			typeof rawUpload.createdAt === "string" && rawUpload.createdAt.trim()
				? rawUpload.createdAt
				: toIsoDate(),
	};
}

function parseDataUrl(dataUrl) {
	if (typeof dataUrl !== "string") {
		return null;
	}

	const match = dataUrl.match(/^data:([^;,]+)?;base64,(.+)$/u);
	if (!match) {
		return null;
	}

	const mediaType = match[1] || "application/octet-stream";
	const base64 = match[2];
	try {
		return {
			mediaType,
			buffer: Buffer.from(base64, "base64"),
		};
	} catch {
		return null;
	}
}

function sanitizeFileName(filename) {
	if (typeof filename !== "string" || !filename.trim()) {
		return "upload.bin";
	}

	return filename.replace(/[^a-zA-Z0-9._-]/gu, "-");
}

function createFutureChatUploadManager({ baseDir }) {
	const uploadsRootDir = path.join(baseDir, "future-chat", "uploads");
	const metadataRootDir = path.join(uploadsRootDir, "metadata");
	const filesRootDir = path.join(uploadsRootDir, "files");

	const getMetadataPath = (uploadId) =>
		path.join(metadataRootDir, `${encodeURIComponent(uploadId)}.json`);

	const writeUpload = async (upload, buffer) => {
		await fs.mkdir(metadataRootDir, { recursive: true });
		await fs.mkdir(filesRootDir, { recursive: true });
		await fs.writeFile(
			getMetadataPath(upload.id),
			`${JSON.stringify(upload, null, 2)}\n`,
			"utf8",
		);
		await fs.writeFile(path.join(filesRootDir, upload.filePath), buffer);
	};

	const getUpload = async (uploadId) => {
		try {
			const raw = await fs.readFile(getMetadataPath(uploadId), "utf8");
			const upload = normalizeUpload(safeJsonParse(raw));
			if (!upload || !upload.filePath) {
				return null;
			}

			const absolutePath = path.join(filesRootDir, upload.filePath);
			const buffer = await fs.readFile(absolutePath);
			return {
				...upload,
				buffer,
				absolutePath,
			};
		} catch (error) {
			if (error && error.code === "ENOENT") {
				return null;
			}

			throw error;
		}
	};

	const createUploadFromBuffer = async ({ filename, mediaType, buffer }) => {
		const uploadId = createId();
		const safeName = sanitizeFileName(filename);
		const filePath = `${uploadId}-${safeName}`;
		const upload = normalizeUpload({
			id: uploadId,
			filename: safeName,
			mediaType,
			sizeBytes: buffer.length,
			filePath,
			createdAt: toIsoDate(),
		});
		await writeUpload(upload, buffer);
		return upload;
	};

	const createUploadFromDataUrl = async ({ filename, mediaType, dataUrl }) => {
		const parsed = parseDataUrl(dataUrl);
		if (!parsed) {
			throw new Error("Invalid data URL payload.");
		}

		return createUploadFromBuffer({
			filename,
			mediaType:
				typeof mediaType === "string" && mediaType.trim()
					? mediaType.trim()
					: parsed.mediaType,
			buffer: parsed.buffer,
		});
	};

	const deleteUpload = async (uploadId) => {
		const upload = await getUpload(uploadId);
		await fs.rm(getMetadataPath(uploadId), { force: true });
		if (upload?.filePath) {
			await fs.rm(path.join(filesRootDir, upload.filePath), { force: true });
		}
	};

	const deleteAllUploads = async () => {
		await fs.rm(uploadsRootDir, { recursive: true, force: true });
	};

	return {
		getUpload,
		createUploadFromBuffer,
		createUploadFromDataUrl,
		deleteUpload,
		deleteAllUploads,
	};
}

module.exports = {
	createFutureChatUploadManager,
};
