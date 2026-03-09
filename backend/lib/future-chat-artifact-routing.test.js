const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");

const {
	applyFutureChatArtifactTitleRename,
	deriveFutureChatVersionChangeLabel,
} = require("./future-chat-artifact-updates");
const {
	fallbackFutureChatArtifactIntent,
} = require("./future-chat-artifact-intent");
const {
	createFutureChatDocumentManager,
} = require("./future-chat-documents");
const {
	resolveFutureChatActiveArtifact,
} = require("./future-chat-artifact-routing");
const {
	createFutureChatThreadManager,
} = require("./future-chat-threads");

async function createTempBaseDir() {
	return fs.mkdtemp(path.join(os.tmpdir(), "future-chat-artifact-routing-"));
}

test("resolveFutureChatActiveArtifact falls back to the persisted thread artifact", async () => {
	const baseDir = await createTempBaseDir();
	const futureChatDocumentManager = createFutureChatDocumentManager({ baseDir });
	const futureChatThreadManager = createFutureChatThreadManager({ baseDir, logger: console });

	const document = await futureChatDocumentManager.createDocument({
		threadId: "thread-1",
		title: "Apple",
		kind: "text",
		content: "# Apple\n\nOriginal content",
	});
	await futureChatThreadManager.createThread({
		id: "thread-1",
		title: "Create me a page about Apple",
		activeDocumentId: document.id,
	});

	const result = await resolveFutureChatActiveArtifact({
		futureChatDocumentManager,
		futureChatThreadManager,
		threadId: "thread-1",
	});

	assert.equal(result.activeArtifact?.id, document.id);
	assert.equal(result.activeArtifact?.title, "Apple");
	assert.match(result.activeArtifact?.content ?? "", /Original content/);
});

test("resolveFutureChatActiveArtifact keeps the freshest request draft content", async () => {
	const baseDir = await createTempBaseDir();
	const futureChatDocumentManager = createFutureChatDocumentManager({ baseDir });
	const futureChatThreadManager = createFutureChatThreadManager({ baseDir, logger: console });

	const document = await futureChatDocumentManager.createDocument({
		threadId: "thread-1",
		title: "Apple",
		kind: "text",
		content: "# Apple\n\nPersisted content",
	});
	await futureChatThreadManager.createThread({
		id: "thread-1",
		title: "Create me a page about Apple",
		activeDocumentId: document.id,
	});

	const result = await resolveFutureChatActiveArtifact({
		activeDocumentId: document.id,
		artifactContext: {
			id: document.id,
			title: "Apple",
			kind: "text",
			content: "# Apple\n\nUnsaved draft content",
		},
		futureChatDocumentManager,
		futureChatThreadManager,
		threadId: "thread-1",
	});

	assert.equal(result.activeArtifact?.id, document.id);
	assert.match(result.activeArtifact?.content ?? "", /Unsaved draft content/);
});

test("rename-style follow-ups append versions instead of creating a new artifact", async () => {
	const baseDir = await createTempBaseDir();
	const futureChatDocumentManager = createFutureChatDocumentManager({ baseDir });
	const futureChatThreadManager = createFutureChatThreadManager({ baseDir, logger: console });

	const thread = await futureChatThreadManager.createThread({
		id: "thread-1",
		title: "Create me a page about Apple",
	});
	const createdDocument = await futureChatDocumentManager.createDocument({
		threadId: thread.id,
		title: "Apple",
		kind: "text",
		content: "Apple is one of the world's most influential technology companies.",
	});
	await futureChatThreadManager.updateThread(thread.id, {
		activeDocumentId: createdDocument.id,
	});

	const titleAdditionState = await resolveFutureChatActiveArtifact({
		futureChatDocumentManager,
		futureChatThreadManager,
		threadId: thread.id,
	});
	const titleAdditionIntent = fallbackFutureChatArtifactIntent({
		activeArtifact: titleAdditionState.activeArtifact,
		latestUserMessage: "Can you add the title about this page?",
	});

	assert.equal(titleAdditionIntent.action, "updateDocument");

	const secondVersion = await futureChatDocumentManager.appendDocumentVersion(
		createdDocument.id,
		{
			changeLabel: deriveFutureChatVersionChangeLabel({
				artifactAction: "updateDocument",
				latestUserMessage: "Can you add the title about this page?",
				nextTitle: "Apple",
				previousTitle: createdDocument.title,
			}),
			title: "Apple",
			content: "# Apple\n\nApple is one of the world's most influential technology companies.",
		},
	);
	assert.ok(secondVersion);
	await futureChatThreadManager.updateThread(thread.id, {
		activeDocumentId: createdDocument.id,
	});

	const renameState = await resolveFutureChatActiveArtifact({
		futureChatDocumentManager,
		futureChatThreadManager,
		threadId: thread.id,
	});
	const renameIntent = fallbackFutureChatArtifactIntent({
		activeArtifact: renameState.activeArtifact,
		latestUserMessage: "Change the title to Apple Future",
	});

	assert.equal(renameIntent.action, "updateDocument");
	assert.equal(renameIntent.title, "Apple Future");

	const renamedContent = applyFutureChatArtifactTitleRename({
		content: secondVersion.versions.at(-1)?.content ?? "",
		nextTitle: renameIntent.title,
		previousTitle: secondVersion.title,
	});
	const renamedDocument = await futureChatDocumentManager.appendDocumentVersion(
		createdDocument.id,
		{
			changeLabel: deriveFutureChatVersionChangeLabel({
				artifactAction: "updateDocument",
				latestUserMessage: "Change the title to Apple Future",
				nextTitle: renameIntent.title,
				previousTitle: secondVersion.title,
			}),
			title: renameIntent.title,
			content: renamedContent,
		},
	);
	assert.ok(renamedDocument);
	await futureChatThreadManager.updateThread(thread.id, {
		activeDocumentId: createdDocument.id,
	});

	const listedDocuments = await futureChatDocumentManager.listDocuments({
		threadId: thread.id,
	});
	const updatedThread = await futureChatThreadManager.getThread(thread.id);

	assert.equal(listedDocuments.length, 1);
	assert.equal(listedDocuments[0].id, createdDocument.id);
	assert.equal(listedDocuments[0].versions.length, 3);
	assert.equal(listedDocuments[0].title, "Apple Future");
	assert.equal(listedDocuments[0].versions[2].title, "Apple Future");
	assert.match(listedDocuments[0].versions[2].content, /^# Apple Future/m);
	assert.equal(updatedThread?.activeDocumentId, createdDocument.id);
});
