const assert = require("node:assert/strict");
const test = require("node:test");
const WebSocket = require("ws");

const {
	RealtimeSession,
	ROVO_SYSTEM_INSTRUCTIONS,
	SESSION_STATE,
} = require("./openai-realtime");

function createReadySession() {
	const openaiMessages = [];
	const logEntries = [];
	const clientWs = {
		readyState: WebSocket.OPEN,
		send() {},
	};
	const session = new RealtimeSession(clientWs, {
		onLog: (scope, message) => {
			logEntries.push({ scope, message });
		},
	});

	session._state = SESSION_STATE.READY;
	session._openaiWs = {
		readyState: WebSocket.OPEN,
		send(payload) {
			openaiMessages.push(JSON.parse(payload));
		},
	};

	return {
		session,
		openaiMessages,
		logEntries,
	};
}

function assertSystemMessage(openaiMessage, expectedText) {
	assert.equal(openaiMessage.type, "conversation.item.create");
	assert.equal(openaiMessage.item?.type, "message");
	assert.equal(openaiMessage.item?.role, "system");
	assert.equal(openaiMessage.item?.content?.[0]?.type, "input_text");
	assert.equal(openaiMessage.item?.content?.[0]?.text, expectedText);
}

test("system instructions include artifact annotation guidance", () => {
	assert.match(
		ROVO_SYSTEM_INSTRUCTIONS,
		/artifact annotations are provided as system context/iu,
	);
});

test("accepts initial_context injections", () => {
	const { session, openaiMessages, logEntries } = createReadySession();

	session._handleContextInject({
		type: "context_inject",
		data: {
			type: "initial_context",
			content: "Initial voice context",
		},
	});

	assert.equal(openaiMessages.length, 1);
	assertSystemMessage(openaiMessages[0], "Initial voice context");
	assert.deepEqual(logEntries.at(-1), {
		scope: "REALTIME",
		message: "Context injected: initial_context",
	});
});

test("accepts thread_context injections", () => {
	const { session, openaiMessages, logEntries } = createReadySession();

	session._handleContextInject({
		type: "context_inject",
		data: {
			type: "thread_context",
			summary: "User asked to refine the active artifact.",
		},
	});

	assert.equal(openaiMessages.length, 1);
	assertSystemMessage(
		openaiMessages[0],
		"User asked to refine the active artifact.",
	);
	assert.deepEqual(logEntries.at(-1), {
		scope: "REALTIME",
		message: "Context injected: thread_context",
	});
});

test("accepts artifact_annotations injections", () => {
	const { session, openaiMessages, logEntries } = createReadySession();
	const annotationContext = [
		"[Artifact Annotations]",
		"Artifact kind: code",
		"",
		"#1: \"Make this larger\"",
	].join("\n");

	session._handleContextInject({
		type: "context_inject",
		data: {
			type: "artifact_annotations",
			content: annotationContext,
		},
	});

	assert.equal(openaiMessages.length, 1);
	assertSystemMessage(openaiMessages[0], annotationContext);
	assert.deepEqual(logEntries.at(-1), {
		scope: "REALTIME",
		message: "Context injected: artifact_annotations",
	});
});

test("unknown context types log and no-op", () => {
	const { session, openaiMessages, logEntries } = createReadySession();

	session._handleContextInject({
		type: "context_inject",
		data: {
			type: "unsupported_context",
			content: "Ignored",
		},
	});

	assert.equal(openaiMessages.length, 0);
	assert.deepEqual(logEntries.at(-1), {
		scope: "REALTIME",
		message: "Unknown context_inject contextType: unsupported_context",
	});
});
