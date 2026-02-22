const AGENT_TEAM_PLAN_MODE_SOURCE = "agents-team-toggle";

function getNonEmptyString(value) {
	if (typeof value !== "string") {
		return null;
	}

	const normalized = value.trim();
	return normalized.length > 0 ? normalized : null;
}

function resolvePlanMode({
	planMode,
	planModeSource,
} = {}) {
	const requestedPlanMode = planMode === true;
	const normalizedSource = getNonEmptyString(planModeSource);
	const hasAllowedSource =
		normalizedSource === AGENT_TEAM_PLAN_MODE_SOURCE;

	return {
		enabled: requestedPlanMode && hasAllowedSource,
		rejected: requestedPlanMode && !hasAllowedSource,
		source: normalizedSource,
	};
}

module.exports = {
	AGENT_TEAM_PLAN_MODE_SOURCE,
	resolvePlanMode,
};
