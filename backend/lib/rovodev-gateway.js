/**
 * RovoDev Gateway — bridges RovoDev Serve SSE events into the AI SDK
 * `createUIMessageStream` writer protocol.
 *
 * This module lets us keep `@ai-sdk/react` `useChat()` on the frontend
 * while routing all LLM traffic through RovoDev Serve on the backend.
 *
 * Usage in an Express route:
 *
 *   const { streamViaRovoDev, generateTextViaRovoDev } = require("./rovodev-gateway");
 *
 *   // Streaming (inside createUIMessageStream execute callback)
 *   await streamViaRovoDev({ message: fullMessage, onTextDelta: handleStreamTextDelta });
 *
 *   // Non-streaming (title, suggestions, clarification)
 *   const text = await generateTextViaRovoDev({ system, prompt });
 */

const { sendMessageStreaming, sendMessageSync, cancelChat, getRovoDevPort } = require("./rovodev-client");
const { toPreview } = require("./tool-output-sanitizer");

const RETRY_INITIAL_DELAY_MS = 250;
const RETRY_DELAY_STEP_MS = 250;
const RETRY_MAX_DELAY_MS = 1_000;
const RETRY_TIMEOUT_MS = 10_000;
const PINNED_PORT_ACQUIRE_TIMEOUT_MS = 30_000;
const WAIT_FOR_TURN_TIMEOUT_MS = 600_000;

// ─── Pool integration ───────────────────────────────────────────────────────

/** @type {import("./rovodev-pool").Pool | null} */
let _pool = null;

/** Number of ports reserved for interactive chat panels (set by server.js). */
let _pinnedPortCount = 0;

/**
 * Optional callback to restart a stuck RovoDev port via process kill + supervisor restart.
 * Set via setPortRecovery() from server.js.
 * @type {((port: number) => Promise<{ recovered: boolean; error?: string }>) | null}
 */
let _recoverPort = null;

/**
 * Inject the RovoDev port pool. Called once from server.js at startup.
 * @param {import("./rovodev-pool").Pool | null} pool
 */
function initPool(pool) {
	_pool = pool;
}

/**
 * Set how many leading pool indices are reserved for interactive chat panels.
 * Background tasks (suggestions, question cards) will avoid these indices.
 * @param {number} count
 */
function setPinnedPortCount(count) {
	_pinnedPortCount = Math.max(0, count);
}

/**
 * Inject a port recovery callback. Called once from server.js at startup.
 * The callback should kill the stuck rovodev process and wait for the
 * supervisor to restart it.
 * @param {((port: number) => Promise<{ recovered: boolean; error?: string }>) | null} fn
 */
function setPortRecovery(fn) {
	_recoverPort = typeof fn === "function" ? fn : null;
}

/**
 * Acquire a port handle. When a pool is available, delegates to pool.acquire().
 * Otherwise returns a dummy handle using the single env-var port.
 *
 * If `port` is provided and a pool exists, acquires that exact port.
 * If `portIndex` is provided and a pool exists, acquires the specific port at
 * that index (sticky session assignment for multiport demos).
 * If `excludePinnedPorts` is true and a pool exists, acquires a port that is
 * NOT in the first `_pinnedPortCount` indices (for background tasks).
 *
 * @param {object} [opts]
 * @param {number} [opts.timeoutMs]
 * @param {number} [opts.port] - Explicit RovoDev port number for dedicated assignment
 * @param {number} [opts.portIndex] - Sticky port index (0-based) for dedicated assignment
 * @param {boolean} [opts.excludePinnedPorts] - Avoid pinned panel ports (for background tasks)
 * @param {AbortSignal} [opts.signal]
 * @returns {Promise<{ port: number; release: () => void }>}
 */
async function acquirePort({ timeoutMs = 30_000, port, portIndex, excludePinnedPorts, signal } = {}) {
	if (!_pool) {
		const resolvedPort =
			typeof port === "number" && port > 0 ? port : getRovoDevPort();
		return { port: resolvedPort, release: () => {} };
	}
	if (typeof port === "number" && port > 0) {
		return _pool.acquireByPort(port, { timeoutMs, signal });
	}
	if (typeof portIndex === "number" && portIndex >= 0) {
		return _pool.acquireByIndex(portIndex, { timeoutMs, signal });
	}
	if (excludePinnedPorts && _pinnedPortCount > 0 && typeof _pool.acquireExcluding === "function") {
		const excludedIndices = Array.from({ length: _pinnedPortCount }, (_, i) => i);
		return _pool.acquireExcluding(excludedIndices, { timeoutMs, signal });
	}
	return _pool.acquire({ timeoutMs, signal });
}

