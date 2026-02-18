const test = require("node:test");
const assert = require("node:assert/strict");

const {
	hasCompletedPlanWidgetInMessages,
	shouldGateAgentTeamPlanningQuestionCard,
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

test("shouldGateAgentTeamPlanningQuestionCard gates first planning turn in agent-team mode", () => {
	const shouldGate = shouldGateAgentTeamPlanningQuestionCard({
		messages: [],
		agentTeamMode: true,
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

test("shouldGateAgentTeamPlanningQuestionCard skips gate after clarification-submit source", () => {
	const shouldGate = shouldGateAgentTeamPlanningQuestionCard({
		messages: [],
		agentTeamMode: true,
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

test("shouldGateAgentTeamPlanningQuestionCard skips gate after plan-approval-submit source", () => {
	const shouldGate = shouldGateAgentTeamPlanningQuestionCard({
		messages: [],
		agentTeamMode: true,
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

test("shouldGateAgentTeamPlanningQuestionCard does not gate when completed plan exists", () => {
	const shouldGate = shouldGateAgentTeamPlanningQuestionCard({
		messages: [createPlanWidgetMessage(1)],
		agentTeamMode: true,
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

test("shouldGateAgentTeamPlanningQuestionCard does not gate non-planning prompt outside agent-team mode", () => {
	const shouldGate = shouldGateAgentTeamPlanningQuestionCard({
		messages: [],
		agentTeamMode: false,
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
