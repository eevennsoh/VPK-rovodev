const test = require("node:test");
const assert = require("node:assert/strict");

const {
	extractQuestionCardDefinitionFromAssistantText,
	resolveFallbackQuestionCardState,
	looksLikeClarificationResponse,
} = require("./question-card-extractor");

test("extracts question cards when numbered markers and question text are split across lines", () => {
	const assistantText = [
		'I appreciate your answers, but "Quick recommendation" and "Balanced approach" do not give me specific information.',
		"Could you tell me:",
		"",
		"1.",
		'What specific topic do you want to write about? (e.g., "Sprint Planning Meeting")',
		"",
		"2.",
		"What specifically should this page contain or accomplish?",
		"",
		"For example:",
		'- "Track our Q1 goals and milestones"',
	].join("\n");

	const payload = extractQuestionCardDefinitionFromAssistantText(assistantText);
	assert.ok(payload);
	assert.equal(payload.type, "question-card");
	assert.equal(payload.questions.length, 2);
	assert.equal(payload.questions[0].label.includes("?"), true);
	assert.equal(payload.questions[1].label.includes("?"), true);
});

test("extracts from numbered question lists even without an explicit clarification phrase", () => {
	const assistantText = [
		"1.",
		"What outcome should I optimize for?",
		"2.",
		"Which timeline should I prioritize?",
	].join("\n");

	const payload = extractQuestionCardDefinitionFromAssistantText(assistantText, {
		title: "Follow-up details",
		description: "Please pick the closest options.",
	});

	assert.ok(payload);
	assert.equal(payload.title, "Follow-up details");
	assert.equal(payload.description, "Please pick the closest options.");
	assert.equal(payload.questions.length, 2);
	assert.equal(payload.questions[0].required, true);
	assert.equal(payload.questions[1].required, true);
});

test("returns null when fewer than two clarification questions are found", () => {
	const assistantText = [
		"Could you tell me:",
		"1.",
		"What outcome should I optimize for?",
	].join("\n");

	const payload = extractQuestionCardDefinitionFromAssistantText(assistantText);
	assert.equal(payload, null);
});

test("does not emit question cards for non-question numbered lists", () => {
	const assistantText = [
		"Implementation steps:",
		"1. Configure the repository",
		"2. Ship the build",
	].join("\n");

	const payload = extractQuestionCardDefinitionFromAssistantText(assistantText);
	assert.equal(payload, null);
});

test("resolveFallbackQuestionCardState increments round after clarification submit", () => {
	const state = resolveFallbackQuestionCardState({
		isPostClarificationTurn: true,
		clarificationSubmission: {
			sessionId: "clarification-abc",
			round: 1,
		},
		previousQuestionCard: {
			sessionId: "clarification-old",
			round: 1,
		},
		fallbackSessionId: "clarification-fallback",
		maxRounds: 3,
	});

	assert.equal(state.sessionId, "clarification-abc");
	assert.equal(state.round, 2);
	assert.equal(state.canEmit, true);
});

test("resolveFallbackQuestionCardState stops emission when the round exceeds the max", () => {
	const state = resolveFallbackQuestionCardState({
		isPostClarificationTurn: true,
		clarificationSubmission: {
			sessionId: "clarification-abc",
			round: 3,
		},
		previousQuestionCard: null,
		fallbackSessionId: "clarification-fallback",
		maxRounds: 3,
	});

	assert.equal(state.round, 4);
	assert.equal(state.canEmit, false);
});

test("extracts question cards from bold-header question format", () => {
	const assistantText = [
		"I'd be happy to help you post a message in a Slack channel! I just need a few details:",
		"",
		"**Channel**",
		"Which Slack channel should I post to?",
		"",
		"**Message**",
		"What message would you like to post?",
		"",
		"**Urgency**",
		"Is this time-sensitive or can it wait?",
	].join("\n");

	const payload = extractQuestionCardDefinitionFromAssistantText(assistantText);
	assert.ok(payload);
	assert.equal(payload.type, "question-card");
	assert.equal(payload.questions.length, 3);
	assert.ok(payload.questions[0].label.includes("?"));
	assert.ok(payload.questions[1].label.includes("?"));
	assert.ok(payload.questions[2].label.includes("?"));
});

test("extracts question cards from bold-header format without clarification signal phrase", () => {
	const assistantText = [
		"Sure, I can do that for you.",
		"",
		"**Channel**",
		"Which Slack channel should I post the message to?",
		"",
		"**Content**",
		"What should the message say?",
	].join("\n");

	const payload = extractQuestionCardDefinitionFromAssistantText(assistantText);
	assert.ok(payload);
	assert.equal(payload.type, "question-card");
	assert.equal(payload.questions.length, 2);
});

