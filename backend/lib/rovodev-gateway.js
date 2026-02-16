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

const RETRY_DELAY_MS = 10_000;

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
 * @returns {Promise<void>}
 */
function sleep(ms) {
	return new Promise((resolve) => setTimeout(resolve, ms));
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
 * cancel the in-progress chat, wait 10 seconds, and retry once.
 *
 * @param {object} params
 * @param {string} params.message - The full message to send to RovoDev
 * @param {function} params.onTextDelta - Called with each text delta string
 * @param {function} [params.onThinkingStatus] - Called when Rovo emits tool events that map to thinking status labels/content
 * @param {function} [params.onRetry] - Called when a 409 retry is about to happen (for UI indicators)
 * @returns {Promise<void>}
 */
async function streamViaRovoDev({
	message,
	onTextDelta,
	onThinkingStatus,
	onRetry,
}) {
	/**
	 * @param {boolean} isRetry
	 */
	const attempt = (isRetry) =>
		new Promise((resolve, reject) => {
			const toolNameByCallId = new Map();
			sendMessageStreaming(message, {
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
					if (!isRetry && isChatInProgressError(err)) {
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
		});

	try {
		await attempt(false);
	} catch (err) {
		if (isChatInProgressError(err)) {
			console.warn("[streamViaRovoDev] Chat already in progress — cancelling and retrying in 10s...");
			if (typeof onRetry === "function") {
				onRetry();
			}
			try {
				await cancelChat();
			} catch {
				// Ignore cancel errors — the chat may have finished on its own
			}
			await sleep(RETRY_DELAY_MS);
			await attempt(true);
		} else {
			throw err;
		}
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
 * @returns {Promise<string>} The response text
 */
async function generateTextViaRovoDev({ system, prompt }) {
	// Combine system + prompt since RovoDev takes a single message
	let fullMessage = "";
	if (system) {
		fullMessage += `[System Instructions]\n${system}\n[End System Instructions]\n\n`;
	}
	fullMessage += prompt;

	try {
		return await sendMessageSync(fullMessage);
	} catch (err) {
		if (isChatInProgressError(err)) {
			console.warn("[generateTextViaRovoDev] Chat already in progress — cancelling and retrying in 10s...");
			try {
				await cancelChat();
			} catch {
				// Ignore cancel errors — the chat may have finished on its own
			}
			await sleep(RETRY_DELAY_MS);
			return await sendMessageSync(fullMessage);
		}
		throw err;
	}
}

module.exports = {
	streamViaRovoDev,
	generateTextViaRovoDev,
};
