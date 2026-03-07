const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");

const { createFutureChatThreadManager } = require("./future-chat-threads");
const { createFutureChatVoteManager } = require("./future-chat-votes");
const { createFutureChatDocumentManager } = require("./future-chat-documents");
const { createFutureChatUploadManager } = require("./future-chat-uploads");

async function createTempBaseDir() {
	return fs.mkdtemp(path.join(os.tmpdir(), "future-chat-test-"));
}

test("future chat thread manager persists and lists thread metadata", async () => {
	const baseDir = await createTempBaseDir();
	const manager = createFutureChatThreadManager({ baseDir, logger: console });

	const createdThread = await manager.createThread({
		id: "thread-1",
		title: "Launch plan",
		messages: [{ id: "m1", role: "user", parts: [{ type: "text", text: "hello" }] }],
		visibility: "public",
		modelId: "anthropic/claude-4.5-sonnet",
		provider: "anthropic",
	});

	assert.equal(createdThread.id, "thread-1");
	assert.equal(createdThread.visibility, "public");
	assert.equal(createdThread.modelId, "anthropic/claude-4.5-sonnet");

	const updatedThread = await manager.updateThread("thread-1", {
		title: "Updated launch plan",
		activeDocumentId: "doc-1",
	});

	assert.equal(updatedThread?.title, "Updated launch plan");
	assert.equal(updatedThread?.activeDocumentId, "doc-1");

	const listedThreads = await manager.listThreads();
	assert.equal(listedThreads.length, 1);
	assert.equal(listedThreads[0].id, "thread-1");
});

test("future chat vote manager stores one vote per message", async () => {
	const baseDir = await createTempBaseDir();
	const manager = createFutureChatVoteManager({ baseDir });

	await manager.setVote({
		threadId: "thread-1",
		messageId: "assistant-1",
		value: "up",
	});
	await manager.setVote({
		threadId: "thread-1",
		messageId: "assistant-2",
		value: "down",
	});

	let votes = await manager.listVotes("thread-1");
	assert.equal(votes.length, 2);
	assert.equal(votes.find((vote) => vote.messageId === "assistant-1")?.isUpvoted, true);
	assert.equal(votes.find((vote) => vote.messageId === "assistant-2")?.isUpvoted, false);

	await manager.setVote({
		threadId: "thread-1",
		messageId: "assistant-1",
		value: null,
	});

	votes = await manager.listVotes("thread-1");
	assert.equal(votes.length, 1);
	assert.equal(votes[0].messageId, "assistant-2");
});

test("future chat document manager versions artifacts over time", async () => {
	const baseDir = await createTempBaseDir();
	const manager = createFutureChatDocumentManager({ baseDir });

	const createdDocument = await manager.createDocument({
		threadId: "thread-1",
		title: "Spec draft",
		kind: "text",
		content: "Version one",
		sourceMessageId: "assistant-1",
	});

	assert.equal(createdDocument.versions.length, 1);

	const updatedDocument = await manager.appendDocumentVersion(createdDocument.id, {
		content: "Version two",
		title: "Spec draft v2",
	});

	assert.equal(updatedDocument?.title, "Spec draft v2");
	assert.equal(updatedDocument?.versions.length, 2);

	const listedDocuments = await manager.listDocuments({ threadId: "thread-1" });
	assert.equal(listedDocuments.length, 1);
	assert.equal(listedDocuments[0].versions[1].content, "Version two");
});

test("future chat document manager can create and finalize streaming document shells", async () => {
	const baseDir = await createTempBaseDir();
	const manager = createFutureChatDocumentManager({ baseDir });

	const shellDocument = await manager.createDocumentShell({
		documentId: "doc-shell-1",
		threadId: "thread-1",
		title: "Streaming draft",
		kind: "text",
	});

	assert.equal(shellDocument.versions.length, 0);

	const finalizedDocument = await manager.finalizeDocumentShell(shellDocument.id, {
		content: "Streamed content",
	});

	assert.equal(finalizedDocument?.versions.length, 1);
	assert.equal(finalizedDocument?.versions[0].content, "Streamed content");
});

test("future chat upload manager writes and reads data-url files", async () => {
	const baseDir = await createTempBaseDir();
	const manager = createFutureChatUploadManager({ baseDir });

	const createdUpload = await manager.createUploadFromDataUrl({
		filename: "note.txt",
		mediaType: "text/plain",
		dataUrl: "data:text/plain;base64,SGVsbG8gRnV0dXJlIENoYXQ=",
	});

	assert.equal(createdUpload.filename.endsWith(".txt"), true);
	assert.equal(createdUpload.mediaType, "text/plain");

	const loadedUpload = await manager.getUpload(createdUpload.id);
	assert.ok(loadedUpload);
	assert.equal(loadedUpload?.buffer.toString("utf8"), "Hello Future Chat");
});
