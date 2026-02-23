const { looksLikeInabilityResponse } = require("./inability-response-detector");

const DEFAULT_MAX_DETAIL_LINES = 8;
const DEFAULT_LINE_MAX_CHARS = 180;

// Jira issue key pattern (e.g., PROJ-123, AIDOPS-101)
const JIRA_ISSUE_KEY_PATTERN = /\b([A-Z][A-Z0-9]+-\d+)\b/;
const JIRA_STATUS_PATTERN = /\b(Done|In Progress|To Do|Open|Closed|Resolved|Blocked|In Review|Work in Progress|Backlog|Selected for Development)\b/i;
const JIRA_PRIORITY_PATTERN = /Priority:\s*(Blocker|Critical|High|Major|Medium|Minor|Low|Trivial|Highest|Lowest)/i;
const JIRA_TYPE_PATTERN = /Type:\s*(.+?)(?:\s*[-–—]\s*|$)/i;
const JIRA_ASSIGNEE_PATTERN = /Assigned\s+to:\s*(.+?)(?:\s*[-–—]\s*|$)/i;
const JIRA_DATE_CREATED_PATTERN = /Created:\s*(.+?)(?:\s*[-–—]\s*|$)/i;
const JIRA_DATE_UPDATED_PATTERN = /(?:Last\s+)?[Uu]pdated:\s*(.+?)$/i;

const STATUS_TO_LOZENGE_VARIANT = {
	done: "success",
	closed: "success",
	resolved: "success",
	"in progress": "information",
	"work in progress": "information",
	"in review": "information",
	"selected for development": "information",
	"to do": "neutral",
	open: "neutral",
	backlog: "neutral",
	blocked: "danger",
};

const PRIORITY_TO_BADGE_VARIANT = {
	blocker: "destructive",
	critical: "destructive",
	highest: "destructive",
	high: "destructive",
	major: "warning",
	medium: "neutral",
	minor: "neutral",
	low: "secondary",
	trivial: "secondary",
	lowest: "secondary",
};

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

/**
 * Parse a block of text that describes a single Jira issue.
 * Returns structured fields or null if not a Jira issue.
 */
function parseJiraIssueBlock(text) {
	const keyMatch = text.match(JIRA_ISSUE_KEY_PATTERN);
	if (!keyMatch) {
		return null;
	}

	const issueKey = keyMatch[1];

	// Extract summary: text after the key on the same line (often "KEY: Summary" or "KEY — Summary")
	const summaryMatch = text.match(new RegExp(`${issueKey}[:\\s–—-]+(.+?)(?:\\n|$)`, "i"));
	const summary = summaryMatch?.[1]?.trim() || "";

	const statusMatch = text.match(JIRA_STATUS_PATTERN);
	const status = statusMatch?.[1] || null;

	const priorityMatch = text.match(JIRA_PRIORITY_PATTERN);
	const priority = priorityMatch?.[1] || null;

	const typeMatch = text.match(JIRA_TYPE_PATTERN);
	const issueType = typeMatch?.[1]?.trim() || null;

	const assigneeMatch = text.match(JIRA_ASSIGNEE_PATTERN);
	const assignee = assigneeMatch?.[1]?.trim() || null;

	const createdMatch = text.match(JIRA_DATE_CREATED_PATTERN);
	const created = createdMatch?.[1]?.trim() || null;

	const updatedMatch = text.match(JIRA_DATE_UPDATED_PATTERN);
	const updated = updatedMatch?.[1]?.trim() || null;

	return {
		issueKey,
		summary,
		status,
		priority,
		issueType,
		assignee,
		created,
		updated,
	};
}

/**
 * Detect Jira issues in text and return parsed issues.
 * Splits text into blocks around issue keys.
 */
function extractJiraIssues(text) {
	if (typeof text !== "string") {
		return [];
	}

	// Split text by Jira issue key boundaries
	const lines = text.split(/\r?\n/);
	const blocks = [];
	let currentBlock = [];

	for (const line of lines) {
		if (JIRA_ISSUE_KEY_PATTERN.test(line) && currentBlock.length > 0) {
			blocks.push(currentBlock.join("\n"));
			currentBlock = [];
		}
		currentBlock.push(line);
	}

	if (currentBlock.length > 0) {
		blocks.push(currentBlock.join("\n"));
	}

	const issues = [];
	for (const block of blocks) {
		const parsed = parseJiraIssueBlock(block);
		if (parsed) {
			issues.push(parsed);
		}
	}

	return issues;
}

/**
 * Build a structured GenUI spec for Jira issues instead of plain text.
 */
