const MAX_TOOL_PREVIEW_CHARS = 1200;
const MAX_TOOL_PREVIEW_LINES = 20;
const MAX_INLINE_ASSISTANT_JSON_CHARS = 2000;
const ASSISTANT_JSON_SUPPRESSION_TEXT =
	"Tool results were large and are omitted for performance. Open Tools for details.";

const MAX_SERIALIZE_DEPTH = 4;
const MAX_SERIALIZE_ARRAY_ITEMS = 50;
const MAX_SERIALIZE_OBJECT_KEYS = 50;

function truncateByLines(value, maxLines) {
	if (maxLines <= 0) {
		return { text: "", truncated: value.length > 0 };
	}

	const lines = value.split(/\r?\n/u);
	if (lines.length <= maxLines) {
		return { text: value, truncated: false };
	}

	return {
		text: lines.slice(0, maxLines).join("\n"),
		truncated: true,
	};
}

function truncateByChars(value, maxChars) {
	if (maxChars <= 0) {
		return { text: "", truncated: value.length > 0 };
	}

	if (value.length <= maxChars) {
		return { text: value, truncated: false };
	}

	const slicedText = value.slice(0, Math.max(0, maxChars - 1));
	return { text: `${slicedText}…`, truncated: true };
}

function isPlainObject(value) {
	return Object.prototype.toString.call(value) === "[object Object]";
}

function toBoundedSerializableValue(value, depth, seen) {
	if (value === null || value === undefined) {
		return value;
	}

	if (typeof value !== "object") {
		return value;
	}

	if (seen.has(value)) {
		return "[Circular]";
	}

	if (depth >= MAX_SERIALIZE_DEPTH) {
		if (Array.isArray(value)) {
			return `[Array(${value.length})]`;
		}
		return "[Object]";
	}

	seen.add(value);
	try {
		if (Array.isArray(value)) {
			const truncatedArray = value
				.slice(0, MAX_SERIALIZE_ARRAY_ITEMS)
				.map((item) =>
					toBoundedSerializableValue(item, depth + 1, seen)
				);
			if (value.length > MAX_SERIALIZE_ARRAY_ITEMS) {
				truncatedArray.push(
					`[+${value.length - MAX_SERIALIZE_ARRAY_ITEMS} more items]`
				);
			}
			return truncatedArray;
		}

		if (isPlainObject(value)) {
			const entries = Object.entries(value);
			const boundedObject = {};
			for (const [key, entryValue] of entries.slice(0, MAX_SERIALIZE_OBJECT_KEYS)) {
				boundedObject[key] = toBoundedSerializableValue(
					entryValue,
					depth + 1,
					seen
				);
			}
			if (entries.length > MAX_SERIALIZE_OBJECT_KEYS) {
				boundedObject.__truncated__ = `+${entries.length - MAX_SERIALIZE_OBJECT_KEYS} more keys`;
			}
			return boundedObject;
		}

		return String(value);
	} finally {
		seen.delete(value);
	}
}

function stringifyValue(value) {
	if (typeof value === "string") {
		return value;
	}
	if (value === null || value === undefined) {
		return "";
	}
	if (typeof value === "number" || typeof value === "boolean") {
		return String(value);
	}

	try {
		const boundedValue = toBoundedSerializableValue(value, 0, new WeakSet());
		return JSON.stringify(boundedValue, null, 2);
	} catch {
		return String(value);
	}
}

function toPreview(
	value,
	{
		maxChars = MAX_TOOL_PREVIEW_CHARS,
		maxLines = MAX_TOOL_PREVIEW_LINES,
	} = {}
) {
	const rawText = stringifyValue(value);
	const bytes = Buffer.byteLength(rawText, "utf8");

	let previewText = rawText;
	let truncated = false;

	const lineResult = truncateByLines(previewText, maxLines);
	previewText = lineResult.text;
	truncated = truncated || lineResult.truncated;

	const charResult = truncateByChars(previewText, maxChars);
	previewText = charResult.text;
	truncated = truncated || charResult.truncated;

	return {
		text: previewText,
		truncated,
		bytes,
	};
}

function countMatches(value, regex) {
	const matches = value.match(regex);
	return Array.isArray(matches) ? matches.length : 0;
}

function isLikelyLargeJsonDump(
	value,
	{ minChars = MAX_INLINE_ASSISTANT_JSON_CHARS } = {}
) {
	if (typeof value !== "string") {
		return false;
	}

	const text = value.trim();
	if (text.length < minChars) {
		return false;
	}

	const keyPairCount = countMatches(text, /"[^"\n]{1,80}"\s*:/gu);
	const braceCount = countMatches(text, /[{}\[\]]/gu);
	const commaCount = countMatches(text, /,/gu);
	const startsAsJson = text.startsWith("{") || text.startsWith("[");

	if (startsAsJson) {
		return keyPairCount >= 5 || braceCount >= 18;
	}

	return keyPairCount >= 10 && braceCount >= 25 && commaCount >= 20;
}

function getLikelyJsonStartIndex(value) {
	if (typeof value !== "string" || value.length === 0) {
		return -1;
	}

	const objectIndex = value.indexOf("{");
	const arrayIndex = value.indexOf("[");
	if (objectIndex === -1) {
		return arrayIndex;
	}
	if (arrayIndex === -1) {
		return objectIndex;
	}
	return Math.min(objectIndex, arrayIndex);
}

function sanitizeAssistantNarrative(
	value,
	{
		maxChars = MAX_INLINE_ASSISTANT_JSON_CHARS,
		replacement = ASSISTANT_JSON_SUPPRESSION_TEXT,
	} = {}
) {
	if (typeof value !== "string" || value.length === 0) {
		return { text: "", replaced: false };
	}

	if (!isLikelyLargeJsonDump(value, { minChars: maxChars })) {
		return { text: value, replaced: false };
	}

	const jsonStartIndex = getLikelyJsonStartIndex(value);
	const prefixCandidate =
		jsonStartIndex > -1 ? value.slice(0, jsonStartIndex).trim() : "";
	const boundedPrefix =
		prefixCandidate.length > 600
			? `${prefixCandidate.slice(0, 599)}…`
			: prefixCandidate;
	const replacementText = boundedPrefix
		? `${boundedPrefix}\n\n${replacement}`
		: replacement;

	return { text: replacementText, replaced: true };
}

function stripLargeJsonFromNarrative(value, options) {
	return sanitizeAssistantNarrative(value, options);
}

module.exports = {
	MAX_TOOL_PREVIEW_CHARS,
	MAX_TOOL_PREVIEW_LINES,
	MAX_INLINE_ASSISTANT_JSON_CHARS,
	ASSISTANT_JSON_SUPPRESSION_TEXT,
	toPreview,
	sanitizeAssistantNarrative,
	stripLargeJsonFromNarrative,
};
