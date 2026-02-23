const { describe, it } = require("node:test");
const assert = require("node:assert/strict");

const {
	shouldGateToolFirstQuestionCard,
	buildToolFirstQuestionCardPayload,
	buildToolFirstClarificationInstruction,
} = require("./tool-first-question-gate");
const { resolveToolFirstPolicy } = require("./tool-first-genui-policy");

const SKIP_SOURCES = new Set(["clarification-submit"]);

describe("shouldGateToolFirstQuestionCard", () => {
	it("should NOT gate when policy is not matched", () => {
		const policy = resolveToolFirstPolicy({ prompt: "Tell me a joke" });
		const result = shouldGateToolFirstQuestionCard({
			prompt: "Tell me a joke",
			toolFirstPolicy: policy,
			latestUserMessageSource: "user",
			gateSkipSources: SKIP_SOURCES,
		});
		assert.equal(result.shouldGate, false);
		assert.equal(result.unsatisfiedHints.length, 0);
	});

	it("should NOT gate when source is clarification-submit", () => {
		const policy = resolveToolFirstPolicy({ prompt: "Send a Slack message" });
		const result = shouldGateToolFirstQuestionCard({
			prompt: "Send a Slack message",
			toolFirstPolicy: policy,
			latestUserMessageSource: "clarification-submit",
			gateSkipSources: SKIP_SOURCES,
		});
		assert.equal(result.shouldGate, false);
	});

	it("should gate when prompt is missing all required context for Slack", () => {
		const prompt = "Send a Slack message";
		const policy = resolveToolFirstPolicy({ prompt });
		const result = shouldGateToolFirstQuestionCard({
			prompt,
			toolFirstPolicy: policy,
			latestUserMessageSource: "user",
			gateSkipSources: SKIP_SOURCES,
		});
		assert.equal(result.shouldGate, true);
		assert.ok(result.unsatisfiedHints.length >= 2);
		const hintIds = result.unsatisfiedHints.map((h) => h.id);
		assert.ok(hintIds.includes("channel"));
		assert.ok(hintIds.includes("message-content"));
	});

	it("should NOT gate when prompt has full context for Slack", () => {
		const prompt = 'Send "hello world" to #general on Slack';
		const policy = resolveToolFirstPolicy({ prompt });
		const result = shouldGateToolFirstQuestionCard({
			prompt,
			toolFirstPolicy: policy,
			latestUserMessageSource: "user",
			gateSkipSources: SKIP_SOURCES,
		});
		assert.equal(result.shouldGate, false);
	});

	it("should gate with partial context (has channel but no message)", () => {
		const prompt = "Send a message to #general on Slack";
		const policy = resolveToolFirstPolicy({ prompt });
		const result = shouldGateToolFirstQuestionCard({
			prompt,
			toolFirstPolicy: policy,
			latestUserMessageSource: "user",
			gateSkipSources: SKIP_SOURCES,
		});
		assert.equal(result.shouldGate, true);
		const hintIds = result.unsatisfiedHints.map((h) => h.id);
		assert.ok(!hintIds.includes("channel"), "channel should be satisfied");
		assert.ok(hintIds.includes("message-content"), "message-content should be unsatisfied");
	});

	it("should NOT gate for read-only prompt to gated domain", () => {
		const prompt = "Check my Slack channels";
		const policy = resolveToolFirstPolicy({ prompt });
		const result = shouldGateToolFirstQuestionCard({
			prompt,
			toolFirstPolicy: policy,
			latestUserMessageSource: "user",
			gateSkipSources: SKIP_SOURCES,
		});
		assert.equal(result.shouldGate, false);
	});

	it("should NOT gate for domain with no hints (e.g. bitbucket)", () => {
		const prompt = "Show my Bitbucket pull requests";
		const policy = resolveToolFirstPolicy({ prompt });
		const result = shouldGateToolFirstQuestionCard({
			prompt,
			toolFirstPolicy: policy,
			latestUserMessageSource: "user",
			gateSkipSources: SKIP_SOURCES,
		});
		assert.equal(result.shouldGate, false);
	});

	it("should gate for Confluence page creation without context", () => {
		const prompt = "Create a Confluence page";
		const policy = resolveToolFirstPolicy({ prompt });
		const result = shouldGateToolFirstQuestionCard({
			prompt,
			toolFirstPolicy: policy,
			latestUserMessageSource: "user",
			gateSkipSources: SKIP_SOURCES,
		});
		assert.equal(result.shouldGate, true);
		const hintIds = result.unsatisfiedHints.map((h) => h.id);
		assert.ok(hintIds.includes("space"));
		assert.ok(hintIds.includes("page-title"));
	});

	it("should gate for Jira issue creation without context", () => {
		const prompt = "Create a Jira issue";
		const policy = resolveToolFirstPolicy({ prompt });
		const result = shouldGateToolFirstQuestionCard({
			prompt,
			toolFirstPolicy: policy,
			latestUserMessageSource: "user",
			gateSkipSources: SKIP_SOURCES,
		});
		assert.equal(result.shouldGate, true);
		const hintIds = result.unsatisfiedHints.map((h) => h.id);
		assert.ok(hintIds.includes("project"));
		assert.ok(hintIds.includes("summary"));
	});

	it("should gate for Google Calendar meeting creation without context", () => {
		const prompt = "Schedule a meeting on Google Calendar";
		const policy = resolveToolFirstPolicy({ prompt });
		const result = shouldGateToolFirstQuestionCard({
			prompt,
			toolFirstPolicy: policy,
			latestUserMessageSource: "user",
			gateSkipSources: SKIP_SOURCES,
		});
		assert.equal(result.shouldGate, true);
		const hintIds = result.unsatisfiedHints.map((h) => h.id);
		assert.ok(hintIds.includes("attendees"));
		assert.ok(hintIds.includes("time"));
	});

	it("should gate for generic figma design-context request with missing file and goal", () => {
		const prompt = "Get Figma design context";
		const policy = resolveToolFirstPolicy({ prompt });
		const result = shouldGateToolFirstQuestionCard({
			prompt,
			toolFirstPolicy: policy,
			latestUserMessageSource: "user",
			gateSkipSources: SKIP_SOURCES,
		});
		assert.equal(result.shouldGate, true);
		const hintIds = result.unsatisfiedHints.map((h) => h.id);
		assert.ok(hintIds.includes("figma-file"));
		assert.ok(hintIds.includes("figma-goal"));
	});

	it("should gate for figma prompt when file is present but goal is missing", () => {
		const prompt =
			"Get Figma design context from https://figma.com/design/abc123/My-File?node-id=1-2";
		const policy = resolveToolFirstPolicy({ prompt });
		const result = shouldGateToolFirstQuestionCard({
			prompt,
			toolFirstPolicy: policy,
			latestUserMessageSource: "user",
			gateSkipSources: SKIP_SOURCES,
		});
		assert.equal(result.shouldGate, true);
		const hintIds = result.unsatisfiedHints.map((h) => h.id);
		assert.ok(!hintIds.includes("figma-file"), "figma-file should be satisfied");
		assert.ok(hintIds.includes("figma-goal"), "figma-goal should be unsatisfied");
	});

	it("should NOT gate figma prompt when file and goal are both present", () => {
		const prompt =
			"Generate implementation code from https://figma.com/design/abc123/My-File?node-id=1-2";
		const policy = resolveToolFirstPolicy({ prompt });
		const result = shouldGateToolFirstQuestionCard({
			prompt,
			toolFirstPolicy: policy,
			latestUserMessageSource: "user",
			gateSkipSources: SKIP_SOURCES,
		});
		assert.equal(result.shouldGate, false);
	});
});

