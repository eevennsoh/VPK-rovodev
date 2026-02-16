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
