function normalizeIntent(value) {
	if (typeof value !== "string") {
		return null;
	}

	const normalizedValue = value.trim().toLowerCase();
	if (normalizedValue.length === 0) {
		return null;
	}

	if (normalizedValue === "image" || normalizedValue === "audio") {
		return normalizedValue;
	}

	return null;
}

function resolveToolFirstRoutingFlags({
	toolFirstMatched,
	inferredPromptIntent,
	preClassifiedIntent,
} = {}) {
	const normalizedPreClassifiedIntent = normalizeIntent(preClassifiedIntent);
	const normalizedInferredIntent = normalizeIntent(inferredPromptIntent);
	const mediaBypassIntent =
		normalizedPreClassifiedIntent || normalizedInferredIntent || null;
	const isMediaIntentBypass = mediaBypassIntent !== null;
	const isStrictToolFirstTurn = Boolean(toolFirstMatched) && !isMediaIntentBypass;

	return {
		mediaBypassIntent,
		isMediaIntentBypass,
		isStrictToolFirstTurn,
	};
}

module.exports = {
	resolveToolFirstRoutingFlags,
};
