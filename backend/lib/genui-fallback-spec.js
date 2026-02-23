const DEFAULT_MAX_DETAIL_LINES = 8;
const DEFAULT_LINE_MAX_CHARS = 180;

function getNonEmptyString(value) {
	if (typeof value !== "string") {
		return null;
	}

	const trimmed = value.trim();
	return trimmed.length > 0 ? trimmed : null;
}

function clipText(value, maxChars = DEFAULT_LINE_MAX_CHARS) {
	if (typeof value !== "string") {
		return "";
	}

	if (value.length <= maxChars) {
		return value;
	}

	return `${value.slice(0, maxChars - 1).trimEnd()}...`;
}

function normalizeDetailLine(line) {
	const trimmed = getNonEmptyString(line);
	if (!trimmed) {
		return null;
	}

	// Ignore markdown separators and empty table dividers.
	if (/^[-|:\s]+$/.test(trimmed)) {
		return null;
	}

	let normalized = trimmed
		.replace(/^#{1,6}\s+/, "")
		.replace(/^(\*|-|\+|>|[0-9]+\.)\s+/, "")
		.replace(/\*\*(.+?)\*\*/g, "$1")
		.replace(/`(.+?)`/g, "$1")
		.replace(/\[(.+?)\]\((.+?)\)/g, "$1");

	// Flatten markdown table cells into readable text.
	if (normalized.includes("|")) {
		normalized = normalized
			.split("|")
			.map((cell) => cell.trim())
			.filter(Boolean)
			.join(" - ");
	}

	normalized = normalized.replace(/\s+/g, " ").trim();
	if (!normalized) {
		return null;
	}

	return clipText(normalized);
}

function extractDetailLines(text, maxLines = DEFAULT_MAX_DETAIL_LINES) {
	if (typeof text !== "string" || text.trim().length === 0) {
		return [];
	}

	const lines = text
		.split(/\r?\n/)
		.map((line) => normalizeDetailLine(line))
		.filter((line) => Boolean(line));

	if (lines.length <= maxLines) {
		return lines;
	}

	return lines.slice(0, maxLines);
}

function resolveTitle({ text, prompt, explicitTitle }) {
	const explicit = getNonEmptyString(explicitTitle);
	if (explicit) {
		return clipText(explicit, 80);
	}

	const headingMatch =
		typeof text === "string"
			? text.match(/^\s*#{1,6}\s+(.+)$/m)
			: null;
	if (headingMatch?.[1]) {
		const heading = getNonEmptyString(headingMatch[1]);
		if (heading) {
			return clipText(heading, 80);
		}
	}

	const promptText = getNonEmptyString(prompt);
	if (promptText) {
		return clipText(promptText, 80);
	}

	return "Interactive Summary";
}

function resolveDescription({ prompt, explicitDescription }) {
	const explicit = getNonEmptyString(explicitDescription);
	if (explicit) {
		return clipText(explicit, 140);
	}

	const promptText = getNonEmptyString(prompt);
	if (promptText) {
		return clipText(`Generated from: ${promptText}`, 140);
	}

	return "Generated from your latest response.";
}

function looksLikeClarificationText(text) {
	if (typeof text !== "string" || !text.trim()) {
		return false;
	}
	const lines = text.trim().split(/\r?\n/).filter(l => l.trim().length > 0);
	if (lines.length === 0) {
		return false;
	}
	const questionLines = lines.filter(l => l.includes("?"));
	return questionLines.length >= 2 && questionLines.length / lines.length >= 0.3;
}

function buildFallbackGenuiSpecFromText({
	text,
	prompt,
	title,
	description,
	maxDetailLines = DEFAULT_MAX_DETAIL_LINES,
} = {}) {
	if (looksLikeClarificationText(text)) {
		return null;
	}
	const normalizedText = getNonEmptyString(text) || "";
	const detailLines = extractDetailLines(normalizedText, maxDetailLines);
	const resolvedTitle = resolveTitle({
		text: normalizedText,
		prompt,
		explicitTitle: title,
	});
	const normalizedTitle = resolvedTitle.trim().toLowerCase();
	const filteredDetailLines = detailLines.filter((line, index) => {
		if (index !== 0) {
			return true;
		}

		return line.trim().toLowerCase() !== normalizedTitle;
	});
	if (filteredDetailLines.length === 0) {
		return null;
	}
	const resolvedDescription = resolveDescription({
		prompt,
		explicitDescription: description,
	});

	const cardChildren = [];
	const elements = {
		root: {
			type: "Stack",
			props: { direction: "vertical", gap: "md" },
			children: ["summary-card"],
		},
		"summary-card": {
			type: "Card",
			props: {
				title: resolvedTitle,
				description: resolvedDescription,
			},
			children: cardChildren,
		},
	};

	cardChildren.push("summary-lines");
	elements["summary-lines"] = {
		type: "Stack",
		props: { direction: "vertical", gap: "sm" },
		children: filteredDetailLines.map((_, index) => `summary-line-${index + 1}`),
	};

	filteredDetailLines.forEach((line, index) => {
		elements[`summary-line-${index + 1}`] = {
			type: "Text",
			props: { content: line },
		};
	});

	return {
		root: "root",
		elements,
	};
}

module.exports = {
	buildFallbackGenuiSpecFromText,
};
