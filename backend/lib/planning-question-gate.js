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

function shouldGateAgentTeamPlanningQuestionCard({
	messages,
	agentTeamMode,
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

	if (agentTeamMode) {
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
	shouldGateAgentTeamPlanningQuestionCard,
};