// ─── No-pool fallback helpers ───────────────────────────────────────────────

let queuedTextGenerationTail = Promise.resolve();
let queuedTextGenerationCount = 0;
let queuedTextGenerationId = 0;

/**
 * Check whether an error is a 409 "chat already in progress" conflict.
 * @param {Error} err
 * @returns {boolean}
 */
function isChatInProgressError(err) {
	if (!err || typeof err !== "object") {
		return false;
	}

	const errorRecord = /** @type {{ message?: unknown; code?: unknown; status?: unknown; statusCode?: unknown; endpoint?: unknown }} */ (
		err
	);
	const message =
		typeof errorRecord.message === "string" ? errorRecord.message : "";
	const code = typeof errorRecord.code === "string" ? errorRecord.code : "";
	if (code === "ROVODEV_CHAT_IN_PROGRESS_TIMEOUT") {
		return true;
	}

	if (
		/chat(?: already)? in progress|chat-turn wait timed out|still finishing the previous response/i.test(
			message
		)
	) {
		return true;
	}

	const status =
		typeof errorRecord.status === "number"
			? errorRecord.status
			: typeof errorRecord.statusCode === "number"
				? errorRecord.statusCode
				: null;
	if (status !== 409) {
		return false;
	}

	const endpoint =
		typeof errorRecord.endpoint === "string" ? errorRecord.endpoint : "";
	return (
		/\/v3\/(?:set_chat_message|stream_chat|cancel)\b/i.test(endpoint) ||
		/\/v3\/(?:set_chat_message|stream_chat|cancel)\b/i.test(message)
	);
}

/**
 * Check whether an error indicates the prompt exceeded the model's context window.
 * @param {Error} err
 * @returns {boolean}
 */
function isPromptTooLongError(err) {
	if (!err || typeof err.message !== "string") {
		return false;
	}
	const msg = err.message;
	return /prompt is too long/i.test(msg) || /tokens?\s*>\s*\d+\s*maximum/i.test(msg);
}

/**
 * Wait for a given number of milliseconds.
 * @param {number} ms
 * @param {AbortSignal} [signal] - Optional signal to cancel the sleep early
 * @returns {Promise<void>}
 */
function sleep(ms, signal) {
	return new Promise((resolve) => {
		if (signal?.aborted) {
			resolve();
			return;
		}

		const timer = setTimeout(resolve, ms);

		if (signal) {
			const onAbort = () => {
				clearTimeout(timer);
				resolve();
			};
			signal.addEventListener("abort", onAbort, { once: true });
		}
	});
}

function createAbortError(message = "RovoDev operation aborted") {
	const abortError = new Error(message);
	abortError.name = "AbortError";
	abortError.code = "ABORT_ERR";
	return abortError;
}

function throwIfAborted(signal, message) {
	if (!signal?.aborted) {
		return;
	}
	throw createAbortError(message);
}

/**
 * Retry an operation while RovoDev reports "chat already in progress" (409).
 * Uses short, bounded backoff delays so queued prompts start as soon as possible.
 *
 * @param {object} params
 * @param {boolean} [params.cancelOnConflict]
 * @param {number} [params.cancelAfterMs]
 * @param {number} [params.elapsedMs]
 * @returns {boolean}
 */
function shouldCancelConflictingTurn({
	cancelOnConflict = true,
	cancelAfterMs = 0,
	elapsedMs = 0,
}) {
	if (!cancelOnConflict) {
		return false;
	}

	const safeCancelAfterMs =
		typeof cancelAfterMs === "number" && Number.isFinite(cancelAfterMs)
			? Math.max(0, cancelAfterMs)
			: 0;
	if (safeCancelAfterMs === 0) {
		return true;
	}

	const safeElapsedMs =
		typeof elapsedMs === "number" && Number.isFinite(elapsedMs)
			? Math.max(0, elapsedMs)
			: 0;
	return safeElapsedMs >= safeCancelAfterMs;
}

/**
 * Retry an operation while RovoDev reports "chat already in progress" (409).
 * Uses short, bounded backoff delays so queued prompts start as soon as possible.
 *
 * @template T
 * @param {() => Promise<T>} operation
 * @param {object} params
 * @param {AbortSignal} [params.signal]
 * @param {function} [params.onRetry]
 * @param {function} [params.onRetryProgress]
 * @param {string} params.logPrefix
 * @param {number} [params.timeoutMs]
 * @param {boolean} [params.cancelOnConflict]
 * @param {number} [params.cancelAfterMs]
 * @param {(port?: number) => Promise<unknown>} [params.cancelConflictTurn]
 * @param {number} [params.port]
 * @returns {Promise<{ aborted: boolean; value: T | undefined }>}
 */
