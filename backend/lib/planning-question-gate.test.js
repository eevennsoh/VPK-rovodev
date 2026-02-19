const test = require("node:test");
const assert = require("node:assert/strict");

const {
	hasCompletedPlanWidgetInMessages,
	isConversationalMessage,
	shouldGatePlanningQuestionCard,
} = require("./planning-question-gate");

const PLANNING_GATE_SKIP_SOURCES = new Set([
	"clarification-submit",
	"plan-approval-submit",
	"agent-team-plan-retry",
]);

function createPlanWidgetMessage(taskCount) {
	return {
		role: "assistant",
		parts: [
			{
				type: "data-widget-data",
				data: {
					type: "plan",
					payload: {
						tasks: Array.from({ length: taskCount }, (_, index) => ({
							id: `task-${index + 1}`,
							label: `Task ${index + 1}`,
						})),
					},
				},
			},
		],
	};
}

test("hasCompletedPlanWidgetInMessages returns true when plan widget has tasks", () => {
	const messages = [createPlanWidgetMessage(2)];
	assert.equal(hasCompletedPlanWidgetInMessages({ messages }), true);
});

test("hasCompletedPlanWidgetInMessages returns false when plan widget has no tasks", () => {
	const messages = [createPlanWidgetMessage(0)];
	assert.equal(hasCompletedPlanWidgetInMessages({ messages }), false);
});

test("shouldGatePlanningQuestionCard gates first planning turn in plan mode", () => {
	const shouldGate = shouldGatePlanningQuestionCard({
		messages: [],
		planMode: true,
		latestVisibleUserMessage: {
			text: "Can you create a rollout plan for coordinating a team event?",
			source: null,
		},
		latestUserMessageSource: null,
		planningGateSkipSources: PLANNING_GATE_SKIP_SOURCES,
		detectPlanningIntent: () => true,
	});

	assert.equal(shouldGate, true);
});

test("shouldGatePlanningQuestionCard skips gate after clarification-submit source", () => {
	const shouldGate = shouldGatePlanningQuestionCard({
		messages: [],
		planMode: true,
		latestVisibleUserMessage: {
			text: "Can you create a rollout plan for coordinating a team event?",
			source: null,
		},
		latestUserMessageSource: "clarification-submit",
		planningGateSkipSources: PLANNING_GATE_SKIP_SOURCES,
		detectPlanningIntent: () => true,
	});

	assert.equal(shouldGate, false);
});

test("shouldGatePlanningQuestionCard skips gate after plan-approval-submit source", () => {
	const shouldGate = shouldGatePlanningQuestionCard({
		messages: [],
		planMode: true,
		latestVisibleUserMessage: {
			text: "Can you create a rollout plan for coordinating a team event?",
			source: null,
		},
		latestUserMessageSource: "plan-approval-submit",
		planningGateSkipSources: PLANNING_GATE_SKIP_SOURCES,
		detectPlanningIntent: () => true,
	});

	assert.equal(shouldGate, false);
});

test("shouldGatePlanningQuestionCard does not gate when completed plan exists", () => {
	const shouldGate = shouldGatePlanningQuestionCard({
		messages: [createPlanWidgetMessage(1)],
		planMode: true,
		latestVisibleUserMessage: {
			text: "Can you create a rollout plan for coordinating a team event?",
			source: null,
		},
		latestUserMessageSource: null,
		planningGateSkipSources: PLANNING_GATE_SKIP_SOURCES,
		detectPlanningIntent: () => true,
	});

	assert.equal(shouldGate, false);
});

test("shouldGatePlanningQuestionCard does not gate non-planning prompt outside plan mode", () => {
	const shouldGate = shouldGatePlanningQuestionCard({
		messages: [],
		planMode: false,
		latestVisibleUserMessage: {
			text: "Show me subscription plans for the product",
			source: null,
		},
		latestUserMessageSource: null,
		planningGateSkipSources: PLANNING_GATE_SKIP_SOURCES,
		detectPlanningIntent: () => false,
	});

	assert.equal(shouldGate, false);
});

test("shouldGatePlanningQuestionCard does not gate conversational greetings in plan mode", () => {
	const greetings = [
		"hey there",
		"hi",
		"hello",
		"yo",
		"sup",
		"howdy",
		"good morning",
		"good afternoon!",
		"what's up",
		"how are you",
		"how's it going",
	];

	for (const greeting of greetings) {
		const shouldGate = shouldGatePlanningQuestionCard({
			messages: [],
			planMode: true,
			latestVisibleUserMessage: { text: greeting, source: null },
			latestUserMessageSource: null,
			planningGateSkipSources: PLANNING_GATE_SKIP_SOURCES,
			detectPlanningIntent: () => false,
		});

		assert.equal(shouldGate, false, `Expected no gate for greeting: "${greeting}"`);
	}
});

test("shouldGatePlanningQuestionCard does not gate acknowledgements in plan mode", () => {
	const acknowledgements = ["thanks", "thank you", "ok", "okay", "cool", "got it", "nice", "great"];

	for (const ack of acknowledgements) {
		const shouldGate = shouldGatePlanningQuestionCard({
			messages: [],
			planMode: true,
			latestVisibleUserMessage: { text: ack, source: null },
			latestUserMessageSource: null,
			planningGateSkipSources: PLANNING_GATE_SKIP_SOURCES,
			detectPlanningIntent: () => false,
		});

		assert.equal(shouldGate, false, `Expected no gate for acknowledgement: "${ack}"`);
	}
});

test("shouldGatePlanningQuestionCard still gates task-like messages that start with greetings in plan mode", () => {
	const taskMessages = [
		"hey can you help me build a deployment plan",
		"hi, I need a roadmap for migrating our database",
		"hello, create a rollout plan for the new feature",
	];

	for (const message of taskMessages) {
		const shouldGate = shouldGatePlanningQuestionCard({
			messages: [],
			planMode: true,
			latestVisibleUserMessage: { text: message, source: null },
			latestUserMessageSource: null,
			planningGateSkipSources: PLANNING_GATE_SKIP_SOURCES,
			detectPlanningIntent: () => true,
		});

		assert.equal(shouldGate, true, `Expected gate for task message: "${message}"`);
	}
});

test("isConversationalMessage returns true for pure greetings", () => {
	const greetings = ["hi", "hey", "hello", "yo", "sup", "howdy", "hiya", "good morning", "good evening!"];
	for (const g of greetings) {
		assert.equal(isConversationalMessage(g), true, `Expected conversational: "${g}"`);
	}
});

test("isConversationalMessage returns false for task-oriented messages", () => {
	const tasks = [
		"build me a dashboard",
		"hey can you create a plan",
		"hi, help me refactor this code",
		"create a rollout plan",
	];
	for (const t of tasks) {
		assert.equal(isConversationalMessage(t), false, `Expected non-conversational: "${t}"`);
	}
});
