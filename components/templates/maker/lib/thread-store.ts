import type { RovoUIMessage } from "@/lib/rovo-ui-messages";

export const MAKER_THREAD_RETENTION_LIMIT = 30;
const DEFAULT_THREAD_TITLE = "New chat";

export interface PlanThread {
	id: string;
	title: string;
	messages: RovoUIMessage[];
	createdAt: number;
	updatedAt: number;
}

function createThreadId(): string {
	if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
		return crypto.randomUUID();
	}

	return `thread-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function trimTitleText(value: string): string {
	return value.replace(/^["']|["']$/g, "").replace(/\.+$/, "").trim();
}

export function deriveTitleFromUserPrompt(promptText: string): string {
	const firstLine = promptText
		.split(/\r?\n/)
		.map((line) => trimTitleText(line))
		.find((line) => line.length > 0);

	return trimTitleText(firstLine ?? promptText) || DEFAULT_THREAD_TITLE;
}

export function createThreadFromPrompt(options: {
	promptText: string;
	now?: number;
	id?: string;
	initialMessages?: ReadonlyArray<RovoUIMessage>;
}): PlanThread {
	const { promptText, now = Date.now(), id = createThreadId(), initialMessages = [] } = options;

	return {
		id,
		title: deriveTitleFromUserPrompt(promptText),
		messages: [...initialMessages],
		createdAt: now,
		updatedAt: now,
	};
}

export function sortThreadsByUpdatedAtDesc(
	threads: ReadonlyArray<PlanThread>
): PlanThread[] {
	return [...threads].sort((left, right) => {
		if (left.updatedAt !== right.updatedAt) {
			return right.updatedAt - left.updatedAt;
		}

		return right.createdAt - left.createdAt;
	});
}

export function applyRetentionLimit(
	threads: ReadonlyArray<PlanThread>,
	maxThreads: number
): PlanThread[] {
	return sortThreadsByUpdatedAtDesc(threads).slice(0, Math.max(1, maxThreads));
}

export function upsertThreadSnapshot(options: {
	threads: ReadonlyArray<PlanThread>;
	thread: PlanThread;
	maxThreads?: number;
}): PlanThread[] {
	const { threads, thread, maxThreads = MAKER_THREAD_RETENTION_LIMIT } = options;
	const existingIndex = threads.findIndex((item) => item.id === thread.id);

	if (existingIndex === -1) {
		return applyRetentionLimit([thread, ...threads], maxThreads);
	}

	const existingThread = threads[existingIndex];
	const next = [...threads];
	next[existingIndex] = {
		...existingThread,
		...thread,
		createdAt: existingThread.createdAt,
	};

	return applyRetentionLimit(next, maxThreads);
}

export function updateThreadTitle(options: {
	threads: ReadonlyArray<PlanThread>;
	chatId: string;
	title: string;
	updatedAt?: number;
	maxThreads?: number;
}): PlanThread[] {
	const { threads, chatId, title, updatedAt = Date.now(), maxThreads } = options;
	const normalizedTitle = trimTitleText(title);
	if (!normalizedTitle) {
		return [...threads];
	}

	const existingThread = threads.find((thread) => thread.id === chatId);
	if (!existingThread) {
		return [...threads];
	}

	const nextThread: PlanThread = {
		...existingThread,
		title: normalizedTitle,
		updatedAt: Math.max(existingThread.updatedAt, updatedAt),
	};

	return upsertThreadSnapshot({ threads, thread: nextThread, maxThreads });
}

export function updateThreadMessages(options: {
	threads: ReadonlyArray<PlanThread>;
	chatId: string;
	messages: ReadonlyArray<RovoUIMessage>;
	updatedAt?: number;
	maxThreads?: number;
}): PlanThread[] {
	const {
		threads,
		chatId,
		messages,
		updatedAt = Date.now(),
		maxThreads,
	} = options;
	const existingThread = threads.find((thread) => thread.id === chatId);
	if (!existingThread) {
		return [...threads];
	}

	const nextThread: PlanThread = {
		...existingThread,
		messages: [...messages],
		updatedAt: Math.max(existingThread.updatedAt, updatedAt),
	};

	return upsertThreadSnapshot({ threads, thread: nextThread, maxThreads });
}

export function deleteThread(options: {
	threads: ReadonlyArray<PlanThread>;
	chatId: string;
}): PlanThread[] {
	const { threads, chatId } = options;
	return threads.filter((thread) => thread.id !== chatId);
}

export function getThreadById(options: {
	threads: ReadonlyArray<PlanThread>;
	chatId: string;
}): PlanThread | null {
	const { threads, chatId } = options;
	return threads.find((thread) => thread.id === chatId) ?? null;
}