async function retryChatInProgress(
	operation,
	{
		signal,
		onRetry,
		onRetryProgress,
		logPrefix,
		timeoutMs = RETRY_TIMEOUT_MS,
		cancelOnConflict = true,
		cancelAfterMs = 0,
		cancelConflictTurn = cancelChat,
		port,
	}
) {
	const startedAtMs = Date.now();
	const deadlineMs = Date.now() + timeoutMs;
	let retryDelayMs = RETRY_INITIAL_DELAY_MS;
	let retryNotified = false;
	let conflictCount = 0;

	while (true) {
		if (signal?.aborted) {
			return { aborted: true, value: undefined };
		}

		try {
			const value = await operation();
			if (conflictCount > 0) {
				const elapsedMs = Date.now() - startedAtMs;
				console.info(
					`[${logPrefix}] Chat turn acquired after ${conflictCount} conflict retries (${elapsedMs}ms elapsed).`
				);
			}
			return { aborted: false, value };
		} catch (err) {
			if (!isChatInProgressError(err)) {
				throw err;
			}
			conflictCount += 1;

			const remainingMs = deadlineMs - Date.now();
			if (remainingMs <= 0) {
				if (err && typeof err === "object") {
					err.chatInProgressTimedOut = true;
					err.chatInProgressRetryCount = conflictCount;
					err.chatInProgressElapsedMs = Date.now() - startedAtMs;
				}
				throw err;
			}

			if (!retryNotified && typeof onRetry === "function") {
				retryNotified = true;
				onRetry();
			}

			const elapsedMs = Date.now() - startedAtMs;
			const waitMs = Math.min(retryDelayMs, RETRY_MAX_DELAY_MS, remainingMs);
			const shouldCancel = shouldCancelConflictingTurn({
				cancelOnConflict,
				cancelAfterMs,
				elapsedMs,
			});
			if (typeof onRetryProgress === "function") {
				onRetryProgress({
					conflictCount,
					elapsedMs,
					waitMs,
					remainingMs,
					willCancel: shouldCancel,
				});
			}
			console.warn(
				shouldCancel
					? `[${logPrefix}] Chat already in progress (conflict ${conflictCount}) — cancelling and retrying in ${waitMs}ms...`
					: cancelOnConflict
						? `[${logPrefix}] Chat already in progress (conflict ${conflictCount}) — waiting ${waitMs}ms before attempting cancellation...`
						: `[${logPrefix}] Chat already in progress (conflict ${conflictCount}) — waiting ${waitMs}ms before retrying...`
			);

			if (shouldCancel) {
				try {
					await cancelConflictTurn(port);
				} catch {
					// Ignore cancel errors — the chat may have finished on its own
				}
			}

			await sleep(waitMs, signal);
			retryDelayMs = Math.min(
				retryDelayMs + RETRY_DELAY_STEP_MS,
				RETRY_MAX_DELAY_MS
			);
		}
	}
}

/**
 * Build a typed timeout error for chat-turn wait exhaustion.
 * @param {number} timeoutMs
 * @param {object} [metadata]
 * @param {string} [metadata.logPrefix]
 * @param {number} [metadata.retryCount]
 * @param {number} [metadata.elapsedMs]
 * @returns {Error}
 */
function createChatInProgressTimeoutError(timeoutMs, metadata = {}) {
	const timeoutSeconds = Math.ceil(timeoutMs / 1000);
	const retryCount =
		typeof metadata.retryCount === "number" && metadata.retryCount > 0
			? metadata.retryCount
			: null;
	const timeoutError = new Error(
		retryCount
			? `RovoDev chat in progress timeout after ${timeoutSeconds}s (${retryCount} retries)`
			: `RovoDev chat in progress timeout after ${timeoutSeconds}s`
	);
	timeoutError.code = "ROVODEV_CHAT_IN_PROGRESS_TIMEOUT";
	if (retryCount) {
		timeoutError.retryCount = retryCount;
	}
	if (typeof metadata.elapsedMs === "number" && metadata.elapsedMs > 0) {
		timeoutError.elapsedMs = metadata.elapsedMs;
	}
	if (typeof metadata.logPrefix === "string" && metadata.logPrefix.trim()) {
		timeoutError.source = metadata.logPrefix.trim();
	}
	return timeoutError;
}

