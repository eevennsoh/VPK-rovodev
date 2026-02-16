const MAX_TASKS = 20;
const DEFAULT_MIN_TASKS = 2;

function normalizeWhitespace(value) {
	return value.replace(/\s+/g, " ").trim();
}

function stripMarkdownDecorators(value) {
	return normalizeWhitespace(
		value
			.replace(/^[*_`\s]+/, "")
			.replace(/[\s*_`]+$/, "")
	);
}

function isLikelySectionHeading(line) {
	const trimmed = line.trim();
	if (!trimmed) {
		return false;
	}

	if (/^#{1,6}\s+\S/.test(trimmed)) {
		return true;
	}

	if (/^\*\*[^*]+\*\*:?$/.test(trimmed)) {
		return true;
	}

	if (/^[A-Z][A-Za-z0-9\s\-]{1,60}:?$/.test(trimmed) && !/[.!?]$/.test(trimmed)) {
		return true;
	}

	return false;
}

function isActionItemsHeading(line) {
	const trimmed = line.trim();
	if (!trimmed) {
		return false;
	}

	const normalized = stripMarkdownDecorators(
		trimmed
			.replace(/^#{1,6}\s*/, "")
			.replace(/:$/, "")
	)
		.toLowerCase();

	return /^action\s*items?\b/.test(normalized);
}

function parseListItemLabel(line) {
	const listItemPattern =
		/^\s*(?:[-*+\u2022]\s+|\d+[\.)]\s+)(?:\[(?:\s|x|X)\]\s*)?(?:\u2610\s*)?(.+)$/;
	const checkboxOnlyPattern = /^\s*(?:\[(?:\s|x|X)\]\s*|\u2610\s+)(.+)$/;

	const listMatch = line.match(listItemPattern) || line.match(checkboxOnlyPattern);
	if (!listMatch?.[1]) {
		return null;
	}

	const normalizedLabel = stripMarkdownDecorators(listMatch[1]);
	return normalizedLabel.length > 0 ? normalizedLabel : null;
}

function isContinuationLine(line) {
	return /^\s{2,}\S/.test(line) || /^\t\S/.test(line);
}

function truncateWords(value, maxWords) {
	const words = value.split(/\s+/).filter(Boolean);
	return words.slice(0, maxWords).join(" ").trim();
}

function derivePlanTitle(lines, actionItemsHeadingIndex) {
	for (let index = 0; index < actionItemsHeadingIndex; index += 1) {
		const line = lines[index];
		const headingMatch = line.match(/^\s*#{1,6}\s+(.+?)\s*$/);
		if (!headingMatch?.[1]) {
			continue;
		}

		const headingText = stripMarkdownDecorators(headingMatch[1]);
		if (!headingText || isActionItemsHeading(headingText)) {
			continue;
		}

		return truncateWords(headingText, 8);
	}

	for (let index = 0; index < actionItemsHeadingIndex; index += 1) {
		const line = lines[index].trim();
		if (!line || isLikelySectionHeading(line)) {
			continue;
		}

		const label = parseListItemLabel(line);
		if (label) {
			continue;
		}

		const normalizedLine = stripMarkdownDecorators(line);
		if (!normalizedLine) {
			continue;
		}

		return truncateWords(normalizedLine, 8);
	}

	return "Plan";
}

function extractPlanWidgetPayloadFromText(rawText, options = {}) {
	if (typeof rawText !== "string") {
		return null;
	}

	const normalizedText = rawText.trim();
	if (!normalizedText) {
		return null;
	}

	const minTasks =
		typeof options.minTasks === "number" && options.minTasks > 0
			? Math.floor(options.minTasks)
			: DEFAULT_MIN_TASKS;
	const maxTasks =
		typeof options.maxTasks === "number" && options.maxTasks > 0
			? Math.floor(options.maxTasks)
			: MAX_TASKS;

	const lines = normalizedText.split(/\r?\n/);
	const actionItemsHeadingIndex = lines.findIndex((line) =>
		isActionItemsHeading(line)
	);
	if (actionItemsHeadingIndex === -1) {
		return null;
	}

	const tasks = [];
	let hasSeenListItem = false;
	let activeTaskIndex = -1;

	for (let index = actionItemsHeadingIndex + 1; index < lines.length; index += 1) {
		const line = lines[index];
		const listItemLabel = parseListItemLabel(line);
		if (listItemLabel) {
			hasSeenListItem = true;
			tasks.push({
				id: `task-${tasks.length + 1}`,
				label: listItemLabel,
				blockedBy: [],
			});
			activeTaskIndex = tasks.length - 1;
			if (tasks.length >= maxTasks) {
				break;
			}
			continue;
		}

		const trimmedLine = line.trim();
		if (!trimmedLine) {
			activeTaskIndex = -1;
			continue;
		}

		if (!hasSeenListItem) {
			if (isLikelySectionHeading(trimmedLine)) {
				break;
			}
			continue;
		}

		if (activeTaskIndex !== -1 && isContinuationLine(line)) {
			tasks[activeTaskIndex].label = normalizeWhitespace(
				`${tasks[activeTaskIndex].label} ${trimmedLine}`
			);
			continue;
		}

		if (isLikelySectionHeading(trimmedLine)) {
			break;
		}

		break;
	}

	if (tasks.length < minTasks) {
		return null;
	}

	return {
		type: "plan",
		title: derivePlanTitle(lines, actionItemsHeadingIndex),
		tasks,
	};
}

module.exports = {
	extractPlanWidgetPayloadFromText,
};
