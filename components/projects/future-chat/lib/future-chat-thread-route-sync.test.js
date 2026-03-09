const assert = require("node:assert/strict");
const test = require("node:test");

const {
	buildFutureChatThreadPersistKey,
	shouldReplaceFutureChatRouteAfterPersistence,
} = require("./future-chat-thread-route-sync.ts");

function createMessage(id, role, text) {
	return {
		id,
		role,
		parts: [{ type: "text", text }],
	};
}

function createThread(overrides = {}) {
	return {
		id: "thread-1",
		title: "Create a page about apple",
		messages: [],
		visibility: "private",
		modelId: null,
		provider: null,
		activeDocumentId: null,
		createdAt: "2026-03-09T09:00:00.000Z",
		updatedAt: "2026-03-09T09:00:00.000Z",
		...overrides,
	};
}

test("does not switch to the thread route while the persisted thread is still empty", () => {
	const messages = [
		createMessage("user-1", "user", "Create a page about apple"),
		createMessage("assistant-1", "assistant", 'Created artifact "apple".'),
	];

	assert.equal(
		shouldReplaceFutureChatRouteAfterPersistence({
			pendingThreadId: "thread-1",
			thread: createThread(),
			messages,
			visibility: "private",
			activeDocumentId: "doc-1",
			title: "Create a page about apple",
		}),
		false,
	);
});

test("switches to the thread route once the persisted thread matches the current chat state", () => {
	const messages = [
		createMessage("user-1", "user", "Create a page about apple"),
		createMessage("assistant-1", "assistant", 'Created artifact "apple".'),
	];

	assert.equal(
		shouldReplaceFutureChatRouteAfterPersistence({
			pendingThreadId: "thread-1",
			thread: createThread({
				messages,
				activeDocumentId: "doc-1",
			}),
			messages,
			visibility: "private",
			activeDocumentId: "doc-1",
			title: "Create a page about apple",
		}),
		true,
	);
});

test("buildFutureChatThreadPersistKey includes title and active artifact state", () => {
	const key = buildFutureChatThreadPersistKey({
		messages: [createMessage("user-1", "user", "Create a page about apple")],
		visibility: "private",
		activeDocumentId: "doc-1",
		title: "Create a page about apple",
	});

	assert.match(key, /"activeDocumentId":"doc-1"/u);
	assert.match(key, /"title":"Create a page about apple"/u);
});
