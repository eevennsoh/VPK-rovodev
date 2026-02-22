function normalizeSmartGenerationProvider(value) {
	if (typeof value !== "string") {
		return undefined;
	}

	const trimmed = value.trim();
	return trimmed.length > 0 ? trimmed : undefined;
}

function normalizeSmartGenerationPortIndex(value) {
	if (typeof value === "number" && Number.isInteger(value) && value >= 0) {
		return value;
	}

	return undefined;
}

function buildSmartGenerationGatewayOptions({
	provider,
	portIndex,
	excludePinnedPorts = false,
	signal,
} = {}) {
	const normalizedProvider = normalizeSmartGenerationProvider(provider);
	const normalizedPortIndex = normalizeSmartGenerationPortIndex(portIndex);
	const options = {};

	if (normalizedProvider !== undefined) {
		options.provider = normalizedProvider;
	}

	// When excludePinnedPorts is true, background tasks deliberately avoid
	// pinned ports so they don't interfere with interactive chat panels.
	// portIndex is ignored in this case.
	if (excludePinnedPorts) {
		options.excludePinnedPorts = true;
	} else if (normalizedPortIndex !== undefined) {
		options.portIndex = normalizedPortIndex;
	}

	if (signal) {
		options.signal = signal;
	}

	return options;
}

module.exports = {
	normalizeSmartGenerationProvider,
	normalizeSmartGenerationPortIndex,
	buildSmartGenerationGatewayOptions,
};
