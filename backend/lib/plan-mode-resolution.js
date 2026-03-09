const { getNonEmptyString } = require("./shared-utils");

const PLAN_MODE_SOURCE = "plan-toggle";

function resolvePlanMode({
	planMode,
	planModeSource,
} = {}) {
	const requestedPlanMode = planMode === true;
	const normalizedSource = getNonEmptyString(planModeSource);
	const hasAllowedSource =
		normalizedSource === PLAN_MODE_SOURCE;

	return {
		enabled: requestedPlanMode && hasAllowedSource,
		rejected: requestedPlanMode && !hasAllowedSource,
		source: normalizedSource,
	};
}

module.exports = {
	PLAN_MODE_SOURCE,
	resolvePlanMode,
};
