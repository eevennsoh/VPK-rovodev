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
