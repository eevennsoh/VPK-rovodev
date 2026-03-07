const fs = require("node:fs/promises");
const path = require("node:path");

function createId(prefix) {
	return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
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

function normalizeDocument(rawDocument) {
	if (!rawDocument || typeof rawDocument !== "object") {
		return null;
	}

	const id = typeof rawDocument.id === "string" && rawDocument.id.trim()
		? rawDocument.id.trim()
		: null;
	if (!id) {
		return null;
	}

	const threadId = typeof rawDocument.threadId === "string" && rawDocument.threadId.trim()
		? rawDocument.threadId.trim()
		: null;
	if (!threadId) {
		return null;
	}

	const createdAt = typeof rawDocument.createdAt === "string" && rawDocument.createdAt.trim()
		? rawDocument.createdAt
		: toIsoDate();
	const versions = Array.isArray(rawDocument.versions)
		? rawDocument.versions
			.map((version) => {
				if (!version || typeof version !== "object") {
					return null;
				}

				const versionId = typeof version.id === "string" && version.id.trim()
					? version.id.trim()
					: createId("doc-version");
				return {
					id: versionId,
					content: typeof version.content === "string" ? version.content : "",
					createdAt:
						typeof version.createdAt === "string" && version.createdAt.trim()
							? version.createdAt
							: createdAt,
				};
			})
			.filter(Boolean)
		: [];

	return {
		id,
		threadId,
		title:
			typeof rawDocument.title === "string" && rawDocument.title.trim()
				? rawDocument.title.trim()
				: "Untitled artifact",
		kind:
			rawDocument.kind === "code" ||
			rawDocument.kind === "image" ||
			rawDocument.kind === "sheet"
				? rawDocument.kind
				: "text",
		sourceMessageId:
			typeof rawDocument.sourceMessageId === "string" && rawDocument.sourceMessageId.trim()
				? rawDocument.sourceMessageId.trim()
				: null,
		createdAt,
		updatedAt:
			typeof rawDocument.updatedAt === "string" && rawDocument.updatedAt.trim()
				? rawDocument.updatedAt
				: createdAt,
		versions,
	};
}

function createFutureChatDocumentManager({ baseDir }) {
	const documentsRootDir = path.join(baseDir, "future-chat", "documents");

	const getDocumentPath = (documentId) =>
		path.join(documentsRootDir, `${encodeURIComponent(documentId)}.json`);

	const writeDocument = async (document) => {
		await fs.mkdir(documentsRootDir, { recursive: true });
		await fs.writeFile(
			getDocumentPath(document.id),
			`${JSON.stringify(document, null, 2)}\n`,
			"utf8",
		);
	};

	const readDocument = async (documentId) => {
		try {
			const raw = await fs.readFile(getDocumentPath(documentId), "utf8");
			return normalizeDocument(safeJsonParse(raw));
		} catch (error) {
			if (error && error.code === "ENOENT") {
				return null;
			}

			throw error;
		}
	};

	const listDocuments = async ({ threadId } = {}) => {
		let entries;
		try {
			entries = await fs.readdir(documentsRootDir, { withFileTypes: true });
		} catch (error) {
			if (error && error.code === "ENOENT") {
				return [];
			}

			throw error;
		}

		const documents = [];
		for (const entry of entries) {
			if (!entry.isFile() || !entry.name.endsWith(".json")) {
				continue;
			}
			const document = await readDocument(decodeURIComponent(entry.name.replace(/\.json$/u, "")));
			if (!document) {
				continue;
			}
			if (threadId && document.threadId !== threadId) {
				continue;
			}
			documents.push(document);
		}

		documents.sort((left, right) => {
			return Date.parse(right.updatedAt) - Date.parse(left.updatedAt);
		});
		return documents;
	};

	const createDocument = async ({
		threadId,
		title,
		kind,
		content,
		sourceMessageId,
	}) => {
		const now = toIsoDate();
		const nextDocument = normalizeDocument({
			id: createId("doc"),
			threadId,
			title,
			kind,
			sourceMessageId,
			createdAt: now,
			updatedAt: now,
			versions: [{
				id: createId("doc-version"),
				content: typeof content === "string" ? content : "",
				createdAt: now,
			}],
		});
		await writeDocument(nextDocument);
		return nextDocument;
	};

	const createDocumentShell = async ({
		documentId,
		threadId,
		title,
		kind,
		sourceMessageId,
	}) => {
		const now = toIsoDate();
		const nextDocument = normalizeDocument({
			id: typeof documentId === "string" && documentId.trim() ? documentId.trim() : createId("doc"),
			threadId,
			title,
			kind,
			sourceMessageId,
			createdAt: now,
			updatedAt: now,
			versions: [],
		});
		await writeDocument(nextDocument);
		return nextDocument;
	};

	const appendDocumentVersion = async (documentId, { title, content, kind }) => {
		const currentDocument = await readDocument(documentId);
		if (!currentDocument) {
			return null;
		}

		const now = toIsoDate();
		const nextDocument = normalizeDocument({
			...currentDocument,
			title: typeof title === "string" && title.trim() ? title.trim() : currentDocument.title,
			kind:
				kind === "code" || kind === "image" || kind === "sheet" || kind === "text"
					? kind
					: currentDocument.kind,
			updatedAt: now,
			versions: [
				...currentDocument.versions,
				{
					id: createId("doc-version"),
					content: typeof content === "string" ? content : "",
					createdAt: now,
				},
			],
		});
		await writeDocument(nextDocument);
		return nextDocument;
	};

	const finalizeDocumentShell = async (documentId, { title, content, kind }) => {
		const currentDocument = await readDocument(documentId);
		if (!currentDocument) {
			return null;
		}

		const now = toIsoDate();
		const nextVersions =
			currentDocument.versions.length === 0
				? [
						{
							id: createId("doc-version"),
							content: typeof content === "string" ? content : "",
							createdAt: now,
						},
					]
				: [
						...currentDocument.versions,
						{
							id: createId("doc-version"),
							content: typeof content === "string" ? content : "",
							createdAt: now,
						},
					];

		const nextDocument = normalizeDocument({
			...currentDocument,
			title: typeof title === "string" && title.trim() ? title.trim() : currentDocument.title,
			kind:
				kind === "code" || kind === "image" || kind === "sheet" || kind === "text"
					? kind
					: currentDocument.kind,
			updatedAt: now,
			versions: nextVersions,
		});
		await writeDocument(nextDocument);
		return nextDocument;
	};

	const deleteDocument = async (documentId) => {
		await fs.rm(getDocumentPath(documentId), { force: true });
	};

	const deleteDocumentsByThread = async (threadId) => {
		const documents = await listDocuments({ threadId });
		await Promise.all(documents.map((document) => deleteDocument(document.id)));
	};

	const deleteAllDocuments = async () => {
		await fs.rm(documentsRootDir, { recursive: true, force: true });
	};

	return {
		listDocuments,
		getDocument: readDocument,
		createDocument,
		createDocumentShell,
		appendDocumentVersion,
		finalizeDocumentShell,
		deleteDocument,
		deleteDocumentsByThread,
		deleteAllDocuments,
	};
}

module.exports = {
	createFutureChatDocumentManager,
};
