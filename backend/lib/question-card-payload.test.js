const test = require("node:test");
const assert = require("node:assert/strict");

const {
	sanitizeQuestionCardPayload,
	buildQuestionCardPayloadFromRequestUserInput,
} = require("./question-card-payload");

test("keeps generated options even when questions share identical option sets", () => {
	const payload = sanitizeQuestionCardPayload(
		{
			type: "question-card",
			sessionId: "clarification-fixed",
			questions: [
				{
					id: "q-1",
					label: "Which stack should we use?",
					kind: "single-select",
					options: [
						{ id: "react", label: "React" },
						{ id: "vue", label: "Vue" },
					],
				},
				{
					id: "q-2",
					label: "Which framework should we prefer?",
					kind: "single-select",
					options: [
						{ id: "react", label: "React" },
						{ id: "vue", label: "Vue" },
					],
				},
			],
		},
		{
			createSessionId: () => "clarification-fixed",
		}
	);

	assert.ok(payload);
	assert.equal(payload.questions[0].options.length, 2);
	assert.equal(payload.questions[1].options.length, 2);
});

test("preserves multi-select kind from question payload", () => {
	const payload = sanitizeQuestionCardPayload(
		{
			type: "question-card",
			sessionId: "clarification-multi",
			questions: [
				{
					id: "q-1",
					label: "Which channels should we include?",
					kind: "multi-select",
					options: [
						{ label: "Slack" },
						{ label: "Email" },
					],
				},
			],
		},
		{
			createSessionId: () => "clarification-multi",
		}
	);

	assert.ok(payload);
	assert.equal(payload.questions[0].kind, "multi-select");
});

test("falls back to single-select when kind is missing or invalid", () => {
	const payload = sanitizeQuestionCardPayload(
		{
			type: "question-card",
			sessionId: "clarification-kind-default",
			questions: [
				{
					id: "q-1",
					label: "Pick a release track",
					options: [{ label: "Stable" }],
				},
				{
					id: "q-2",
					label: "Pick a deployment mode",
					kind: "not-a-real-kind",
					options: [{ label: "Rolling" }],
				},
			],
		},
		{
			createSessionId: () => "clarification-kind-default",
		}
	);

	assert.ok(payload);
	assert.equal(payload.questions[0].kind, "single-select");
	assert.equal(payload.questions[1].kind, "single-select");
});

test("request_user_input conversion keeps multi-select questions", () => {
	const payload = buildQuestionCardPayloadFromRequestUserInput(
		{
			title: "Scope details",
			questions: [
				{
					id: "q-1",
					question: "Which integrations should be enabled?",
					kind: "multi-select",
					options: [
						{ label: "Slack" },
						{ label: "Google Drive" },
					],
				},
			],
		},
		{
			sessionId: "request-user-input-1",
			createSessionId: () => "request-user-input-1",
		}
	);

	assert.ok(payload);
	assert.equal(payload.questions[0].kind, "multi-select");
	assert.equal(payload.questions[0].options.length, 2);
});

test("request_user_input conversion accepts choices alias for options", () => {
	const payload = buildQuestionCardPayloadFromRequestUserInput(
		{
			title: "Confluence draft scope",
			questions: [
				{
					id: "q-1",
					question: "Which page type should I draft?",
					choices: [
						"Status update",
						"Project brief",
					],
				},
			],
		},
		{
			sessionId: "request-user-input-choices",
			createSessionId: () => "request-user-input-choices",
		}
	);

	assert.ok(payload);
	assert.equal(payload.questions[0].options.length, 2);
	assert.equal(payload.questions[0].options[0].label, "Status update");
	assert.equal(payload.questions[0].options[1].label, "Project brief");
});

test("request_user_input conversion accepts snake_case answer option aliases", () => {
	const payload = buildQuestionCardPayloadFromRequestUserInput(
		{
			title: "Release scope",
			questions: [
				{
					id: "q-1",
					question: "Which channels should we include?",
					answer_options: [
						{ label: "Slack" },
						{ value: "Email digest" },
					],
				},
			],
		},
		{
			sessionId: "request-user-input-answer-options",
			createSessionId: () => "request-user-input-answer-options",
		}
	);

	assert.ok(payload);
	assert.equal(payload.questions[0].options.length, 2);
	assert.equal(payload.questions[0].options[0].label, "Slack");
	assert.equal(payload.questions[0].options[1].label, "Email digest");
});