function buildJiraFallbackSpec({ issues, resolvedTitle, resolvedDescription }) {
	const elements = {};
	const rootChildren = [];

	if (resolvedTitle) {
		rootChildren.push("heading");
		elements.heading = {
			type: "Heading",
			props: { level: "h2", text: resolvedTitle, className: null },
		};

		if (resolvedDescription) {
			rootChildren.push("description");
			elements.description = {
				type: "Text",
				props: { content: resolvedDescription, muted: true },
			};
		}
	}

	for (let i = 0; i < issues.length; i++) {
		const issue = issues[i];
		const prefix = `issue-${i}`;
		const cardChildren = [];

		// Status row: lozenge + priority badge + type tag
		const statusRowChildren = [];
		if (issue.status) {
			const statusKey = issue.status.toLowerCase();
			const variant = STATUS_TO_LOZENGE_VARIANT[statusKey] || "neutral";
			statusRowChildren.push(`${prefix}-status`);
			elements[`${prefix}-status`] = {
				type: "Lozenge",
				props: { text: issue.status, variant, isBold: true },
			};
		}

		if (issue.priority) {
			const priorityKey = issue.priority.toLowerCase();
			const variant = PRIORITY_TO_BADGE_VARIANT[priorityKey] || "neutral";
			statusRowChildren.push(`${prefix}-priority`);
			elements[`${prefix}-priority`] = {
				type: "Badge",
				props: { text: issue.priority, variant },
			};
		}

		if (issue.issueType) {
			statusRowChildren.push(`${prefix}-type`);
			elements[`${prefix}-type`] = {
				type: "Tag",
				props: { text: issue.issueType, color: "standard", variant: null },
			};
		}

		if (statusRowChildren.length > 0) {
			cardChildren.push(`${prefix}-status-row`);
			elements[`${prefix}-status-row`] = {
				type: "Stack",
				props: { direction: "horizontal", gap: "sm", align: "center", justify: null, padding: null, className: null },
				children: statusRowChildren,
			};
		}

		// Details: assignee + dates
		const detailChildren = [];

		if (issue.assignee) {
			detailChildren.push(`${prefix}-assignee`);
			elements[`${prefix}-assignee`] = {
				type: "Stack",
				props: { direction: "horizontal", gap: "sm", align: "center", justify: null, padding: null, className: null },
				children: [`${prefix}-assignee-avatar`, `${prefix}-assignee-text`],
			};
			elements[`${prefix}-assignee-avatar`] = {
				type: "Avatar",
				props: { fallback: issue.assignee.slice(0, 2), size: "xs", src: null, shape: null },
			};
			elements[`${prefix}-assignee-text`] = {
				type: "Text",
				props: { content: `Assigned to ${issue.assignee}`, muted: null },
			};
		}

		const dateParts = [];
		if (issue.created) {
			dateParts.push(`Created ${issue.created}`);
		}
		if (issue.updated) {
			dateParts.push(`Updated ${issue.updated}`);
		}
		if (dateParts.length > 0) {
			detailChildren.push(`${prefix}-dates`);
			elements[`${prefix}-dates`] = {
				type: "Text",
				props: { content: dateParts.join(" · "), muted: true, size: "xs" },
			};
		}

		if (detailChildren.length > 0) {
			cardChildren.push(`${prefix}-details`);
			elements[`${prefix}-details`] = {
				type: "Stack",
				props: { direction: "vertical", gap: "sm", align: null, justify: null, padding: null, className: null },
				children: detailChildren,
			};
		}

		const cardTitle = issue.summary
			? `${issue.issueKey}: ${clipText(issue.summary, 80)}`
			: issue.issueKey;

		rootChildren.push(prefix);
		elements[prefix] = {
			type: "Card",
			props: { title: cardTitle, description: null, href: null, className: null },
			children: cardChildren.length > 0 ? cardChildren : undefined,
		};
	}

	elements.root = {
		type: "Stack",
		props: { direction: "vertical", gap: "md", align: null, justify: null, padding: null, className: null },
		children: rootChildren,
	};

	return {
		root: "root",
		elements,
	};
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
	if (looksLikeInabilityResponse(text)) {
		return null;
	}
	const normalizedText = getNonEmptyString(text) || "";

	// Try Jira-aware structured spec first
	const jiraIssues = extractJiraIssues(normalizedText);
	if (jiraIssues.length > 0) {
		const resolvedTitle = resolveTitle({
			text: normalizedText,
			prompt,
			explicitTitle: title,
		});
		const resolvedDescription = resolveDescription({
			prompt,
			explicitDescription: description,
		});
		return buildJiraFallbackSpec({
			issues: jiraIssues,
			resolvedTitle,
			resolvedDescription,
		});
	}

	// Default: plain text fallback
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

/**
 * Build a guaranteed-non-null minimal GenUI card from any text.
 * Unlike buildFallbackGenuiSpecFromText, this never returns null —
 * it always produces at least a Card with a single Text child.
 */
function buildMinimalTextCardSpec({ text, title = "Summary" } = {}) {
	const content =
		typeof text === "string" && text.trim()
			? clipText(text.trim(), 2000)
			: "Tool execution completed but no summary text was available.";

	return {
		root: "root",
		elements: {
			root: {
				type: "Stack",
				props: { direction: "vertical", gap: "md" },
				children: ["summary-card"],
			},
			"summary-card": {
				type: "Card",
				props: { title },
				children: ["summary-text"],
			},
			"summary-text": {
				type: "Text",
				props: { content },
			},
		},
	};
}

module.exports = {
	buildFallbackGenuiSpecFromText,
	buildMinimalTextCardSpec,
	extractJiraIssues,
	buildJiraFallbackSpec,
};