test("does not extract question card from bold headers without question marks", () => {
	const assistantText = [
		"Here's a summary of the project:",
		"",
		"**Architecture**",
		"The system uses a microservices pattern.",
		"",
		"**Deployment**",
		"Everything runs on Kubernetes.",
	].join("\n");

	const payload = extractQuestionCardDefinitionFromAssistantText(assistantText);
	assert.equal(payload, null);
});

test("extracts question cards with expanded signal phrase 'need some information'", () => {
	const assistantText = [
		"I need some information before proceeding:",
		"- What environment should I target?",
		"- Which region do you prefer?",
	].join("\n");

	const payload = extractQuestionCardDefinitionFromAssistantText(assistantText);
	assert.ok(payload);
	assert.equal(payload.type, "question-card");
	assert.equal(payload.questions.length, 2);
});

test("extracts question cards with expanded signal phrase 'need to know'", () => {
	const assistantText = [
		"I need to know a couple of things:",
		"- What format should the output be in?",
		"- Who is the intended audience?",
	].join("\n");

	const payload = extractQuestionCardDefinitionFromAssistantText(assistantText);
	assert.ok(payload);
	assert.equal(payload.type, "question-card");
	assert.equal(payload.questions.length, 2);
});

test("deduplicates questions with identical labels", () => {
	const assistantText = [
		"Let me ask a few questions:",
		"1. Which Confluence site should the page be created on?",
		"2. Which Confluence site should the page be created on?",
		"3. What topic should the page cover?",
		"4. Which Confluence site should the page be created on?",
	].join("\n");

	const payload = extractQuestionCardDefinitionFromAssistantText(assistantText);
	assert.ok(payload);
	assert.equal(payload.type, "question-card");
	assert.equal(payload.questions.length, 2);
	assert.equal(payload.questions[0].label, "Which Confluence site should the page be created on?");
	assert.equal(payload.questions[1].label, "What topic should the page cover?");
});

// ── Inline question trigger (4th extraction path) ──

test("extracts question card from plain-text inline questions without signal/numbered/bold markers", () => {
	const assistantText = [
		"Sure, I can help with that.",
		"What topic should the page cover?",
		"Who is the target audience?",
		"What format do you prefer?",
	].join("\n");

	const payload = extractQuestionCardDefinitionFromAssistantText(assistantText);
	assert.ok(payload);
	assert.equal(payload.type, "question-card");
	assert.ok(payload.questions.length >= 2);
});

test("returns null for a single inline question (below MIN_QUESTION_COUNT)", () => {
	const assistantText = [
		"Sure, I can help with that.",
		"What topic should the page cover?",
	].join("\n");

	const payload = extractQuestionCardDefinitionFromAssistantText(assistantText);
	assert.equal(payload, null);
});

test("returns null when question ratio is too low (2 questions in many info lines)", () => {
	const assistantText = [
		"Here is a detailed overview of the system.",
		"The architecture uses microservices.",
		"Each service handles a specific domain.",
		"The API gateway routes requests.",
		"Authentication is handled by OAuth.",
		"The database uses PostgreSQL.",
		"Caching is done with Redis.",
		"Monitoring uses Datadog.",
		"What version of Node are you using?",
		"Deployment is via Kubernetes.",
		"CI/CD runs on GitHub Actions.",
		"The frontend uses React.",
		"What browser do you target?",
	].join("\n");

	const payload = extractQuestionCardDefinitionFromAssistantText(assistantText);
	assert.equal(payload, null);
});

// ── looksLikeClarificationResponse ──

test("looksLikeClarificationResponse returns true for 2+ question lines at >= 30% ratio", () => {
	const text = [
		"Sure, I can help.",
		"What topic should the page cover?",
		"Who is the target audience?",
	].join("\n");

	assert.equal(looksLikeClarificationResponse(text), true);
});

test("looksLikeClarificationResponse returns true for signal phrase with 1 question", () => {
	const text = [
		"Let me ask a few things before I start.",
		"What format do you prefer?",
	].join("\n");

	assert.equal(looksLikeClarificationResponse(text), true);
});

test("looksLikeClarificationResponse returns false for a single question in long text", () => {
	const text = [
		"Here is the implementation plan.",
		"First we set up the database.",
		"Then we create the API endpoints.",
		"Finally we build the frontend.",
		"What do you think?",
	].join("\n");

	assert.equal(looksLikeClarificationResponse(text), false);
});

test("looksLikeClarificationResponse returns false for null and empty strings", () => {
	assert.equal(looksLikeClarificationResponse(null), false);
	assert.equal(looksLikeClarificationResponse(""), false);
	assert.equal(looksLikeClarificationResponse("   "), false);
});
