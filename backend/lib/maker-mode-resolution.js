const MAKER_MODE_SOURCE = "plan-toggle";

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
		normalizedSource === MAKER_MODE_SOURCE;

	return {
		enabled: requestedPlanMode && hasAllowedSource,
		rejected: requestedPlanMode && !hasAllowedSource,
		source: normalizedSource,
	};
}

module.exports = {
	MAKER_MODE_SOURCE,
	resolvePlanMode,
};
