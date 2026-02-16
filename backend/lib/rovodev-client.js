/**
 * RovoDev Serve Mode API client.
 *
 * Communicates with a locally running `rovodev serve <port>` instance
 * using the V3 REST + SSE API.
 *
 * Key endpoints used:
 *   POST /v3/set_chat_message  — queue a message for processing
 *   GET  /v3/stream_chat       — execute the queued message and stream response (SSE)
 *   GET  /v3/status            — get agent status and session info
 *   GET  /healthcheck          — server health
 *   POST /v3/cancel            — cancel ongoing operation
 */

const http = require("http");

// ─── Configuration ───────────────────────────────────────────────────────────

const DEFAULT_PORT = 8000;

function getPort() {
	const envPort = process.env.ROVODEV_PORT;
	if (envPort) {
		const parsed = parseInt(envPort, 10);
		if (!isNaN(parsed) && parsed > 0) {
			return parsed;
		}
	}
	return DEFAULT_PORT;
}

function getBaseUrl() {
	return `http://127.0.0.1:${getPort()}`;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Extract structured content from an SSE event, handling the Rovo Dev event format.
 *
 * Rovo Dev V3 stream_chat uses these event types:
 *   - "user-prompt"         → echo of user input (skip)
 *   - "part_start"          → first chunk; text in parsed.part.content, or tool call
 *   - "part_delta"          → subsequent chunks; text delta or tool call args delta
 *   - "on_call_tools_start" → tool execution begins
 *   - "retry-prompt"        → tool result/error feedback
 *   - "request-usage"       → token usage stats (skip)
 *   - "close"               → stream end (skip)
 *
 * Returns { type, text, toolName?, toolCallId? } or null if the event should be skipped.
 */
function extractChunkFromEvent(eventName, parsed) {
	// Events to skip entirely
	const skipEvents = [
		"user-prompt", "request-usage", "close", "done", "end",
		"ping", "heartbeat", "keep-alive", "keepalive",
		"message_start", "content_block_start", "content_block_stop",
		"status", "usage",
		"run_start", "run_end", "agent_run_start", "agent_run_end",
		"message_complete", "message_stop", "complete", "message_end",
	];

	if (skipEvents.includes(eventName)) {
		return null;
	}

	// ── Tool call / tool result events ──────────────────────────────────

	if (eventName === "on_call_tools_start") {
		const parts = parsed?.parts || [];
		if (parts.length > 0) {
			const part = parts[0];
			let toolName = part?.tool_name || "unknown";
			let args = "";
			try {
				const parsedArgs = typeof part?.args === "string" ? JSON.parse(part.args) : part?.args;
				toolName = parsedArgs?.tool_name || toolName;
				args = JSON.stringify(parsedArgs, null, 2);
			} catch {
				args = part?.args || "";
			}
			return {
				type: "tool_call_start",
				text: args,
				toolName,
				toolCallId: part?.tool_call_id,
			};
		}
		return null;
	}

	if (eventName === "retry-prompt" || eventName === "tool-return") {
		const rawContent = parsed?.content ?? "";
		const content = typeof rawContent === "string" ? rawContent : JSON.stringify(rawContent, null, 2);
		const toolName = parsed?.tool_name || "";
		const toolCallId = parsed?.tool_call_id || "";
		const isError = content.toLowerCase().includes("error");
		return {
			type: isError ? "tool_error" : "tool_result",
			text: content,
			toolName,
			toolCallId,
		};
	}

	if (eventName === "tool_use" || eventName === "tool_result") {
		return null;
	}

	// ── Part start ──────────────────────────────────────────────────────

	if (eventName === "part_start") {
		const partKind = parsed?.part?.part_kind;

		if (partKind === "tool-call") {
			return {
				type: "tool_call_start",
				text: "",
				toolName: parsed?.part?.tool_name || "unknown",
				toolCallId: parsed?.part?.tool_call_id,
			};
		}

		const text = parsed?.part?.content ?? "";
		return text ? { type: "text", text } : null;
	}

	// ── Part delta ──────────────────────────────────────────────────────

	if (eventName === "part_delta") {
		const deltaKind = parsed?.delta?.part_delta_kind;

		if (deltaKind === "tool_call") {
			const argsDelta = parsed?.delta?.args_delta ?? "";
			return argsDelta ? {
				type: "tool_call_args",
				text: argsDelta,
				toolCallId: parsed?.delta?.tool_call_id,
			} : null;
		}

		const text = parsed?.delta?.content_delta ?? "";
		return text ? { type: "text", text } : null;
	}

	// ── Fallback for unknown events ─────────────────────────────────────

	const rawText =
		parsed?.text ??
		parsed?.content ??
		parsed?.delta?.text ??
		parsed?.delta?.content ??
		parsed?.message?.content ??
		parsed?.choices?.[0]?.delta?.content ??
		"";

	const text = typeof rawText === "string" ? rawText : JSON.stringify(rawText, null, 2);
	return text ? { type: "text", text } : null;
}

/**
 * Make a JSON request to the RovoDev serve API.
 */
function request(method, path, body, timeoutMs = 10000) {
	return new Promise((resolve, reject) => {
		const url = new URL(path, getBaseUrl());
		const options = {
			hostname: url.hostname,
			port: url.port,
			path: url.pathname,
			method,
			headers: {
				"Content-Type": "application/json",
				"Accept": "application/json",
			},
			timeout: timeoutMs,
		};

		const req = http.request(options, (res) => {
			let data = "";
			res.on("data", (chunk) => (data += chunk));
			res.on("end", () => resolve({ status: res.statusCode || 0, data }));
		});

		req.on("timeout", () => {
			req.destroy();
			reject(new Error("Request timed out"));
		});
		req.on("error", (err) => {
			reject(new Error(`RovoDev connection failed: ${err.message}. Is "rovodev serve" running on port ${getPort()}?`));
		});

		if (body) {
			req.write(JSON.stringify(body));
		}
		req.end();
	});
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Check if RovoDev serve is running and healthy.
 */
async function healthCheck() {
	const { status, data } = await request("GET", "/healthcheck");
	if (status !== 200) {
		throw new Error(`Health check failed with status ${status}: ${data}`);
	}
	return JSON.parse(data);
}

/**
 * Get the current agent status.
 */
async function getStatus() {
	const { status, data } = await request("GET", "/v3/status");
	if (status !== 200) {
		throw new Error(`Status check failed: ${data}`);
	}
	return JSON.parse(data);
}

/**
 * Send a message and stream the response via SSE.
 *
 * Uses the V3 two-step pattern:
 *   1. POST /v3/set_chat_message to queue the message
 *   2. GET /v3/stream_chat to stream the response
 *
 * @param {string} message - The message to send
 * @param {object} callbacks
 * @param {function} callbacks.onChunk - Called for each structured chunk { type, text, toolName?, toolCallId? }
 * @param {function} callbacks.onDone - Called when complete with full text
 * @param {function} callbacks.onError - Called on error
 * @param {function} [callbacks.onEvent] - Optional raw SSE event callback
 * @returns {{ abort: () => void }}
 */
function sendMessageStreaming(message, callbacks) {
	let aborted = false;
	let currentReq = null;

	const run = async () => {
		try {
			// Step 1: Queue the message
			console.log("[rovodev] Queuing message via /v3/set_chat_message...");
			const { status: setStatus, data: setData } = await request(
				"POST",
				"/v3/set_chat_message",
				{ message },
				30000
			);
			if (setStatus !== 200) {
				throw new Error(`Failed to queue message (status ${setStatus}): ${setData}`);
			}
			console.log("[rovodev] Message queued successfully.");

			if (aborted) return;

			// Step 2: Stream the response via SSE
			console.log("[rovodev] Opening SSE stream via /v3/stream_chat...");
			const url = new URL("/v3/stream_chat", getBaseUrl());
			let fullText = "";

			await new Promise((resolve, reject) => {
				const options = {
					hostname: url.hostname,
					port: url.port,
					path: url.pathname,
					method: "GET",
					headers: {
						"Accept": "text/event-stream",
						"Cache-Control": "no-cache",
						"Connection": "keep-alive",
					},
				};

				currentReq = http.request(options, (res) => {
					// Disable socket timeout for the SSE stream
					if (res.socket) {
						res.socket.setTimeout(0);
					}

					if (res.statusCode !== 200) {
						let errData = "";
						res.on("data", (chunk) => (errData += chunk));
						res.on("end", () => reject(new Error(`Stream failed (status ${res.statusCode}): ${errData}`)));
						return;
					}
					console.log("[rovodev] SSE stream connected, waiting for events...");

					let buffer = "";

					res.on("data", (chunk) => {
						if (aborted) return;

						buffer += chunk.toString();

						const lines = buffer.split("\n");
						buffer = lines.pop() ?? "";

						let currentEvent = "";
						for (const line of lines) {
							if (line.startsWith("event: ")) {
								currentEvent = line.slice(7).trim();
							} else if (line.startsWith("data: ")) {
								const rawData = line.slice(6);

								if (callbacks.onEvent) {
									callbacks.onEvent(currentEvent, rawData);
								}

								try {
									const parsed = JSON.parse(rawData);
									const chunk = extractChunkFromEvent(currentEvent, parsed);

									if (chunk !== null) {
										if (chunk.type === "text") {
											fullText += chunk.text;
										}
										callbacks.onChunk(chunk);
									} else if (currentEvent === "error" || currentEvent === "exception") {
										reject(new Error(parsed.message ?? parsed.error ?? JSON.stringify(parsed)));
										return;
									}
								} catch {
									// Not JSON — treat raw data as text for text-like events
									if (rawData && (currentEvent === "text_delta" || currentEvent === "content_block_delta")) {
										fullText += rawData;
										callbacks.onChunk({ type: "text", text: rawData });
									}
								}
								currentEvent = "";
							} else if (line.trim() === "") {
								currentEvent = "";
							}
						}
					});

					res.on("end", () => {
						resolve();
					});

					res.on("error", (err) => {
						reject(err);
					});
				});

				// Disable request-level timeout for SSE
				currentReq.setTimeout(0);

				currentReq.on("error", (err) => {
					reject(new Error(`SSE connection failed: ${err.message}`));
				});

				currentReq.end();
			});

			if (!aborted) {
				console.log(`[rovodev] Stream complete. Response length: ${fullText.length}`);
				callbacks.onDone(fullText);
			}
		} catch (err) {
			if (!aborted) {
				console.error("[rovodev] Stream error:", err);
				callbacks.onError(err instanceof Error ? err : new Error(String(err)));
			}
		}
	};

	run();

	return {
		abort: () => {
			aborted = true;
			if (currentReq) {
				currentReq.destroy();
			}
			// Also try to cancel on the server side
			request("POST", "/v3/cancel").catch(() => {
				// Ignore cancel errors
			});
		},
	};
}

/**
 * Send a message and collect the full response (non-streaming).
 * Useful for background tasks like title generation, suggested questions, etc.
 *
 * @param {string} message - The message to send
 * @returns {Promise<string>} The full response text
 */
function sendMessageSync(message) {
	return new Promise((resolve, reject) => {
		let fullText = "";
		sendMessageStreaming(message, {
			onChunk: (chunk) => {
				if (chunk.type === "text") {
					fullText += chunk.text;
				}
			},
			onDone: (text) => {
				resolve(text || fullText);
			},
			onError: (err) => {
				reject(err);
			},
		});
	});
}

/**
 * Cancel an ongoing chat operation.
 */
async function cancelChat() {
	await request("POST", "/v3/cancel");
}

/**
 * Get the configured RovoDev port.
 */
function getRovoDevPort() {
	return getPort();
}

module.exports = {
	healthCheck,
	getStatus,
	sendMessageStreaming,
	sendMessageSync,
	cancelChat,
	getRovoDevPort,
	extractChunkFromEvent,
};
