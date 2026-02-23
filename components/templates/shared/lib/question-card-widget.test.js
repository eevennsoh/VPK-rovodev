const test = require("node:test");
const assert = require("node:assert/strict");

const { parseQuestionCardPayload } = require("./question-card-widget.ts");

test("parseQuestionCardPayload preserves multi-select kind", () => {
	const payload = parseQuestionCardPayload({
		type: "question-card",
		sessionId: "widget-multi",
		questions: [
			{
				id: "q-1",
				label: "Which channels should we use?",
				kind: "multi-select",
				options: [{ label: "Slack" }, { label: "Email" }],
			},
		],
	});

	assert.ok(payload);
	assert.equal(payload.questions[0].kind, "multi-select");
	assert.equal(payload.questions[0].options.length, 2);
});

test("parseQuestionCardPayload defaults invalid kinds to single-select", () => {
	const payload = parseQuestionCardPayload({
		type: "question-card",
		sessionId: "widget-default-kind",
		questions: [
			{
				id: "q-1",
				label: "Choose a release track",
				kind: "invalid-kind",
				options: [{ label: "Stable" }],
			},
		],
	});

	assert.ok(payload);
	assert.equal(payload.questions[0].kind, "single-select");
});

test("parseQuestionCardPayload keeps text kind for free-form-only questions", () => {
	const payload = parseQuestionCardPayload({
		type: "question-card",
		sessionId: "widget-text-kind",
		questions: [
			{
				id: "q-1",
				label: "Anything else we should know?",
				kind: "text",
				options: [],
			},
		],
	});

	assert.ok(payload);
	assert.equal(payload.questions[0].kind, "text");
});

test("parseQuestionCardPayload filters out self-type options", () => {
	const payload = parseQuestionCardPayload({
		type: "question-card",
		sessionId: "widget-self-type",
		questions: [
			{
				id: "q-1",
				label: "Which Confluence space?",
				kind: "single-select",
				options: [
					{ label: "I'll type the space name" },
					{ label: "Engineering" },
					{ label: "I will enter it myself" },
					{ label: "Product" },
				],
			},
		],
	});

	assert.ok(payload);
	assert.equal(payload.questions[0].options.length, 2);
	assert.equal(payload.questions[0].options[0].label, "Engineering");
	assert.equal(payload.questions[0].options[1].label, "Product");
});

test("parseQuestionCardPayload keeps options that mention typing in context", () => {
	const payload = parseQuestionCardPayload({
		type: "question-card",
		sessionId: "widget-type-context",
		questions: [
			{
				id: "q-1",
				label: "What type of document?",
				kind: "single-select",
				options: [
					{ label: "Blog post type" },
					{ label: "Technical spec" },
				],
			},
		],
	});

	assert.ok(payload);
	assert.equal(payload.questions[0].options.length, 2);
});