/**
 * Enqueue non-streaming text generation calls so only one RovoDev request runs
 * at a time for callers that require deterministic execution ordering.
 *
 * @template T
 * @param {() => Promise<T>} operation
 * @param {object} [params]
 * @param {string} [params.logPrefix]
 * @returns {Promise<T>}
 */
function enqueueTextGeneration(operation, { logPrefix = "generateTextViaRovoDev" } = {}) {
	const queueId = ++queuedTextGenerationId;
	const queuedAtMs = Date.now();
	queuedTextGenerationCount += 1;
	console.info(
		`[${logPrefix}] Queued background text generation request #${queueId} (queued=${queuedTextGenerationCount}).`
	);

	const queuedTask = queuedTextGenerationTail.then(async () => {
		const queueWaitMs = Date.now() - queuedAtMs;
		const startedAtMs = Date.now();
		console.info(
			`[${logPrefix}] Starting background text generation request #${queueId} after ${queueWaitMs}ms queue wait.`
		);
		try {
			const result = await operation();
			console.info(
				`[${logPrefix}] Completed background text generation request #${queueId} in ${Date.now() - startedAtMs}ms.`
			);
			return result;
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : String(error);
			console.warn(
				`[${logPrefix}] Background text generation request #${queueId} failed after ${Date.now() - startedAtMs}ms: ${errorMessage}`
			);
			throw error;
		} finally {
			queuedTextGenerationCount = Math.max(queuedTextGenerationCount - 1, 0);
		}
	});

	queuedTextGenerationTail = queuedTask.catch(() => undefined);
	return queuedTask;
}

function normalizeToolName(toolName) {
	if (typeof toolName !== "string") {
		return null;
	}

	const normalized = toolName.trim();
	return normalized.length > 0 ? normalized : null;
}

function getToolNameKey(toolName) {
	const normalizedToolName = normalizeToolName(toolName);
	if (!normalizedToolName) {
		return null;
	}

	return normalizedToolName.toLowerCase().replace(/[\s:/.+-]+/g, "_");
}

const IMAGE_TOOL_HINTS = [
	"image",
	"screenshot",
	"photo",
	"picture",
	"thumbnail",
	"spritesheet",
	"figjam",
];

const AUDIO_TOOL_HINTS = [
	"audio",
	"sound",
	"speech",
	"voice",
	"transcribe",
	"transcript",
	"tts",
	"stt",
	"whisper",
	"music",
];

const UI_TOOL_HINTS = [
	"genui",
	"figma",
	"design_context",
	"design_system",
	"component",
	"layout",
	"wireframe",
	"prototype",
	"tailwind",
	"html",
	"css",
];

const DATA_TOOL_HINTS = [
	"calendar",
	"jira",
	"confluence",
	"slack",
	"drive",
	"search",
	"query",
	"fetch",
	"list",
	"meeting",
	"event",
	"issue",
	"project",
	"document",
	"repo",
	"notion",
	"github",
	"compass",
	"graph",
	"task",
];

function hasToolHint(toolKey, hints) {
	return hints.some((hint) => toolKey.includes(hint));
}

function getThinkingActivityFromToolName(toolName) {
	const toolKey = getToolNameKey(toolName);
	if (!toolKey) {
		return "results";
	}

	if (hasToolHint(toolKey, IMAGE_TOOL_HINTS)) {
		return "image";
	}
	if (hasToolHint(toolKey, AUDIO_TOOL_HINTS)) {
		return "audio";
	}
	if (hasToolHint(toolKey, UI_TOOL_HINTS)) {
		return "ui";
	}
	if (hasToolHint(toolKey, DATA_TOOL_HINTS)) {
		return "data";
	}

	return "results";
}

function getThinkingLabelForActivity(activity, phase) {
	if (activity === "image") {
		if (phase === "start") return "Generating image";
		if (phase === "error") return "Image generation failed";
		return "Generated image";
	}
	if (activity === "audio") {
		if (phase === "start") return "Generating audio";
		if (phase === "error") return "Audio generation failed";
		return "Generated audio";
	}
	if (activity === "ui") {
		if (phase === "start") return "Generating UI";
		if (phase === "error") return "UI generation failed";
		return "Generated UI";
	}
	if (activity === "data") {
		if (phase === "start") return "Gathering information";
		if (phase === "error") return "Information retrieval failed";
		return "Gathered information";
	}

	if (phase === "start") return "Generating results";
	if (phase === "error") return "Result generation failed";
	return "Generated results";
}

