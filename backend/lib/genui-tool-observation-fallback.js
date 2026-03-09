const { getNonEmptyString, pluralize } = require("./shared-utils");

const DEFAULT_MAX_OBSERVATIONS = 40;
const DEFAULT_MAX_OBSERVATION_CHARS = 1200;

function clipText(value, maxChars) {
	if (typeof value !== "string") {
		return "";
	}
	if (value.length <= maxChars) {
		return value;
	}
	return `${value.slice(0, Math.max(0, maxChars - 1)).trimEnd()}…`;
}

function normalizeObservationPhase(value) {
	if (value === "result" || value === "error") {
		return value;
	}
	return null;
}

function normalizeObservation(entry, maxChars) {
	if (!entry || typeof entry !== "object") {
		return null;
	}

	const phase = normalizeObservationPhase(entry.phase);
	if (!phase) {
		return null;
	}

	const toolName = getNonEmptyString(entry.toolName) || "Tool";
	const rawText =
		getNonEmptyString(entry.text) ||
		getNonEmptyString(entry.content) ||
		getNonEmptyString(entry.output) ||
		getNonEmptyString(entry.errorText);

	if (!rawText) {
		return null;
	}

	const normalizedText = clipText(rawText.replace(/\s+/g, " "), maxChars);
	if (!normalizedText) {
		return null;
	}

	return {
		phase,
		toolName,
		text: normalizedText,
		dedupeKey: `${phase}|${toolName}|${normalizedText.toLowerCase()}`,
	};
}

function formatSummary({ resultCount, errorCount }) {
	if (resultCount > 0 && errorCount > 0) {
		return `Rendered ${resultCount} tool result${resultCount === 1 ? "" : "s"} and ${errorCount} tool error${errorCount === 1 ? "" : "s"}.`;
	}

	if (resultCount > 0) {
		return `Rendered ${resultCount} tool result${resultCount === 1 ? "" : "s"}.`;
	}

	return `Rendered ${errorCount} tool error${errorCount === 1 ? "" : "s"}.`;
}

function formatDescription({ resultCount, errorCount }) {
	const totalTools = resultCount + errorCount;
	if (resultCount > 0 && errorCount > 0) {
		return `${resultCount} ${pluralize(resultCount, "result", "results")} and ${errorCount} ${pluralize(errorCount, "error", "errors")} from ${totalTools} ${pluralize(totalTools, "tool event", "tool events")}.`;
	}
	if (resultCount > 0) {
		return `${resultCount} ${pluralize(resultCount, "result", "results")} from tool calls.`;
	}
	return `${errorCount} ${pluralize(errorCount, "error", "errors")} from tool calls.`;
}

function buildToolObservationFallback({
	observations,
	maxObservations = DEFAULT_MAX_OBSERVATIONS,
	maxObservationChars = DEFAULT_MAX_OBSERVATION_CHARS,
} = {}) {
	const entries = Array.isArray(observations) ? observations : [];
	const normalizedEntries = [];
	const seen = new Set();

	for (const entry of entries) {
		const normalized = normalizeObservation(entry, maxObservationChars);
		if (!normalized) {
			continue;
		}
		if (seen.has(normalized.dedupeKey)) {
			continue;
		}
		seen.add(normalized.dedupeKey);
		normalizedEntries.push(normalized);
	}

	if (normalizedEntries.length === 0) {
		return {
			hasObservations: false,
			text: "",
			title: "Tool results",
			description: "No tool outputs available yet.",
			summary: "Generated interactive summary from tool results.",
			resultCount: 0,
			errorCount: 0,
			observationCount: 0,
		};
	}

	const truncatedEntries =
		normalizedEntries.length > maxObservations
			? normalizedEntries.slice(-maxObservations)
			: normalizedEntries;
	const omittedCount = normalizedEntries.length - truncatedEntries.length;
	const resultCount = normalizedEntries.filter((entry) => entry.phase === "result").length;
	const errorCount = normalizedEntries.filter((entry) => entry.phase === "error").length;

	const lines = truncatedEntries.map((entry) => {
		const label = entry.phase === "error" ? "Error" : "Result";
		return `- ${label} | ${entry.toolName}: ${entry.text}`;
	});
	if (omittedCount > 0) {
		lines.push(`- +${omittedCount} additional tool event${omittedCount === 1 ? "" : "s"} omitted.`);
	}

	return {
		hasObservations: true,
		text: lines.join("\n"),
		title: "Tool results",
		description: formatDescription({ resultCount, errorCount }),
		summary: formatSummary({ resultCount, errorCount }),
		resultCount,
		errorCount,
		observationCount: normalizedEntries.length,
	};
}

module.exports = {
	buildToolObservationFallback,
};
