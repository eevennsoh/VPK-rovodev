const { getNonEmptyString } = require("../lib/shared-utils");

const MAKE_MODE_SOURCE = "plan-toggle";

function resolvePlanMode({
	planMode,
	planModeSource,
} = {}) {
	const requestedPlanMode = planMode === true;
	const normalizedSource = getNonEmptyString(planModeSource);
	const hasAllowedSource =
		normalizedSource === MAKE_MODE_SOURCE;

	return {
		enabled: requestedPlanMode && hasAllowedSource,
		rejected: requestedPlanMode && !hasAllowedSource,
		source: normalizedSource,
	};
}

module.exports = {
	MAKE_MODE_SOURCE,
	resolvePlanMode,
};
