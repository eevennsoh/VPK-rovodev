const test = require("node:test");
const assert = require("node:assert/strict");

const {
	isTranslationClarificationQuestionCard,
	shouldSuppressQuestionCardMessageText,
} = require("./question-card-text-visibility.ts");

test("detects translation clarification cards by session id prefix", () => {
	assert.equal(
		isTranslationClarificationQuestionCard({
			sessionId: "translation-clarification-12345-abc123",
		}),
		true
	);
});

test("does not treat generic clarification cards as translation cards", () => {
	assert.equal(
		isTranslationClarificationQuestionCard({
			sessionId: "clarification-12345-abc123",
		}),
		false
	);
});

test("detects translation clarification cards from question payload text", () => {
	assert.equal(
		isTranslationClarificationQuestionCard({
			title: "Help me translate this",
			questions: [
				{
					id: "source-text",
					label: "What text should I translate?",
				},
			],
		}),
		true
	);
});

test("detects translation clarification cards from assistant message text", () => {
	assert.equal(
		isTranslationClarificationQuestionCard(
			{
				sessionId: "request-user-input-12345",
				questions: [{ id: "q-1", label: "What do you need?" }],
			},
			"To translate this, please provide the target language."
		),
		true
	);
});

test("suppresses text for non-translation question cards", () => {
	assert.equal(
		shouldSuppressQuestionCardMessageText({
			shouldShowWidgetSections: true,
			widgetType: "question-card",
			isStreaming: false,
			widgetPayload: {
				sessionId: "request-user-input-12345",
				questions: [{ id: "q-1", label: "Which Jira site?" }],
			},
			messageText: "Please choose a site before I continue.",
		}),
		true
	);
});

test("keeps text visible for translation question cards", () => {
	assert.equal(
		shouldSuppressQuestionCardMessageText({
			shouldShowWidgetSections: true,
			widgetType: "question-card",
			isStreaming: false,
			widgetPayload: {
				sessionId: "request-user-input-12345",
				questions: [{ id: "q-1", label: "Which language should I translate into?" }],
			},
			messageText: "Tell me what text you want to translate.",
		}),
		false
	);
});