function isGenericIntegrationWrapperToolName(toolName) {
	const key = getToolNameKey(toolName);
	if (!key) {
		return false;
	}

	if (key === "mcp_invoke_tool" || key === "mcp__integrations__invoke_tool") {
		return true;
	}

	if (!key.startsWith("mcp")) {
		return false;
	}

	return key.endsWith("__invoke_tool") || key.endsWith("_invoke_tool");
}

function resolveToolNameForToolEvent({
	reportedToolName,
	rememberedToolName,
} = {}) {
	const normalizedReportedToolName = normalizeToolName(reportedToolName);
	const normalizedRememberedToolName = normalizeToolName(rememberedToolName);

	if (normalizedRememberedToolName && normalizedReportedToolName) {
		const reportedIsWrapper =
			isGenericIntegrationWrapperToolName(normalizedReportedToolName);
		const rememberedIsWrapper =
			isGenericIntegrationWrapperToolName(normalizedRememberedToolName);

		if (reportedIsWrapper && !rememberedIsWrapper) {
			return normalizedRememberedToolName;
		}
		if (!reportedIsWrapper && rememberedIsWrapper) {
			return normalizedReportedToolName;
		}

		// If both names are similarly specific (or both wrapper-like), keep the
		// call-id scoped tool name so nested integration names survive wrapper
		// tool_result envelopes.
		return normalizedRememberedToolName;
	}

	return normalizedRememberedToolName ?? normalizedReportedToolName;
}

function buildThinkingStatusFromToolEvent(toolName, phase) {
	const resolvedToolName = normalizeToolName(toolName);
	const toolLabel = resolvedToolName ?? "a tool";
	const activity = getThinkingActivityFromToolName(resolvedToolName);
	const label = getThinkingLabelForActivity(activity, phase);

	if (phase === "start") {
		return {
			label,
			content: `Invoking ${toolLabel}`,
			activity,
			source: "backend",
		};
	}

	if (phase === "error") {
		return {
			label,
			content: `Tool call failed: ${toolLabel}`,
			activity,
			source: "backend",
		};
	}

	return {
		label,
		content: `Completed ${toolLabel}`,
		activity,
		source: "backend",
	};
}

function buildThinkingEventFromToolEvent({
	toolName,
	toolCallId,
	phase,
	input,
	output,
	outputPreview,
	outputTruncated,
	outputBytes,
	suppressedRawOutput,
	errorText,
}) {
	const resolvedToolName = normalizeToolName(toolName) ?? "Tool";
	const resolvedToolCallId =
		typeof toolCallId === "string" && toolCallId.trim()
			? toolCallId.trim()
			: undefined;
	const resolvedPhase =
		phase === "start" || phase === "result" || phase === "error"
			? phase
			: null;
	if (!resolvedPhase) {
		return null;
	}

	const eventId = resolvedToolCallId
		? `${resolvedToolCallId}:${resolvedPhase}:${Date.now()}`
		: `thinking-event:${resolvedToolName}:${resolvedPhase}:${Date.now()}`;
	const event = {
		eventId,
		phase: resolvedPhase,
		toolName: resolvedToolName,
		timestamp: new Date().toISOString(),
	};

	if (resolvedToolCallId) {
		event.toolCallId = resolvedToolCallId;
	}
	if (input !== undefined) {
		event.input = input;
	}
	if (output !== undefined) {
		event.output = output;
	}
	if (typeof outputPreview === "string" && outputPreview.length > 0) {
		event.outputPreview = outputPreview;
	}
	if (outputTruncated === true) {
		event.outputTruncated = true;
	}
	if (typeof outputBytes === "number" && Number.isFinite(outputBytes)) {
		event.outputBytes = outputBytes;
	}
	if (suppressedRawOutput === true) {
		event.suppressedRawOutput = true;
	}
	if (typeof errorText === "string" && errorText.trim()) {
		event.errorText = errorText.trim();
	}

	return event;
}

