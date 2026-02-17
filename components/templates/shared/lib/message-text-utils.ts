const MERMAID_BLOCK_REGEX = /```mermaid\b[\s\S]*?```/gi;
const MERMAID_EDGE_REGEX =
	/\b[A-Za-z0-9_-]+\s*(?:-->|==>|-.->)\s*(?:\|[^|\n]+\|\s*)?[A-Za-z0-9_-]+\b/;

function createMermaidBlockRegex(): RegExp {
	return new RegExp(MERMAID_BLOCK_REGEX.source, MERMAID_BLOCK_REGEX.flags);
}

function extractMermaidBlocksFromText(value: string): string[] {
	if (!value.trim()) {
		return [];
	}

	return Array.from(value.matchAll(createMermaidBlockRegex()), (match) =>
		match[0].trim()
	);
}

function stripMermaidBlocksFromText(value: string): string {
	if (!value.trim()) {
		return "";
	}

	return value.replace(createMermaidBlockRegex(), "").trim();
}

function hasDependencyEdgesInMermaid(value: string): boolean {
	const mermaidBlocks = extractMermaidBlocksFromText(value);
	if (mermaidBlocks.length === 0) {
		return false;
	}

	return mermaidBlocks.some((block) => MERMAID_EDGE_REGEX.test(block));
}

/**
 * Text normalization helpers for AI-generated message content.
 *
 * These functions clean artifacts produced by streaming LLM responses
 * (e.g. stray trailing single characters or leading fragments).
 */

/**
 * Remove a trailing line that consists of a single alphabetic character.
 *
 * During streaming, partial token emission can leave an isolated letter at
 * the end of the message (e.g. "a", "b"). This trims it so the message
 * reads naturally until the next chunk arrives.
 */
export function removeTrailingSingleCharacterLine(value: string): string {
	const trimmed = value.trim();
	if (!trimmed) {
		return "";
	}

	const lines = trimmed.split(/\r?\n/);
	if (lines.length < 2) {
		return trimmed;
	}

	const trailingLine = lines[lines.length - 1]?.trim() ?? "";
	if (!/^[A-Za-z]$/.test(trailingLine)) {
		return trimmed;
	}

	lines.pop();
	while (lines.length > 0 && lines[lines.length - 1].trim().length === 0) {
		lines.pop();
	}

	return lines.join("\n").trim();
}

/**
 * Remove a leading single-character fragment that precedes a first-person pronoun.
 *
 * Some streaming outputs produce artifacts like "b I'll " where a lone letter
 * is prepended to the actual message content.
 */