describe("buildToolFirstQuestionCardPayload", () => {
	it("returns null when unsatisfiedHints is empty", () => {
		const result = buildToolFirstQuestionCardPayload({
			unsatisfiedHints: [],
			domainLabels: ["Slack"],
			sessionId: "test-session",
		});
		assert.equal(result, null);
	});

	it("returns valid payload with correct structure", () => {
		const result = buildToolFirstQuestionCardPayload({
			unsatisfiedHints: [
				{
					id: "channel",
					label: "Which channel or person?",
					description: "Specify the Slack channel or person to message.",
					suggestedOptions: [
						{ id: "general", label: "#general" },
						{ id: "random", label: "#random" },
					],
				},
				{
					id: "message-content",
					label: "What should the message say?",
					description: "Specify the content of the message.",
					suggestedOptions: [
						{ id: "specify", label: "I'll type the message" },
					],
				},
			],
			domainLabels: ["Slack"],
			sessionId: "test-session-123",
		});

		assert.ok(result !== null);
		assert.equal(result.type, "question-card");
		assert.equal(result.title, "Before I use Slack...");
		assert.equal(result.description, "Answer these so I can execute the right action.");
		assert.equal(result.sessionId, "test-session-123");
		assert.equal(result.questions.length, 2);
		assert.equal(result.questions[0].id, "channel");
		assert.equal(result.questions[0].label, "Which channel or person?");
		assert.equal(result.questions[0].options.length, 2);
		assert.equal(result.questions[1].id, "message-content");
	});

	it("handles multiple domain labels", () => {
		const result = buildToolFirstQuestionCardPayload({
			unsatisfiedHints: [
				{
					id: "channel",
					label: "Which channel?",
					suggestedOptions: [],
				},
			],
			domainLabels: ["Slack", "Confluence"],
			sessionId: "test-multi",
		});

		assert.ok(result !== null);
		assert.equal(result.title, "Before I use Slack, Confluence...");
	});
});

describe("buildToolFirstClarificationInstruction", () => {
	it("returns null for empty hints", () => {
		const result = buildToolFirstClarificationInstruction({
			unsatisfiedHints: [],
			domainLabels: ["Slack"],
		});
		assert.equal(result, null);
	});

	it("builds ask-user-questions directive with missing detail labels", () => {
		const result = buildToolFirstClarificationInstruction({
			unsatisfiedHints: [
				{ id: "channel", label: "Which channel or person?" },
				{ id: "message-content", label: "What should the message say?" },
			],
			domainLabels: ["Slack"],
		});

		assert.ok(typeof result === "string" && result.length > 0);
		assert.match(result, /ask_user_questions tool/i);
		assert.match(result, /request_user_input/i);
		assert.match(result, /Which channel or person\?/);
		assert.match(result, /What should the message say\?/);
	});

	it("de-duplicates repeated hint ids", () => {
		const result = buildToolFirstClarificationInstruction({
			unsatisfiedHints: [
				{ id: "space", label: "Which Confluence space?" },
				{ id: "space", label: "Which Confluence space?" },
			],
			domainLabels: ["Confluence"],
		});

		assert.ok(typeof result === "string");
		assert.equal(
			(result.match(/Which Confluence space\?/g) || []).length,
			1
		);
	});
});
