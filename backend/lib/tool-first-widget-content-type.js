const DOMAIN_CONTENT_TYPE_MAP = new Map([
	["google-translate", "translation"],
	["slack", "message"],
	["google-calendar", "calendar"],
	["teamwork-graph", "work-item"],
	["jira", "work-item"],
]);

function getNonEmptyString(value) {
	if (typeof value !== "string") {
		return null;
	}

	const trimmedValue = value.trim();
	return trimmedValue.length > 0 ? trimmedValue : null;
}

function resolveContentTypeFromDomains(domains) {
	if (!Array.isArray(domains)) {
		return null;
	}

	for (const domain of domains) {
		const normalizedDomain = getNonEmptyString(domain);
		if (!normalizedDomain) {
			continue;
		}

		const mappedContentType = DOMAIN_CONTENT_TYPE_MAP.get(
			normalizedDomain.toLowerCase()
		);
		if (mappedContentType) {
			return mappedContentType;
		}
	}

	return null;
}

function resolveContentTypeFromToolName(toolName) {
	const normalizedToolName = getNonEmptyString(toolName);
	if (!normalizedToolName) {
		return null;
	}

	const toolText = normalizedToolName
		.toLowerCase()
		.replace(/[_:/.-]+/g, " ")
		.replace(/\s+/g, " ")
		.trim();

	if (/\btranslate\b|\blanguage\b/.test(toolText)) {
		return "translation";
	}

	if (/\bgoogle\s*calendar\b|\bcalendar\b|\bevents?\b|\bavailability\b|\bgcal\b/.test(toolText)) {
		return "calendar";
	}

	if (/\bslack\b|\bchannel\b|\bdm\b|\bmessage\b|\breply\b/.test(toolText)) {
		return "message";
	}

	if (
		/\bteamwork\b|\bgraph\b|\bwork\s*summary\b|\bjira\b|\bissues?\b|\btickets?\b|\bjql\b/.test(
			toolText
		)
	) {
		return "work-item";
	}

	return null;
}

function resolveContentTypeFromPrompt(prompt) {
	const normalizedPrompt = getNonEmptyString(prompt);
	if (!normalizedPrompt) {
		return null;
	}

	if (
		/\btranslate\b|\btranslation\b|\bsource\s+language\b|\btarget\s+language\b/i.test(
			normalizedPrompt
		)
	) {
		return "translation";
	}

	if (
		/\bgoogle\s+calendar\b|\bcalendar\b|\bavailability\b|\bmeeting\s+slots?\b|\bevents?\b/i.test(
			normalizedPrompt
		)
	) {
		return "calendar";
	}

	if (
		/\bslack\b|\bchannel\b|\bdm\b|\bdirect\s+message\b|\b(send|post|reply|write)\b[\s\S]{0,30}\bmessage\b/i.test(
			normalizedPrompt
		)
	) {
		return "message";
	}

	if (
		/\bwork\s+summary\b|\brecent\s+work\b|\blast\s+\d+\s+days?\s+of\s+work\b|\bjira\b|\bissues?\b|\btickets?\b|\bwork\s*items?\b/i.test(
			normalizedPrompt
		)
	) {
		return "work-item";
	}

	return null;
}

function resolveToolFirstWidgetContentType({
	primaryDomains,
	relevanceDomains,
	lastRelevantToolName,
	prompt,
} = {}) {
	return (
		resolveContentTypeFromDomains(primaryDomains) ||
		resolveContentTypeFromDomains(relevanceDomains) ||
		resolveContentTypeFromToolName(lastRelevantToolName) ||
		resolveContentTypeFromPrompt(prompt) ||
		null
	);
}

module.exports = {
	resolveToolFirstWidgetContentType,
};

