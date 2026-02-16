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

const { sendMessageStreaming, sendMessageSync } = require("./rovodev-client");

/**
 * Streams a message through RovoDev Serve, calling `onTextDelta` for each
 * text chunk — matching the same callback interface as
 * `streamBedrockGatewayManualSse` and `streamGoogleGatewayManualSse`.
 *
 * This is designed to be called *inside* the `createUIMessageStream`
 * execute function where widget-marker parsing, text buffering and
 * writer calls are already handled.
 *
 * @param {object} params
 * @param {string} params.message - The full message to send to RovoDev
 * @param {function} params.onTextDelta - Called with each text delta string
 * @returns {Promise<void>}
 */
async function streamViaRovoDev({ message, onTextDelta }) {
	await new Promise((resolve, reject) => {
		sendMessageStreaming(message, {
			onChunk: (chunk) => {
				if (chunk.type === "text" && chunk.text) {
					onTextDelta(chunk.text);
				}
				// Tool events from RovoDev — RovoDev handles tool calls internally.
				// The LLM response text that follows the tool result is what gets
				// streamed to the user through subsequent text chunks.
			},
			onDone: () => {
				resolve();
			},
			onError: (err) => {
				console.error("[streamViaRovoDev] Error:", err.message);
				// Emit the error as text so the user sees it in the chat
				onTextDelta(`\n\n⚠️ RovoDev error: ${err.message}`);
				resolve(); // resolve rather than reject so the stream closes cleanly
			},
		});
	});
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

	const text = await sendMessageSync(fullMessage);
	return text;
}

module.exports = {
	streamViaRovoDev,
	generateTextViaRovoDev,
};