/**
 * Streams a message through RovoDev Serve, calling `onTextDelta` for each
 * text chunk — matching the same callback interface as
 * `streamBedrockGatewayManualSse` and `streamGoogleGatewayManualSse`.
 *
 * This is designed to be called *inside* the `createUIMessageStream`
 * execute function where widget-marker parsing, text buffering and
 * writer calls are already handled.
 *
 * If a 409 "chat already in progress" error occurs, the function retries with
 * bounded backoff and can optionally cancel the conflicting turn after a
 * short grace period.
 *
 * @param {object} params
 * @param {string} params.message - The full message to send to RovoDev
 * @param {function} params.onTextDelta - Called with each text delta string
 * @param {function} [params.onThinkingStatus] - Called when Rovo emits tool events that map to thinking status labels/content
 * @param {function} [params.onThinkingEvent] - Called with structured tool timeline events
 * @param {function} [params.onToolCallStart] - Called with structured tool-call details when a tool starts
 * @param {function} [params.onRetry] - Called when a 409 retry is about to happen (for UI indicators)
 * @param {function} [params.onRetryProgress] - Called for each 409 retry progress update
 * @param {number} [params.timeoutMs] - Max time to wait for chat-turn acquisition before timeout
 * @param {boolean} [params.cancelOnConflict] - Whether to cancel active turn on conflict instead of waiting
 * @param {number} [params.cancelAfterMs] - Grace period before starting conflict cancellation (0 means cancel immediately)
 * @param {AbortSignal} [params.signal] - Optional signal to abort the stream (e.g. on client disconnect)
 * @param {number} [params.port] - Explicit RovoDev port number for dedicated assignment
 * @param {number} [params.portIndex] - Sticky port index for dedicated assignment (e.g. multiports)
 * @param {(port: number) => void} [params.onPortAcquired] - Called once with the resolved port after acquisition
 * @returns {Promise<void>}
 */
async function streamViaRovoDev({
	message,
	onTextDelta,
	onThinkingStatus,
	onThinkingEvent,
	onToolCallStart,
	onRetry,
	onRetryProgress,
	timeoutMs = RETRY_TIMEOUT_MS,
	cancelOnConflict = true,
	cancelAfterMs = 0,
	signal,
	port,
	portIndex,
	onPortAcquired,
}) {
	const hasPinnedPort =
		(typeof port === "number" && port > 0) ||
		(typeof portIndex === "number" && portIndex >= 0);
	const handle = await acquirePort({
		timeoutMs: hasPinnedPort ? PINNED_PORT_ACQUIRE_TIMEOUT_MS : RETRY_TIMEOUT_MS,
		signal,
		port,
		portIndex,
	});

	if (typeof onPortAcquired === "function") {
		onPortAcquired(handle.port);
	}

	try {
		const attempt = (port) =>
			new Promise((resolve, reject) => {
				if (signal?.aborted) {
					resolve();
					return;
				}

				const toolNameByCallId = new Map();
				const streamHandle = sendMessageStreaming(message, {
					onChunk: (chunk) => {
						if (chunk.type === "text" && chunk.text) {
							onTextDelta(chunk.text);
							return;
						}

						if (chunk.type === "tool_call_start") {
							const resolvedToolName = normalizeToolName(chunk.toolName);
							if (chunk.toolCallId && resolvedToolName) {
								toolNameByCallId.set(chunk.toolCallId, resolvedToolName);
							}

							if (typeof onToolCallStart === "function") {
								onToolCallStart({
									toolName: resolvedToolName,
									toolCallId:
										typeof chunk.toolCallId === "string" && chunk.toolCallId.trim()
											? chunk.toolCallId.trim()
											: null,
									toolInput:
										chunk.toolInput && typeof chunk.toolInput === "object"
											? chunk.toolInput
											: null,
								});
							}

							if (typeof onThinkingStatus === "function") {
								onThinkingStatus(
									buildThinkingStatusFromToolEvent(resolvedToolName, "start")
								);
							}
							if (typeof onThinkingEvent === "function") {
								const toolInputPreview =
									chunk.toolInput !== undefined
										? toPreview(chunk.toolInput).text
										: undefined;
								const thinkingEvent = buildThinkingEventFromToolEvent({
									toolName: resolvedToolName,
									toolCallId: chunk.toolCallId,
									phase: "start",
									input: toolInputPreview,
								});
								if (thinkingEvent) {
									onThinkingEvent(thinkingEvent);
								}
							}
							return;
						}

						if (chunk.type === "tool_result" || chunk.type === "tool_error") {
							const rememberedToolName = chunk.toolCallId
								? toolNameByCallId.get(chunk.toolCallId) ?? null
								: null;
							const resolvedToolName = resolveToolNameForToolEvent({
								reportedToolName: chunk.toolName,
								rememberedToolName,
							});
							const outputPreview =
								typeof chunk.outputPreview === "string"
									? chunk.outputPreview
									: toPreview(chunk.text).text;
							const outputTruncated =
								chunk.outputTruncated === true ||
								outputPreview !== chunk.text;
							const outputBytes =
								typeof chunk.outputBytes === "number"
									? chunk.outputBytes
									: toPreview(chunk.text).bytes;

							if (chunk.toolCallId) {
								toolNameByCallId.delete(chunk.toolCallId);
							}

							if (typeof onThinkingStatus === "function") {
								onThinkingStatus(
									buildThinkingStatusFromToolEvent(
										resolvedToolName,
										chunk.type === "tool_error" ? "error" : "result"
									)
								);
							}
							if (typeof onThinkingEvent === "function") {
								const isToolError = chunk.type === "tool_error";
								const thinkingEvent = buildThinkingEventFromToolEvent({
									toolName: resolvedToolName,
									toolCallId: chunk.toolCallId,
									phase: isToolError ? "error" : "result",
									output: !isToolError ? outputPreview : undefined,
									outputPreview,
									outputTruncated,
									outputBytes,
									suppressedRawOutput: outputTruncated,
									errorText: isToolError ? outputPreview : undefined,
								});
								if (thinkingEvent) {
									onThinkingEvent(thinkingEvent);
								}
							}
						}
					},
					onDone: () => {
						resolve();
					},
					onError: (err) => {
						if (isChatInProgressError(err)) {
							reject(err);
							return;
						}
						console.error("[streamViaRovoDev] Error:", err.message);
						if (isPromptTooLongError(err)) {
							onTextDelta(
								`\n\nThis conversation has become too long for the model to process. Please start a new chat session to continue.`
							);
						} else {
							onTextDelta(`\n\n⚠️ RovoDev error: ${err.message}`);
						}
						resolve();
					},
				}, port);

				if (signal) {
					const onAbort = () => {
						streamHandle.abort();
						resolve();
					};

					if (signal.aborted) {
						streamHandle.abort();
						resolve();
					} else {
						signal.addEventListener("abort", onAbort, { once: true });
					}
				}
			});

		try {
			const { aborted } = await retryChatInProgress(
				() => attempt(handle.port),
				{
					signal,
					onRetry,
					onRetryProgress,
					logPrefix: "streamViaRovoDev",
					timeoutMs,
					cancelOnConflict,
					cancelAfterMs,
					port: handle.port,
				}
			);
			if (aborted) {
				return;
			}
		} catch (err) {
			if (isChatInProgressError(err)) {
				throw createChatInProgressTimeoutError(timeoutMs, {
					logPrefix: "streamViaRovoDev",
					retryCount:
						typeof err?.chatInProgressRetryCount === "number"
							? err.chatInProgressRetryCount
							: undefined,
					elapsedMs:
						typeof err?.chatInProgressElapsedMs === "number"
							? err.chatInProgressElapsedMs
							: undefined,
				});
			}
			throw err;
		}
	} finally {
		handle.release();
	}
}

