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
