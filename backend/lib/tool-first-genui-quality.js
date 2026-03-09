const { isObjectRecord } = require("./shared-utils");

function getNonNegativeInteger(value) {
	if (typeof value !== "number" || !Number.isFinite(value)) {
		return 0;
	}

	return Math.max(0, Math.floor(value));
}

function getElements(spec) {
	if (!isObjectRecord(spec) || !isObjectRecord(spec.elements)) {
		return {};
	}

	return spec.elements;
}

function hasRecoveredPlaceholderSection(spec) {
	const elements = Object.values(getElements(spec));
	for (const element of elements) {
		if (!isObjectRecord(element)) {
			continue;
		}

		if (element.type !== "Card") {
			continue;
		}

		const props = isObjectRecord(element.props) ? element.props : null;
		if (!props) {
			continue;
		}

		const title = typeof props.title === "string" ? props.title.trim() : "";
		const description =
			typeof props.description === "string" ? props.description.trim() : "";
		if (
			title.toLowerCase() === "generated section" &&
			/recovered from incomplete model output/i.test(description)
		) {
			return true;
		}
	}

	return false;
}

function assessToolFirstGenuiQuality({ analysis, spec } = {}) {
	const missingChildKeys = Array.isArray(analysis?.missingChildKeys)
		? analysis.missingChildKeys
		: [];
	const synthesizedChildCount = getNonNegativeInteger(
		analysis?.synthesizedChildCount
	);
	const usedSynthesizedSpec = Boolean(
		spec && analysis?.synthesizedSpec && spec === analysis.synthesizedSpec
	);
	const hasPlaceholderSection = hasRecoveredPlaceholderSection(spec);

	const reasons = [];
	if (!spec) {
		reasons.push("missing_spec");
	}
	if (synthesizedChildCount > 0) {
		reasons.push("synthesized_missing_children");
	}
	if (missingChildKeys.length > 0) {
		reasons.push("missing_child_references");
	}
	if (usedSynthesizedSpec) {
		reasons.push("selected_synthesized_spec");
	}
	if (hasPlaceholderSection) {
		reasons.push("recovered_placeholder_sections");
	}

	return {
		quality: reasons.length > 0 ? "low_confidence" : "acceptable",
		reasons,
		synthesizedChildCount,
		missingChildKeyCount: missingChildKeys.length,
		usedSynthesizedSpec,
		hasRecoveredPlaceholderSection: hasPlaceholderSection,
	};
}

module.exports = {
	hasRecoveredPlaceholderSection,
	assessToolFirstGenuiQuality,
};