/**
 * Non-streaming text generation via RovoDev Serve.
 *
 * Replaces `generateTextViaGateway()` for tasks like:
 * - Chat title generation
 * - Suggested questions
 * - Clarification question card generation
 *
 * Combines system + prompt into a single message since RovoDev
 * manages its own system prompt / context.
 *
 * @param {object} params
 * @param {string} [params.system] - System instructions
 * @param {string} params.prompt - The user prompt
 * @param {"cancel-and-retry" | "wait-for-turn"} [params.conflictPolicy]
 * @param {AbortSignal} [params.signal]
 * @returns {Promise<string>} The response text
 */
async function generateTextViaRovoDev({
	system,
	prompt,
	conflictPolicy = "cancel-and-retry",
	timeoutMs,
	signal,
}) {
	throwIfAborted(signal, "RovoDev text generation aborted");

	const waitForTurn = conflictPolicy === "wait-for-turn";
	const retryTimeoutMs =
		typeof timeoutMs === "number" && timeoutMs > 0
			? timeoutMs
			: waitForTurn
				? WAIT_FOR_TURN_TIMEOUT_MS
				: RETRY_TIMEOUT_MS;

	// Combine system + prompt since RovoDev takes a single message
	let fullMessage = "";
	if (system) {
		fullMessage += `[System Instructions]\n${system}\n[End System Instructions]\n\n`;
	}
	fullMessage += prompt;

	const handle = await acquirePort({
		timeoutMs: waitForTurn ? WAIT_FOR_TURN_TIMEOUT_MS : RETRY_TIMEOUT_MS,
		excludePinnedPorts: true,
		signal,
	});

	try {
		const syncOptions = {
			...(typeof timeoutMs === "number" && timeoutMs > 0 ? { timeoutMs } : {}),
			port: handle.port,
			signal,
		};

		if (_pool) {
			throwIfAborted(signal, "RovoDev text generation aborted");

			// Pool-exclusive port: cancel any lingering session, then send.
			//
			// IMPORTANT: Do NOT retry on the same port after a 409.
			// Each sendMessageSync call queues a message via set_chat_message,
			// compounding the stuck state and making the port unrecoverable.
			// Instead, throw immediately and let the finally block's async
			// recovery hold the port until it clears. Subsequent callers
			// waiting in acquirePort will get the port once it's released.
			const poolCancelOpts = { timeoutMs: 3_000 };

			// Pre-cancel to clear any stale session from a previous caller.
			try { await cancelChat(handle.port, poolCancelOpts); } catch {}
			await sleep(200, signal);

			const value = await sendMessageSync(fullMessage, syncOptions);
			return typeof value === "string" ? value : "";
		}

		// No pool — fall back to retry-on-409 + queue behavior
		const runGenerate = async () => {
			throwIfAborted(signal, "RovoDev text generation aborted");
			try {
				return await sendMessageSync(fullMessage, syncOptions);
			} catch (err) {
				if (isChatInProgressError(err)) {
					try {
							const { value, aborted } = await retryChatInProgress(
								() => sendMessageSync(fullMessage, syncOptions),
								{
									signal,
									logPrefix: "generateTextViaRovoDev",
									timeoutMs: retryTimeoutMs,
									cancelOnConflict: !waitForTurn,
									port: handle.port,
								}
							);
						if (aborted) {
							throw createAbortError("RovoDev text generation aborted");
						}
						return typeof value === "string" ? value : "";
					} catch (retryError) {
						if (waitForTurn && isChatInProgressError(retryError)) {
							throw createChatInProgressTimeoutError(retryTimeoutMs, {
								logPrefix: "generateTextViaRovoDev",
								retryCount:
									typeof retryError?.chatInProgressRetryCount === "number"
										? retryError.chatInProgressRetryCount
										: undefined,
								elapsedMs:
									typeof retryError?.chatInProgressElapsedMs === "number"
										? retryError.chatInProgressElapsedMs
										: undefined,
							});
						}
						throw retryError;
					}
				}
				throw err;
			}
		};

		if (conflictPolicy === "wait-for-turn") {
			return await enqueueTextGeneration(async () => {
				throwIfAborted(signal, "RovoDev text generation aborted");
				return runGenerate();
			}, {
				logPrefix: "generateTextViaRovoDev",
			});
		}

		return await runGenerate();
	} finally {
		// Cancel any lingering session before releasing the port back to the pool.
		// When an abort signal fires (e.g., classifier timeout) or an error occurs,
		// the RovoDev Serve instance on this port may still be processing the LLM
		// request. Without cancellation, the port is returned in a "chat in
		// progress" state that poisons subsequent acquirers with persistent 409s.
		if (_pool) {
			let cancelSucceeded = false;
			try {
				await cancelChat(handle.port, { timeoutMs: 3_000 });
				cancelSucceeded = true;
			} catch {}

			if (cancelSucceeded) {
				handle.release();
			} else {
				// Port is permanently stuck — cancel can't clear it.
				// Mark it unhealthy so the pool won't hand it to the next
				// acquirer (e.g., suggestion requests). The pool's periodic
				// health check (every 30s) will recover it once the process
				// is reachable again.
				const stuckPort = handle.port;
				console.warn(`[generateTextViaRovoDev] port ${stuckPort} stuck — marking unhealthy`);
				handle.releaseAsUnhealthy();

				// If a recovery callback is configured (process kill + supervisor
				// restart), fire it in the background for faster recovery.
				// Don't await — the port is already safely marked unhealthy.
				if (_recoverPort) {
					_recoverPort(stuckPort).then(
						(result) => {
							if (result.recovered) {
								console.info(`[generateTextViaRovoDev] recovery: port ${stuckPort} restarted successfully`);
							} else {
								console.warn(`[generateTextViaRovoDev] recovery: port ${stuckPort} failed: ${result.error}`);
							}
						},
						(err) => {
							console.warn(`[generateTextViaRovoDev] recovery: port ${stuckPort} error:`, err?.message);
						}
					);
				}
			}
		} else {
			handle.release();
		}
	}
}

module.exports = {
	streamViaRovoDev,
	generateTextViaRovoDev,
	isChatInProgressError,
	retryChatInProgress,
	shouldCancelConflictingTurn,
	isGenericIntegrationWrapperToolName,
	resolveToolNameForToolEvent,
	getThinkingActivityFromToolName,
	buildThinkingStatusFromToolEvent,
	initPool,
	setPinnedPortCount,
	setPortRecovery,
	WAIT_FOR_TURN_TIMEOUT_MS,
};