export function removeLeadingSingleCharacterFragment(value: string): string {
	const trimmed = value.trim();
	if (!trimmed) {
		return "";
	}

	return trimmed
		.split(/\r?\n/)
		.map((line) =>
			line.replace(/^\s*[b-hj-z]\s+(?=I(?:['\u2019]|\b))/, "")
		)
		.join("\n")
		.trim();
}

function isLikelySectionHeading(line: string): boolean {
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

	return (
		/^[A-Z][A-Za-z0-9\s-]{1,60}:?$/.test(trimmed) &&
		!/[.!?]$/.test(trimmed)
	);
}

function isActionItemsHeading(line: string): boolean {
	const normalizedHeading = line
		.trim()
		.replace(/^#{1,6}\s*/, "")
		.replace(/:$/, "")
		.replace(/^\*\*(.+)\*\*$/, "$1")
		.trim()
		.toLowerCase();

	return /^action\s*items?\b/.test(normalizedHeading);
}

function isActionListItemLine(line: string): boolean {
	return (
		/^\s*(?:[-*+\u2022]\s+|\d+[.)]\s+)(?:\[(?:\s|x|X)\]\s*)?(?:\u2610\s*)?\S/.test(
			line
		) || /^\s*(?:\[(?:\s|x|X)\]\s*|\u2610\s+)\S/.test(line)
	);
}

function isContinuationLine(line: string): boolean {
	return /^\s{2,}\S/.test(line) || /^\t\S/.test(line);
}

function isPlanNarrativeNoiseLine(line: string): boolean {
	const trimmedLine = line.trim();
	if (!trimmedLine) {
		return false;
	}

	if (
		/^(?:used|invoking|completed|running|calling)\s+[A-Za-z0-9_.:-]+/i.test(
			trimmedLine
		)
	) {
		return true;
	}

	if (/^(?:great idea!?|here(?:['\u2019]?)s the plan:?)/i.test(trimmedLine)) {
		return true;
	}

	if (/^let me\s+/i.test(trimmedLine) || /^now i\b/i.test(trimmedLine)) {
		return true;
	}

	return /^#{1,6}\s*plan\b/i.test(trimmedLine) || /^plan:?$/i.test(trimmedLine);
}

function extractPlanSummaryTail(value: string, maxSummaryLines: number): string {
	const lines = value
		.split(/\r?\n/)
		.map((line) => line.trim())
		.filter((line) => line.length > 0)
		.filter((line) => !isActionListItemLine(line))
		.filter((line) => !isLikelySectionHeading(line))
		.filter((line) => !isPlanNarrativeNoiseLine(line))
		.filter((line) => !/^```/.test(line));
	if (lines.length === 0) {
		return "";
	}

	return lines.slice(-maxSummaryLines).join("\n").trim();
}

export interface PlanRenderableText {
	text: string;
	mermaid: string;
	summary: string;
}

interface ExtractPlanRenderableTextOptions {
	maxSummaryLines?: number;
}

/**
 * Remove the "Action items" section from a planning response when tasks are
 * already rendered in a dedicated plan card widget.
 */
export function removeActionItemsSection(value: string): string {
	const trimmed = value.trim();
	if (!trimmed) {
		return "";
	}

	const lines = trimmed.split(/\r?\n/);
	const headingIndex = lines.findIndex((line) => isActionItemsHeading(line));
	if (headingIndex === -1) {
		return trimmed;
	}

	let hasSeenListItem = false;
	let hasActiveListItem = false;
	let sectionEndIndex = headingIndex + 1;

	for (let index = headingIndex + 1; index < lines.length; index += 1) {
		const line = lines[index];
		const trimmedLine = line.trim();

		if (isActionListItemLine(line)) {
			hasSeenListItem = true;
			hasActiveListItem = true;
			sectionEndIndex = index + 1;
			continue;
		}

		if (!trimmedLine) {
			hasActiveListItem = false;
			sectionEndIndex = index + 1;
			continue;
		}

		if (!hasSeenListItem) {
			sectionEndIndex = index + 1;
			if (isLikelySectionHeading(trimmedLine) && index > headingIndex + 1) {
				break;
			}
			continue;
		}

		if (hasActiveListItem && isContinuationLine(line)) {
			sectionEndIndex = index + 1;
			continue;
		}

		if (isLikelySectionHeading(trimmedLine)) {
			break;
		}

		break;
	}

	if (!hasSeenListItem) {
		return trimmed;
	}

	const remainingLines = [
		...lines.slice(0, headingIndex),
		...lines.slice(sectionEndIndex),
	];
	const compactedLines: string[] = [];
	for (const line of remainingLines) {
		if (
			line.trim().length === 0 &&
			compactedLines[compactedLines.length - 1]?.trim().length === 0
		) {
			continue;
		}

		compactedLines.push(line);
	}

	while (compactedLines[0]?.trim().length === 0) {
		compactedLines.shift();
	}
	while (compactedLines[compactedLines.length - 1]?.trim().length === 0) {
		compactedLines.pop();
	}

	return compactedLines.join("\n").trim();
}

export function extractPlanRenderableText(
	value: string,
	options: ExtractPlanRenderableTextOptions = {}
): PlanRenderableText {
	const maxSummaryLines =
		typeof options.maxSummaryLines === "number" && options.maxSummaryLines > 0
			? Math.floor(options.maxSummaryLines)
			: 2;

	const normalizedText = removeActionItemsSection(
		removeLeadingSingleCharacterFragment(value)
	);
	if (!normalizedText) {
		return {
			text: "",
			mermaid: "",
			summary: "",
		};
	}

	const mermaidBlocks = extractMermaidBlocksFromText(normalizedText).filter((block) =>
		hasDependencyEdgesInMermaid(block)
	);
	const mermaidText = mermaidBlocks.join("\n\n").trim();
	const narrativeText = stripMermaidBlocksFromText(normalizedText);
	const summary = extractPlanSummaryTail(narrativeText, maxSummaryLines);
	const combinedText = [mermaidText, summary].filter(Boolean).join("\n\n").trim();

	return {
		text: combinedText,
		mermaid: mermaidText,
		summary,
	};
}
