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
const WAIT_FOR_TURN_TIMEOUT_MS = 600_000;

// ─── Pool integration ───────────────────────────────────────────────────────

/** @type {import("./rovodev-pool").Pool | null} */
let _pool = null;

/**
 * Inject the RovoDev port pool. Called once from server.js at startup.
 * @param {import("./rovodev-pool").Pool | null} pool
 */
function initPool(pool) {
	_pool = pool;
}

/**
 * Acquire a port handle. When a pool is available, delegates to pool.acquire().
 * Otherwise returns a dummy handle using the single env-var port.
 *
 * @param {object} [opts]
 * @param {number} [opts.timeoutMs]
 * @param {AbortSignal} [opts.signal]
 * @returns {Promise<{ port: number; release: () => void }>}
 */
async function acquirePort({ timeoutMs = 30_000, signal } = {}) {
	if (!_pool) {
		return { port: getRovoDevPort(), release: () => {} };
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
	return err && typeof err.message === "string" && err.message.includes("status 409");
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

/**
 * Retry an operation while RovoDev reports "chat already in progress" (409).
 * Uses short, bounded backoff delays so queued prompts start as soon as possible.
 *
 * @template T
 * @param {() => Promise<T>} operation
 * @param {object} params
 * @param {AbortSignal} [params.signal]
 * @param {function} [params.onRetry]
 * @param {string} params.logPrefix
 * @param {number} [params.timeoutMs]
 * @param {boolean} [params.cancelOnConflict]
 * @returns {Promise<{ aborted: boolean; value: T | undefined }>}
 */
async function retryChatInProgress(
	operation,
	{
		signal,
		onRetry,
		logPrefix,
		timeoutMs = RETRY_TIMEOUT_MS,
		cancelOnConflict = true,
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

			const waitMs = Math.min(retryDelayMs, RETRY_MAX_DELAY_MS, remainingMs);
			console.warn(
				cancelOnConflict
					? `[${logPrefix}] Chat already in progress (conflict ${conflictCount}) — cancelling and retrying in ${waitMs}ms...`
					: `[${logPrefix}] Chat already in progress (conflict ${conflictCount}) — waiting ${waitMs}ms before retrying...`
			);

			if (cancelOnConflict) {
				try {
					await cancelChat();
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

	if (phase === "start") {
		return {
			label: `Using ${toolLabel}`,
			content: `Invoking ${toolLabel}`,
		};
	}

	if (phase === "error") {
		return {
			label: resolvedToolName ? `${resolvedToolName} failed` : "Tool call failed",
			content: `Tool call failed: ${toolLabel}`,
		};
	}

	return {
		label: `Used ${toolLabel}`,
		content: `Completed ${toolLabel}`,
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
 * If a 409 "chat already in progress" error occurs, the function will
 * cancel the in-progress chat and retry quickly with bounded backoff.
 *
 * @param {object} params
 * @param {string} params.message - The full message to send to RovoDev
 * @param {function} params.onTextDelta - Called with each text delta string
 * @param {function} [params.onThinkingStatus] - Called when Rovo emits tool events that map to thinking status labels/content
 * @param {function} [params.onThinkingEvent] - Called with structured tool timeline events
 * @param {function} [params.onToolCallStart] - Called with structured tool-call details when a tool starts
 * @param {function} [params.onRetry] - Called when a 409 retry is about to happen (for UI indicators)
 * @param {AbortSignal} [params.signal] - Optional signal to abort the stream (e.g. on client disconnect)
 * @returns {Promise<void>}
 */
async function streamViaRovoDev({
	message,
	onTextDelta,
	onThinkingStatus,
	onThinkingEvent,
	onToolCallStart,
	onRetry,
	signal,
}) {
	const handle = await acquirePort({ timeoutMs: RETRY_TIMEOUT_MS, signal });

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

		if (_pool) {
			// With a pool we own the port exclusively — no retry needed
			await attempt(handle.port);
		} else {
			// No pool — fall back to retry-on-409 behavior
			try {
				const { aborted } = await retryChatInProgress(
					() => attempt(handle.port),
					{
						signal,
						onRetry,
						logPrefix: "streamViaRovoDev",
					}
				);
				if (aborted) {
					return;
				}
			} catch (err) {
				if (isChatInProgressError(err)) {
					throw createChatInProgressTimeoutError(RETRY_TIMEOUT_MS, {
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
 * @returns {Promise<string>} The response text
 */
async function generateTextViaRovoDev({
	system,
	prompt,
	conflictPolicy = "cancel-and-retry",
	timeoutMs,
}) {
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
	});

	try {
		const syncOptions = {
			...(typeof timeoutMs === "number" && timeoutMs > 0 ? { timeoutMs } : {}),
			port: handle.port,
		};

		if (_pool) {
			// With a pool we own the port exclusively — no retry/queue needed
			return await sendMessageSync(fullMessage, syncOptions);
		}

		// No pool — fall back to retry-on-409 + queue behavior
		const runGenerate = async () => {
			try {
				return await sendMessageSync(fullMessage, syncOptions);
			} catch (err) {
				if (isChatInProgressError(err)) {
					try {
						const { value } = await retryChatInProgress(
							() => sendMessageSync(fullMessage, syncOptions),
							{
								logPrefix: "generateTextViaRovoDev",
								timeoutMs: retryTimeoutMs,
								cancelOnConflict: !waitForTurn,
							}
						);
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
			return await enqueueTextGeneration(runGenerate, {
				logPrefix: "generateTextViaRovoDev",
			});
		}

		return await runGenerate();
	} finally {
		handle.release();
	}
}

module.exports = {
	streamViaRovoDev,
	generateTextViaRovoDev,
	isChatInProgressError,
	isGenericIntegrationWrapperToolName,
	resolveToolNameForToolEvent,
	initPool,
	WAIT_FOR_TURN_TIMEOUT_MS,
};
