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

const { sendMessageStreaming, sendMessageSync, cancelChat } = require("./rovodev-client");

const RETRY_INITIAL_DELAY_MS = 250;
const RETRY_DELAY_STEP_MS = 250;
const RETRY_MAX_DELAY_MS = 1_000;
const RETRY_TIMEOUT_MS = 10_000;
const WAIT_FOR_TURN_TIMEOUT_MS = 120_000;

let queuedTextGenerationTail = Promise.resolve();

/**
 * Check whether an error is a 409 "chat already in progress" conflict.
 * @param {Error} err
 * @returns {boolean}
 */
function isChatInProgressError(err) {
	return err && typeof err.message === "string" && err.message.includes("status 409");
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
	const deadlineMs = Date.now() + timeoutMs;
	let retryDelayMs = RETRY_INITIAL_DELAY_MS;
	let retryNotified = false;

	while (true) {
		if (signal?.aborted) {
			return { aborted: true, value: undefined };
		}

		try {
			const value = await operation();
			return { aborted: false, value };
		} catch (err) {
			if (!isChatInProgressError(err)) {
				throw err;
			}

			const remainingMs = deadlineMs - Date.now();
			if (remainingMs <= 0) {
				throw err;
			}

			if (!retryNotified && typeof onRetry === "function") {
				retryNotified = true;
				onRetry();
			}

			const waitMs = Math.min(retryDelayMs, RETRY_MAX_DELAY_MS, remainingMs);
			console.warn(
				cancelOnConflict
					? `[${logPrefix}] Chat already in progress — cancelling and retrying in ${waitMs}ms...`
					: `[${logPrefix}] Chat already in progress — waiting ${waitMs}ms before retrying...`
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
 * Enqueue non-streaming text generation calls so only one RovoDev request runs
 * at a time for callers that require deterministic execution ordering.
 *
 * @template T
 * @param {() => Promise<T>} operation
 * @returns {Promise<T>}
 */
function enqueueTextGeneration(operation) {
	const queuedTask = queuedTextGenerationTail.then(() => operation());
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
 * @param {function} [params.onToolCallStart] - Called with structured tool-call details when a tool starts
 * @param {function} [params.onRetry] - Called when a 409 retry is about to happen (for UI indicators)
 * @param {AbortSignal} [params.signal] - Optional signal to abort the stream (e.g. on client disconnect)
 * @returns {Promise<void>}
 */
async function streamViaRovoDev({
	message,
	onTextDelta,
	onThinkingStatus,
	onToolCallStart,
	onRetry,
	signal,
}) {
	const attempt = () =>
		new Promise((resolve, reject) => {
			if (signal?.aborted) {
				resolve();
				return;
			}

			const toolNameByCallId = new Map();
			const handle = sendMessageStreaming(message, {
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
						return;
					}

					if (chunk.type === "tool_result" || chunk.type === "tool_error") {
						const rememberedToolName = chunk.toolCallId
							? toolNameByCallId.get(chunk.toolCallId) ?? null
							: null;
						const resolvedToolName =
							normalizeToolName(chunk.toolName) ?? rememberedToolName;

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
					}
				},
				onDone: () => {
					resolve();
				},
				onError: (err) => {
					if (isChatInProgressError(err)) {
						// Bubble up so the outer handler can retry
						reject(err);
						return;
					}
					console.error("[streamViaRovoDev] Error:", err.message);
					// Emit the error as text so the user sees it in the chat
					onTextDelta(`\n\n⚠️ RovoDev error: ${err.message}`);
					resolve(); // resolve rather than reject so the stream closes cleanly
				},
			});

			// Wire the abort signal to the streaming handle
			if (signal) {
				const onAbort = () => {
					handle.abort();
					resolve();
				};

				if (signal.aborted) {
					handle.abort();
					resolve();
				} else {
					signal.addEventListener("abort", onAbort, { once: true });
				}
			}
		});

	try {
		const { aborted } = await retryChatInProgress(attempt, {
			signal,
			onRetry,
			logPrefix: "streamViaRovoDev",
		});
		if (aborted) {
			return;
		}
	} catch (err) {
		if (isChatInProgressError(err)) {
			onTextDelta(
				`\\n\\n⚠️ RovoDev is still finishing the previous response after ${Math.ceil(RETRY_TIMEOUT_MS / 1000)} seconds. Please try again.`
			);
			return;
		}
		throw err;
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
}) {
	// Combine system + prompt since RovoDev takes a single message
	let fullMessage = "";
	if (system) {
		fullMessage += `[System Instructions]\n${system}\n[End System Instructions]\n\n`;
	}
	fullMessage += prompt;

	const runGenerate = async () => {
		try {
			return await sendMessageSync(fullMessage);
		} catch (err) {
			if (isChatInProgressError(err)) {
				const waitForTurn = conflictPolicy === "wait-for-turn";
				try {
					const { value } = await retryChatInProgress(
						() => sendMessageSync(fullMessage),
						{
							logPrefix: "generateTextViaRovoDev",
							timeoutMs: waitForTurn ? WAIT_FOR_TURN_TIMEOUT_MS : RETRY_TIMEOUT_MS,
							cancelOnConflict: !waitForTurn,
						}
					);
					return typeof value === "string" ? value : "";
				} catch (retryError) {
					if (waitForTurn && isChatInProgressError(retryError)) {
						console.warn(
							"[generateTextViaRovoDev] wait-for-turn timed out; falling back to cancel-and-retry."
						);
						const { value } = await retryChatInProgress(
							() => sendMessageSync(fullMessage),
							{
								logPrefix: "generateTextViaRovoDev",
								timeoutMs: RETRY_TIMEOUT_MS,
								cancelOnConflict: true,
							}
						);
						return typeof value === "string" ? value : "";
					}
					throw retryError;
				}
			}
			throw err;
		}
	};

	if (conflictPolicy === "wait-for-turn") {
		return enqueueTextGeneration(runGenerate);
	}

	return runGenerate();
}

module.exports = {
	streamViaRovoDev,
	generateTextViaRovoDev,
};
