function defaultParsePlanPayload(value) {
	return value && typeof value === "object" ? value : null;
}

function hasCompletedPlanWidgetInMessages({
	messages,
	parsePlanPayload = defaultParsePlanPayload,
}) {
	if (!Array.isArray(messages)) {
		return false;
	}

	for (const message of messages) {
		if (!message || message.role !== "assistant" || !Array.isArray(message.parts)) {
			continue;
		}

		for (const part of message.parts) {
			if (part?.type !== "data-widget-data") {
				continue;
			}

			const widgetType =
				typeof part?.data?.type === "string" ? part.data.type.trim() : "";
			if (widgetType !== "plan") {
				continue;
			}

			const parsedPlanPayload = parsePlanPayload(part?.data?.payload);
			if (
				parsedPlanPayload &&
				Array.isArray(parsedPlanPayload.tasks) &&
				parsedPlanPayload.tasks.length > 0
			) {
				return true;
			}
		}
	}

	return false;
}

function hasGateSkipSource(source, planningGateSkipSources) {
	if (typeof source !== "string" || source.trim().length === 0) {
		return false;
	}

	if (planningGateSkipSources instanceof Set) {
		return planningGateSkipSources.has(source);
	}

	if (Array.isArray(planningGateSkipSources)) {
		return planningGateSkipSources.includes(source);
	}

	return false;
}

function hasVisibleUserMessage(value) {
	return Boolean(
		value &&
			typeof value === "object" &&
			typeof value.text === "string" &&
			value.text.trim().length > 0
	);
}

/**
 * Returns true when the entire trimmed message is a conversational greeting,
 * small-talk, or acknowledgement — i.e. something that should never trigger
 * the planning question-card gate even when plan mode is on.
 *
 * Only matches when the **whole** message fits. "hey can you build a plan"
 * will NOT match because there is additional task-oriented content.
 */
const CONVERSATIONAL_MESSAGE_PATTERN = new RegExp(
	"^(?:" +
		// Greetings
		"h(?:i|ey(?:\\s+there)?|ello|owdy|iya)" +
		"|yo+|sup" +
		"|good\\s+(?:morning|afternoon|evening|day)" +
		"|what(?:'s|\\s+is)\\s+up" +
		"|how(?:'s\\s+it\\s+going|\\s+are\\s+you)" +
		// Acknowledgements
		"|thanks?(?:\\s+you)?" +
		"|ok(?:ay)?" +
		"|sure|got\\s+it|cool|nice|great|awesome|sounds\\s+good" +
		"|no\\s+(?:worries|problem)" +
		// Bot questions
		"|who\\s+are\\s+you" +
		"|what\\s+(?:can\\s+you\\s+do|are\\s+you)" +
		"|(?:which|what)\\s+port\\s+are\\s+you\\s+on" +
		"|what\\s+other\\s+ports\\s+are\\s+available" +
		"|can\\s+i\\s+change\\s+your\\s+port\\s+number" +
	")(?:[!?.,\\s]*)$",
	"i"
);

const TASK_LIKE_MESSAGE_PATTERN = new RegExp(
	[
		// Time-window reporting requests such as "last 7 days of work"
		"\\b(last|past|previous)\\s+\\d+\\s+(day|days|week|weeks|month|months|quarter|quarters|year|years)\\b",
		// Analysis/report asks
		"\\b(summary|summari[sz]e|recap|highlight|highlights|accomplishments?|activity|activities|report|status\\s+update)\\b",
		// Explicit task verbs coupled with implementation/work artifacts
		"\\b(build|create|generate|make|design|draft|plan|organize|summari[sz]e|analy[sz]e|review|compare|refactor|fix|implement|debug|investigate|prepare|write|compose|list|find|fetch|show|check|get|extract|open)\\b[\\s\\S]{0,80}\\b(ui|interface|layout|component|page|dashboard|mockup|wireframe|widget|json\\s*spec|json-render|chart|charts|graph|graphs|plot|plots|table|tables|kanban|board|timeline|roadmap|form|code|commit|commits|pr|pull\\s+request|changes?|file|files|folder|folders|storage|quota|doc|docs|document|documents|sheet|sheets|slide|slides)\\b",
		// Direct assistant asks with actionable verbs
		"\\b(help\\s+me|can\\s+you|please)\\s+(build|create|generate|make|design|draft|plan|organize|summari[sz]e|analy[sz]e|review|compare|refactor|fix|implement|debug|investigate|prepare|write|compose|list|find|fetch|show|check|get|extract|open)\\b",
	].join("|"),
	"i"
);

function isConversationalMessage(text) {
	if (typeof text !== "string") {
		return false;
	}

	const trimmed = text.trim();
	if (!trimmed) {
		return false;
	}

	return CONVERSATIONAL_MESSAGE_PATTERN.test(trimmed);
}

function isTaskLikeMessage(text) {
	if (typeof text !== "string") {
		return false;
	}

	const trimmed = text.trim();
	if (!trimmed) {
		return false;
	}

	if (isConversationalMessage(trimmed)) {
		return false;
	}

	return TASK_LIKE_MESSAGE_PATTERN.test(trimmed);
}

function shouldGatePlanningQuestionCard({
	messages,
	planMode,
	latestVisibleUserMessage,
	latestUserMessageSource,
	planningGateSkipSources,
	detectPlanningIntent,
	parsePlanPayload = defaultParsePlanPayload,
}) {
	if (hasGateSkipSource(latestUserMessageSource, planningGateSkipSources)) {
		return false;
	}

	if (!hasVisibleUserMessage(latestVisibleUserMessage)) {
		return false;
	}

	if (
		hasGateSkipSource(
			latestVisibleUserMessage.source,
			planningGateSkipSources
		)
	) {
		return false;
	}

	const hasCompletedPlan = hasCompletedPlanWidgetInMessages({
		messages,
		parsePlanPayload,
	});

	if (planMode) {
		if (isConversationalMessage(latestVisibleUserMessage.text)) {
			return false;
		}

		if (typeof detectPlanningIntent !== "function") {
			return false;
		}

		if (!detectPlanningIntent(latestVisibleUserMessage.text)) {
			return false;
		}

		return !hasCompletedPlan;
	}

	if (typeof detectPlanningIntent !== "function") {
		return false;
	}

	if (!detectPlanningIntent(latestVisibleUserMessage.text)) {
		return false;
	}

	return !hasCompletedPlan;
}

module.exports = {
	hasCompletedPlanWidgetInMessages,
	hasGateSkipSource,
	isConversationalMessage,
	isTaskLikeMessage,
	shouldGatePlanningQuestionCard,
};
