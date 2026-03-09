/**
 * Shared utility functions used across backend modules.
 *
 * These helpers were previously duplicated in 20+ files. Import from here
 * instead of re-declaring locally.
 */

/**
 * Returns the trimmed string if non-empty, otherwise null.
 * @param {unknown} value
 * @returns {string | null}
 */
function getNonEmptyString(value) {
	if (typeof value !== "string") {
		return null;
	}

	const trimmed = value.trim();
	return trimmed.length > 0 ? trimmed : null;
}

/**
 * Returns true if `value` is a non-null, non-array object.
 * @param {unknown} value
 * @returns {boolean}
 */
function isObjectRecord(value) {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Truncates `value` to `maxChars`, appending "..." when clipped.
 * Returns null for empty/non-string input.
 * @param {unknown} value
 * @param {number} [maxChars=220]
 * @returns {string | null}
 */
function clipText(value, maxChars = 220) {
	if (typeof value !== "string") {
		return null;
	}

	const trimmed = value.trim();
	if (!trimmed) {
		return null;
	}
	if (trimmed.length <= maxChars) {
		return trimmed;
	}

	return `${trimmed.slice(0, Math.max(0, maxChars - 3)).trimEnd()}...`;
}

/**
 * Lowercase, strip trailing punctuation, collapse whitespace.
 * @param {unknown} value
 * @returns {string}
 */
function normalizeSentence(value) {
	const text = getNonEmptyString(value);
	if (!text) {
		return "";
	}

	return text
		.toLowerCase()
		.replace(/[.!?]+$/g, "")
		.replace(/\s+/g, " ")
		.trim();
}

/**
 * Simple singular/plural selector.
 * @param {number} count
 * @param {string} singular
 * @param {string} plural
 * @returns {string}
 */
function pluralize(count, singular, plural) {
	return count === 1 ? singular : plural;
}

/**
 * Try to JSON.parse a string that starts with `{` or `[`.
 * @param {unknown} value
 * @returns {object | Array | null}
 */
function parseMaybeJson(value) {
	const text = getNonEmptyString(value);
	if (!text || (text[0] !== "{" && text[0] !== "[")) {
		return null;
	}

	try {
		return JSON.parse(text);
	} catch {
		return null;
	}
}

/**
 * Parses a positive integer from a number or string.
 * Returns `fallback` (default null) when the value is not a positive integer.
 * @param {unknown} value
 * @param {number | null} [fallback=null]
 * @returns {number | null}
 */
function getPositiveInteger(value, fallback = null) {
	if (typeof value === "number" && Number.isInteger(value) && value > 0) {
		return value;
	}

	if (typeof value === "string") {
		const parsed = Number.parseInt(value, 10);
		if (Number.isInteger(parsed) && parsed > 0) {
			return parsed;
		}
	}

	return fallback;
}

/**
 * Extract plain text from AI SDK UI message parts.
 * @param {Array} parts
 * @returns {string}
 */
function extractTextFromUiParts(parts) {
	if (!Array.isArray(parts)) {
		return "";
	}

	return parts
		.filter((part) => part?.type === "text" && typeof part.text === "string")
		.map((part) => part.text)
		.join("")
		.trim();
}

/**
 * Returns true if `value` is a plain object (Object.prototype).
 * @param {unknown} value
 * @returns {boolean}
 */
function isPlainObject(value) {
	return Object.prototype.toString.call(value) === "[object Object]";
}

module.exports = {
	getNonEmptyString,
	isObjectRecord,
	clipText,
	normalizeSentence,
	pluralize,
	parseMaybeJson,
	getPositiveInteger,
	extractTextFromUiParts,
	isPlainObject,
};
