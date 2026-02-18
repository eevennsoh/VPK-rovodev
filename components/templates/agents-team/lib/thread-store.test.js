const test = require("node:test");
const assert = require("node:assert/strict");
const {
	AGENTS_TEAM_THREAD_RETENTION_LIMIT,
	createThreadFromPrompt,
	getThreadById,
	updateThreadMessages,
	upsertThreadSnapshot,
} = require("./thread-store.ts");

function createMessage(id, role, text) {
	return {
		id,
		role,
		parts: [{ type: "text", text, state: "done" }],
	};
}

test("keeps archived thread messages when starting a new thread", () => {
	const archivedThread = createThreadFromPrompt({
		promptText: "Research AI tooling",
		now: 100,
		id: "thread-archived",
	});
	const archivedMessages = [
		createMessage("u-1", "user", "Research AI tooling"),
		createMessage("a-1", "assistant", "Here is a plan."),
	];

	let threads = upsertThreadSnapshot({
		threads: [],
		thread: archivedThread,
	});
	threads = updateThreadMessages({
		threads,
		chatId: archivedThread.id,
		messages: archivedMessages,
		updatedAt: 120,
	});

	const newThread = createThreadFromPrompt({
		promptText: "Draft migration strategy",
		now: 200,
		id: "thread-new",
	});
	threads = upsertThreadSnapshot({
		threads,
		thread: newThread,
	});

	const restoredArchivedThread = getThreadById({
		threads,
		chatId: archivedThread.id,
	});
	assert.ok(restoredArchivedThread);
	assert.deepEqual(restoredArchivedThread.messages, archivedMessages);
});

test("restores thread snapshot by id", () => {
	const firstThread = createThreadFromPrompt({
		promptText: "First task",
		now: 100,
		id: "thread-1",
	});
	const secondThread = createThreadFromPrompt({
		promptText: "Second task",
		now: 200,
		id: "thread-2",
	});

	let threads = upsertThreadSnapshot({
		threads: [],
		thread: firstThread,
	});
	threads = upsertThreadSnapshot({
		threads,
		thread: secondThread,
	});

	const secondMessages = [
		createMessage("u-2", "user", "Second task"),
		createMessage("a-2", "assistant", "Working on it."),
	];
	threads = updateThreadMessages({
		threads,
		chatId: secondThread.id,
		messages: secondMessages,
		updatedAt: 240,
	});

	const restored = getThreadById({
		threads,
		chatId: secondThread.id,
	});
	assert.ok(restored);
	assert.equal(restored.title, "Second task");
	assert.deepEqual(restored.messages, secondMessages);
});

test("applies retention limit to newest threads", () => {
	let threads = [];

	for (let index = 0; index < AGENTS_TEAM_THREAD_RETENTION_LIMIT + 5; index += 1) {
		const thread = createThreadFromPrompt({
			promptText: `Prompt ${index + 1}`,
			now: index + 1,
			id: `thread-${index + 1}`,
		});
		threads = upsertThreadSnapshot({
			threads,
			thread,
			maxThreads: AGENTS_TEAM_THREAD_RETENTION_LIMIT,
		});
	}

	assert.equal(threads.length, AGENTS_TEAM_THREAD_RETENTION_LIMIT);
	assert.equal(threads[0]?.id, "thread-35");
	assert.equal(threads.at(-1)?.id, "thread-6");
});
