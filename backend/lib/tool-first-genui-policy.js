const TOOL_FIRST_DOMAIN_CONFIG = [
	{
		id: "google-calendar",
		label: "Google Calendar",
		promptPatterns: [
			/\bgoogle\s+calendar\b/i,
			/\bcalendar\b/i,
			/\bavailability\b/i,
			/\bmeeting\s+slots?\b/i,
		],
		toolPatterns: [
			/\bgoogle[_\s:-]*calendar\b/i,
			/\bcalendar\b/i,
			/\bavailability\b/i,
			/\bevent(s)?\b/i,
			/\bgcal\b/i,
		],
	},
	{
		id: "google-drive-docs",
		label: "Google Drive / Docs",
		promptPatterns: [
			/\bgoogle\s+drive\b/i,
			/\bgoogle\s+doc(s)?\b/i,
			/\bgoogle\s+sheet(s)?\b/i,
			/\bgoogle\s+slide(s)?\b/i,
			/\b(doc|docs|drive|sheet|sheets|slide|slides)\s+(comment|permission|revision|label)s?\b/i,
			/\batlassian:url:get:content\b/i,
		],
		toolPatterns: [
			/\bgoogle[_\s:-]*(drive|doc|docs|sheet|sheets|slide|slides)\b/i,
			/\bdrive\b/i,
			/\bdoc(s)?\b/i,
			/\bsheet(s)?\b/i,
			/\bslide(s)?\b/i,
			/\b(permission|comment|revision|label)s?\b/i,
			/\batlassian:url:get:content\b/i,
			/\burl:get:content\b/i,
		],
	},
	{
		id: "google-translate",
		label: "Google Translate",
		promptPatterns: [
			/\bgoogle\s+translate\b/i,
			/\btranslate\b/i,
			/\bdetect\s+language\b/i,
			/\bsupported\s+languages\b/i,
		],
		toolPatterns: [
			/\btranslate\b/i,
			/\blanguage\b/i,
		],
	},
	{
		id: "slack",
		label: "Slack",
		promptPatterns: [
			/\bslack\b/i,
			/\bchannel(s)?\b/i,
			/\bthread(s)?\b/i,
			/\brepl(y|ies)\b/i,
			/\bsend\s+(a\s+)?message\b/i,
		],
		toolPatterns: [
			/\bslack\b/i,
			/\bchannel(s)?\b/i,
			/\brepl(y|ies)\b/i,
			/\bmessage(s)?\b/i,
		],
	},
	{
		id: "compass",
		label: "Compass",
		promptPatterns: [
			/\bcompass\b/i,
			/\bcomponent(s)?\b/i,
			/\bdependencies\b/i,
			/\bevent\s+sources?\b/i,
			/\bapi\s+changelog(s)?\b/i,
		],
		toolPatterns: [
			/\bcompass\b/i,
			/\bcomponent(s)?\b/i,
			/\bdependencies\b/i,
			/\bevent[_\s-]*sources?\b/i,
			/\bchangelog(s)?\b/i,
		],
	},
	{
		id: "teamwork-graph",
		label: "Teamwork Graph",
		promptPatterns: [
			/\bteamwork\s+graph\b/i,
			/\bgraph\b/i,
			/\bcypher\b/i,
			/\bwork\s+summary\b/i,
			/\bcollaboration\s+summary\b/i,
			/\borg\s+hierarchy\b/i,
			/\breport\s+chain\b/i,
		],
		toolPatterns: [
			/\bteamwork\b/i,
			/\bgraph\b/i,
			/\bcypher\b/i,
			/\bwork[_\s-]*summary\b/i,
			/\bcollaboration\b/i,
			/\borg\b/i,
			/\bmanager\b/i,
			/\breport[_\s-]*chain\b/i,
		],
	},
	{
		id: "atlassian-projects",
		label: "Atlassian Projects",
		promptPatterns: [
			/\batlassian\s+project(s)?\b/i,
			/\bproject\s+update(s)?\b/i,
			/\bprogress\s+update(s)?\b/i,
			/\bproject\s+context\b/i,
		],
		toolPatterns: [
			/\bproject(s)?\b/i,
			/\bprogress[_\s-]*update(s)?\b/i,
			/\bproject[_\s-]*context\b/i,
		],
	},
	{
		id: "jira",
		label: "Jira",
		promptPatterns: [
			/\bjira\b/i,
			/\bissue(s)?\b/i,
			/\bjql\b/i,
			/\btransition(s)?\b/i,
		],
		toolPatterns: [
			/\bjira\b/i,
			/\bissue(s)?\b/i,
			/\bjql\b/i,
			/\btransition(s)?\b/i,
		],
	},
	{
		id: "confluence",
		label: "Confluence",
		promptPatterns: [
			/\bconfluence\b/i,
			/\bcql\b/i,
			/\bpage(s)?\b/i,
			/\bspace(s)?\b/i,
		],
		toolPatterns: [
			/\bconfluence\b/i,
			/\bcql\b/i,
			/\bpage(s)?\b/i,
			/\bspace(s)?\b/i,
		],
	},
	{
		id: "bitbucket",
		label: "Bitbucket",
		promptPatterns: [
			/\bbitbucket\b/i,
			/\bpull\s+request(s)?\b/i,
			/\bpipeline(s)?\b/i,
			/\brepo(sitory|s)?\b/i,
		],
		toolPatterns: [
			/\bbitbucket\b/i,
			/\bpull[_\s-]*request(s)?\b/i,
			/\bpipeline(s)?\b/i,
			/\brepo(sitory|s)?\b/i,
			/\bbranch(es)?\b/i,
		],
	},
	{
		id: "planning-orchestration",
		label: "Planning & Orchestration",
		promptPatterns: [
			/\bupdate[_\s-]*todo\b/i,
			/\bask[_\s-]*user[_\s-]*questions\b/i,
			/\binvoke[_\s-]*subagents\b/i,
			/\bget[_\s-]*skill\b/i,
			/\bsubagent(s)?\b/i,
			/\btodo\s+list\b/i,
			/\bclarifying\s+question(s)?\b/i,
		],
		toolPatterns: [
			/\bupdate[_\s-]*todo\b/i,
			/\bask[_\s-]*user[_\s-]*questions\b/i,
			/\binvoke[_\s-]*subagents\b/i,
			/\bget[_\s-]*skill\b/i,
			/\brequest[_\s-]*user[_\s-]*input\b/i,
			/\bupdate[_\s-]*plan\b/i,
		],
	},
	{
		id: "browser-automation",
		label: "Browser Automation",
		promptPatterns: [
			/\bplaywright\b/i,
			/\bbrowser\s+automation\b/i,
			/\bscreenshot\b/i,
			/\bsnapshot\b/i,
			/\bfill\s+form\b/i,
			/\bnavigate\b/i,
		],
		toolPatterns: [
			/\bplaywright\b/i,
			/\bbrowser[_\s-]/i,
			/\bscreenshot\b/i,
			/\bsnapshot\b/i,
			/\bnavigate\b/i,
			/\bclick\b/i,
			/\bfill\b/i,
		],
	},
	{
		id: "figma",
		label: "Figma",
		promptPatterns: [
			/\bfigma\b/i,
			/\bnode[-\s]?id\b/i,
			/\bdesign\s+context\b/i,
			/\bcode\s+connect\b/i,
			/\bvariable\s+definitions?\b/i,
		],
		toolPatterns: [
			/\bfigma\b/i,
			/\bcode[_\s-]*connect\b/i,
			/\bdesign[_\s-]*context\b/i,
			/\bnode\b/i,
			/\bvariable\b/i,
		],
	},
	{
		id: "workspace-file-ops",
		label: "Workspace File Ops",
		promptPatterns: [
			/\bopen[_\s-]*files?\b/i,
			/\bexpand[_\s-]*code[_\s-]*chunks?\b/i,
			/\bfind[_\s-]*and[_\s-]*replace(_code)?\b/i,
			/\bexpand[_\s-]*folder\b/i,
			/\b(create|delete|move|rename|open|read|search|replace|edit|run|execute)\b[\s\S]{0,40}\b(file|files|folder|folders|directory|directories|code|bash|terminal|command)\b/i,
		],
		toolPatterns: [
			/\bopen[_\s-]*files?\b/i,
			/\bexpand[_\s-]*code[_\s-]*chunks?\b/i,
			/\bgrep\b/i,
			/\bcreate[_\s-]*file\b/i,
			/\bdelete[_\s-]*file\b/i,
			/\bmove[_\s-]*file\b/i,
			/\bfind[_\s-]*and[_\s-]*replace(_code)?\b/i,
			/\bexpand[_\s-]*folder\b/i,
			/\bbash\b/i,
			/\bterminal\b/i,
		],
	},
];

const TOOL_FIRST_ENFORCEMENT_MODE_SOFT_RETRY = "soft-retry";
const TOOL_FIRST_DEFAULT_MAX_RETRIES = 0;
const TOOL_FIRST_DEFAULT_RETRY_BACKOFF_MS = [750, 1500];
const TOOL_FIRST_DEFAULT_MAX_RETRY_WINDOW_MS = 3000;

const TOOL_FIRST_DOMAIN_MAP = new Map(
	TOOL_FIRST_DOMAIN_CONFIG.map((domain) => [domain.id, domain])
);

function getNonEmptyString(value) {
	if (typeof value !== "string") {
		return null;
	}

	const trimmedValue = value.trim();
	return trimmedValue.length > 0 ? trimmedValue : null;
}

function trimPreview(value, maxLength = 280) {
	const text = getNonEmptyString(value);
	if (!text) {
		return null;
	}

	if (text.length <= maxLength) {
		return text;
	}

	return `${text.slice(0, maxLength - 1)}…`;
}

function getPositiveInteger(value, fallback) {
	if (typeof value === "number" && Number.isFinite(value) && value > 0) {
		return Math.floor(value);
	}

	if (typeof value === "string" && value.trim()) {
		const parsedValue = Number.parseInt(value.trim(), 10);
		if (Number.isFinite(parsedValue) && parsedValue > 0) {
			return parsedValue;
		}
	}

	return fallback;
}

function normalizeRetryBackoffValues(rawValue, maxRetries) {
	const expectedLength = Math.max(maxRetries, 1);
	const fallbackValues = TOOL_FIRST_DEFAULT_RETRY_BACKOFF_MS.slice(0, expectedLength);
	if (fallbackValues.length < expectedLength) {
		const lastFallbackValue = fallbackValues[fallbackValues.length - 1] ?? 750;
		while (fallbackValues.length < expectedLength) {
			fallbackValues.push(lastFallbackValue);
		}
	}

	if (typeof rawValue !== "string" || !rawValue.trim()) {
		return fallbackValues;
	}

	const parsedValues = rawValue
		.split(",")
		.map((part) => Number.parseInt(part.trim(), 10))
		.filter((value) => Number.isFinite(value) && value > 0);
	if (parsedValues.length === 0) {
		return fallbackValues;
	}

	const normalizedValues = parsedValues.slice(0, expectedLength);
	const lastValue = normalizedValues[normalizedValues.length - 1] ?? fallbackValues[0];
	while (normalizedValues.length < expectedLength) {
		normalizedValues.push(lastValue);
	}

	return normalizedValues;
}

function resolveToolFirstEnforcementConfig() {
	const normalizedMode =
		getNonEmptyString(process.env.TOOL_FIRST_ENFORCEMENT_MODE)?.toLowerCase()
		?? TOOL_FIRST_ENFORCEMENT_MODE_SOFT_RETRY;
	const mode =
		normalizedMode === TOOL_FIRST_ENFORCEMENT_MODE_SOFT_RETRY
			? TOOL_FIRST_ENFORCEMENT_MODE_SOFT_RETRY
			: TOOL_FIRST_ENFORCEMENT_MODE_SOFT_RETRY;

	const maxRelevantRetries = getPositiveInteger(
		process.env.TOOL_FIRST_MAX_RETRIES,
		TOOL_FIRST_DEFAULT_MAX_RETRIES
	);
	const retryBackoffMs = normalizeRetryBackoffValues(
		process.env.TOOL_FIRST_RETRY_BACKOFF_MS,
		maxRelevantRetries
	);
	const maxRetryWindowMs = getPositiveInteger(
		process.env.TOOL_FIRST_RETRY_WINDOW_MS,
		TOOL_FIRST_DEFAULT_MAX_RETRY_WINDOW_MS
	);

	return {
		mode,
		maxRelevantRetries,
		retryBackoffMs,
		maxRetryWindowMs,
	};
}

function resolveMatchedDomains(prompt) {
	const text = getNonEmptyString(prompt);
	if (!text) {
		return [];
	}

	return TOOL_FIRST_DOMAIN_CONFIG
		.filter((domain) =>
			Array.isArray(domain.promptPatterns)
			&& domain.promptPatterns.some((pattern) => pattern.test(text))
		)
		.map((domain) => domain.id);
}

function getDomainLabels(domains) {
	if (!Array.isArray(domains)) {
		return [];
	}

	return domains
		.map((domainId) => TOOL_FIRST_DOMAIN_MAP.get(domainId)?.label)
		.filter(Boolean);
}

function resolveToolFirstPolicy({ prompt } = {}) {
	const domains = resolveMatchedDomains(prompt);
	const enforcement = resolveToolFirstEnforcementConfig();
	if (domains.length === 0) {
		return {
			matched: false,
			domains: [],
			domainLabels: [],
			instruction: null,
			enforcement,
		};
	}

	const domainLabels = getDomainLabels(domains);
	const instruction = [
		"Tool-first execution policy:",
		`- This request is in scope for: ${domainLabels.join(", ")}.`,
		"- Before finalizing your answer, execute at least one relevant MCP/integration tool call and use its result as primary context.",
		"- Do not invent tool results. If a tool fails, report the specific failure and the exact input needed to retry.",
	].join("\n");

	return {
		matched: true,
		domains,
		domainLabels,
		instruction,
		enforcement,
	};
}

function isToolNameRelevant({ toolName, domains } = {}) {
	const normalizedToolName = getNonEmptyString(toolName);
	if (!normalizedToolName || !Array.isArray(domains) || domains.length === 0) {
		return false;
	}
	const canonicalToolName = normalizedToolName
		.toLowerCase()
		.replace(/[_:/.-]+/g, " ")
		.replace(/\s+/g, " ")
		.trim();

	return domains.some((domainId) => {
		const domain = TOOL_FIRST_DOMAIN_MAP.get(domainId);
		if (!domain || !Array.isArray(domain.toolPatterns)) {
			return false;
		}
		return domain.toolPatterns.some((pattern) =>
			pattern.test(normalizedToolName) || pattern.test(canonicalToolName)
		);
	});
}

function createToolFirstExecutionState(policy) {
	const resolvedPolicy = policy && typeof policy === "object" ? policy : null;
	const domains = resolvedPolicy?.matched ? resolvedPolicy.domains : [];
	return {
		matched: Boolean(resolvedPolicy?.matched),
		domains: Array.isArray(domains) ? [...domains] : [],
		totalToolStarts: 0,
		totalToolResults: 0,
		totalToolErrors: 0,
		relevantToolStarts: 0,
		relevantToolResults: 0,
		relevantToolErrors: 0,
		attempts: 0,
		retriesUsed: 0,
		hadRelevantToolStart: false,
		lastRelevantToolName: null,
		lastRelevantError: null,
		lastRelevantErrorCategory: null,
		events: [],
	};
}

function classifyToolErrorCategory(value) {
	const text = getNonEmptyString(value);
	if (!text) {
		return "unknown";
	}

	const normalizedText = text.toLowerCase();
	if (
		/\b(unauthorized|authentication|reauth|re-auth|token|oauth|login required)\b/i.test(
			normalizedText
		)
	) {
		return "auth";
	}

	if (/\b(forbidden|permission|access denied|insufficient scope|scope)\b/i.test(normalizedText)) {
		return "permission";
	}

	if (
		/\b(not found|missing file|missing id|invalid id|no such file|no such resource|404)\b/i.test(
			normalizedText
		)
	) {
		return "not_found";
	}

	if (/\b(rate limit|too many requests|quota|throttl|429)\b/i.test(normalizedText)) {
		return "rate_limit";
	}

	if (
		/\b(timeout|timed out|network|connection|unavailable|temporary|temporarily|502|503|504)\b/i.test(
			normalizedText
		)
	) {
		return "transient_network";
	}

	return "unknown";
}

function recordToolFirstAttempt(state, { isRetry = false } = {}) {
	if (!state || typeof state !== "object" || !state.matched) {
		return;
	}

	state.attempts += 1;
	if (isRetry) {
		state.retriesUsed += 1;
	}
}

function normalizePhase(value) {
	if (value === "start" || value === "result" || value === "error") {
		return value;
	}
	return null;
}

function recordToolThinkingEvent(state, event) {
	if (!state || typeof state !== "object" || !state.matched) {
		return;
	}
	if (!event || typeof event !== "object") {
		return;
	}

	const phase = normalizePhase(event.phase);
	if (!phase) {
		return;
	}

	const toolName = getNonEmptyString(event.toolName) || "Tool";
	const relevant = isToolNameRelevant({
		toolName,
		domains: state.domains,
	});
	const outputPreview =
		trimPreview(event.outputPreview)
		|| trimPreview(event.output)
		|| trimPreview(event.errorText);

	if (phase === "start") {
		state.totalToolStarts += 1;
		if (relevant) {
			state.relevantToolStarts += 1;
			state.hadRelevantToolStart = true;
			state.lastRelevantToolName = toolName;
		}
	} else if (phase === "result") {
		state.totalToolResults += 1;
		if (relevant) {
			state.relevantToolResults += 1;
			state.hadRelevantToolStart = true;
			state.lastRelevantToolName = toolName;
			state.lastRelevantError = null;
			state.lastRelevantErrorCategory = null;
		}
	} else if (phase === "error") {
		state.totalToolErrors += 1;
		if (relevant) {
			state.relevantToolErrors += 1;
			state.hadRelevantToolStart = true;
			state.lastRelevantToolName = toolName;
			state.lastRelevantError = outputPreview || null;
			state.lastRelevantErrorCategory = classifyToolErrorCategory(outputPreview);
		}
	}

	state.events.push({
		phase,
		toolName,
		toolCallId: getNonEmptyString(event.toolCallId) || null,
		relevant,
		outputPreview,
	});
	if (state.events.length > 60) {
		state.events.shift();
	}
}

function hasRelevantToolSuccess(state) {
	return Boolean(state && state.matched && state.relevantToolResults > 0);
}

function getToolFirstRetryDelayMs({ policy, retryIndex } = {}) {
	const retryDelays = Array.isArray(policy?.enforcement?.retryBackoffMs)
		? policy.enforcement.retryBackoffMs
		: TOOL_FIRST_DEFAULT_RETRY_BACKOFF_MS;
	const fallbackDelay = retryDelays[retryDelays.length - 1] ?? TOOL_FIRST_DEFAULT_RETRY_BACKOFF_MS[0];
	const normalizedRetryIndex =
		typeof retryIndex === "number" && Number.isFinite(retryIndex) && retryIndex >= 0
			? Math.floor(retryIndex)
			: 0;
	return retryDelays[normalizedRetryIndex] ?? fallbackDelay;
}

function buildToolFirstRetryInstruction({ policy, attemptNumber, remainingRetries } = {}) {
	const domainLabels = Array.isArray(policy?.domainLabels)
		&& policy.domainLabels.length > 0
		? policy.domainLabels
		: [];
	const scopedDomains = domainLabels.length > 0
		? domainLabels.join(", ")
		: "the requested integration domain";
	const resolvedAttemptNumber =
		typeof attemptNumber === "number" && Number.isFinite(attemptNumber) && attemptNumber > 0
			? Math.floor(attemptNumber)
			: 1;
	const retriesRemaining =
		typeof remainingRetries === "number"
		&& Number.isFinite(remainingRetries)
		&& remainingRetries >= 0
			? Math.floor(remainingRetries)
			: 0;

	return [
		"[Tool-first retry directive]",
		`Retry attempt ${resolvedAttemptNumber} for ${scopedDomains}.`,
		"Call at least one relevant MCP/integration tool before answering.",
		"Do not claim missing capability unless a relevant tool call in this turn explicitly returns that limitation.",
		retriesRemaining > 0
			? `If this attempt still fails, report the exact tool error and required IDs/URLs or re-authentication steps. Remaining retries after this attempt: ${retriesRemaining}.`
			: "If this attempt fails, report the exact tool error and required IDs/URLs or re-authentication steps.",
	].join("\n");
}

function buildToolContextForGenui({
	policy,
	execution,
	assistantText,
	maxItems = 6,
} = {}) {
	if (!policy?.matched || !execution?.matched) {
		return null;
	}

	const domainLabels = Array.isArray(policy.domainLabels)
		&& policy.domainLabels.length > 0
		? policy.domainLabels
		: getDomainLabels(execution.domains);

	const recentRelevantResults = Array.isArray(execution.events)
		? execution.events
			.filter((event) => event.relevant && event.phase === "result")
			.slice(-maxItems)
		: [];
	const recentRelevantErrors = Array.isArray(execution.events)
		? execution.events
			.filter((event) => event.relevant && event.phase === "error")
			.slice(-3)
		: [];

	const lines = [
		"Tool execution context (authoritative for this request):",
		`- Domains: ${domainLabels.join(", ")}`,
		`- Relevant tool starts: ${execution.relevantToolStarts}, results: ${execution.relevantToolResults}, errors: ${execution.relevantToolErrors}`,
	];

	if (recentRelevantResults.length > 0) {
		lines.push("- Recent relevant tool results:");
		for (const event of recentRelevantResults) {
			const preview = event.outputPreview || "Result returned without preview text.";
			lines.push(`  - ${event.toolName}: ${preview}`);
		}
	}

	if (recentRelevantErrors.length > 0) {
		lines.push("- Relevant tool errors:");
		for (const event of recentRelevantErrors) {
			const preview = event.outputPreview || "Tool returned an error.";
			lines.push(`  - ${event.toolName}: ${preview}`);
		}
	}

	const assistantPreview = trimPreview(assistantText, 420);
	if (assistantPreview) {
		lines.push(`- Assistant narrative: ${assistantPreview}`);
	}

	return lines.join("\n");
}

function buildToolFirstTextFallback({
	policy,
	execution,
	rovoDevFallback = false,
} = {}) {
	const domainLabels = Array.isArray(policy?.domainLabels)
		&& policy.domainLabels.length > 0
		? policy.domainLabels
		: getDomainLabels(execution?.domains);
	const scopedDomains = domainLabels.length > 0
		? domainLabels.join(", ")
		: "the requested tool domain";

	const attemptCount =
		typeof execution?.attempts === "number" && execution.attempts > 0
			? execution.attempts
			: 1;
	const retriesUsed =
		typeof execution?.retriesUsed === "number" && execution.retriesUsed > 0
			? execution.retriesUsed
			: 0;

	let message = `I couldn't verify a successful ${scopedDomains} tool result after ${attemptCount} attempt${attemptCount === 1 ? "" : "s"}${retriesUsed > 0 ? ` (${retriesUsed} retr${retriesUsed === 1 ? "y" : "ies"})` : ""}.`;

	if (execution?.hadRelevantToolStart) {
		message += " Relevant integration tools were called, but no successful result was returned.";
	} else {
		message += " No relevant integration tool call was observed in this response.";
	}

	if (execution?.relevantToolErrors > 0) {
		const resolvedToolName = getNonEmptyString(execution?.lastRelevantToolName);
		const lastErrorPreview = trimPreview(execution?.lastRelevantError, 200);
		const category = getNonEmptyString(execution?.lastRelevantErrorCategory) ?? "unknown";
		message += ` Relevant tool calls reported ${execution.relevantToolErrors} error${execution.relevantToolErrors === 1 ? "" : "s"}.`;
		if (resolvedToolName) {
			message += ` Last relevant tool: ${resolvedToolName}.`;
		}
		if (lastErrorPreview) {
			message += ` Last error: ${lastErrorPreview}.`;
		}
		if (category === "auth") {
			message += " Re-authenticate the integration connection, then retry.";
		} else if (category === "permission") {
			message += " Check integration permissions/scopes for the requested resource, then retry.";
		} else if (category === "not_found") {
			message += " Provide the exact file URL or ID and retry.";
		} else if (category === "rate_limit") {
			message += " The integration is rate-limited; wait briefly and retry.";
		} else if (category === "transient_network") {
			message += " The integration call appears transiently unavailable; retry shortly.";
		} else {
			message += " Retry with exact resource identifiers (URL/ID) or re-authenticate the integration.";
		}
	} else if (!execution?.hadRelevantToolStart) {
		message += " Retry with explicit resource identifiers (URL/ID) so I can target a relevant tool call.";
	}

	if (rovoDevFallback) {
		message += " RovoDev tool execution was interrupted, so this response stayed in plain-text mode.";
	}

	message += " If you need a tool-grounded result, retry after resolving the issue above.";
	return message;
}

const TOOL_FIRST_FAILURE_PARAGRAPH_PATTERN =
	/(?:^|\n)\s*I couldn't verify a successful[\s\S]{0,900}?If you need a tool-grounded result, retry after resolving the issue above\.\s*(?=\n|$)/gi;

const TOOL_FIRST_FAILURE_SENTENCE_PATTERN =
	/(?:^|\n)\s*I couldn't verify a successful[^\n]*tool result after \d+ attempt(?:s)?(?: \(\d+ retr(?:y|ies)\))?\.[^\n]*(?=\n|$)/gi;

function stripToolFirstFailureNarrative(value) {
	if (typeof value !== "string" || value.length === 0) {
		return {
			text: typeof value === "string" ? value : "",
			replaced: false,
		};
	}

	let nextText = value;
	nextText = nextText.replace(TOOL_FIRST_FAILURE_PARAGRAPH_PATTERN, "\n");
	nextText = nextText.replace(TOOL_FIRST_FAILURE_SENTENCE_PATTERN, "\n");
	if (nextText === value) {
		return {
			text: value,
			replaced: false,
		};
	}

	nextText = nextText.replace(/[ \t]+\n/g, "\n");
	nextText = nextText.replace(/\n{3,}/g, "\n\n");
	nextText = nextText.trim();

	return {
		text: nextText,
		replaced: true,
	};
}

function buildToolFirstWarningPayload({
	policy,
	execution,
	rovoDevFallback = false,
} = {}) {
	const domainLabels = Array.isArray(policy?.domainLabels)
		&& policy.domainLabels.length > 0
		? policy.domainLabels
		: getDomainLabels(execution?.domains);
	const message = buildToolFirstTextFallback({
		policy,
		execution,
		rovoDevFallback,
	});
	const attempts =
		typeof execution?.attempts === "number" && Number.isFinite(execution.attempts)
			? execution.attempts
			: 1;
	const retriesUsed =
		typeof execution?.retriesUsed === "number"
		&& Number.isFinite(execution.retriesUsed)
		&& execution.retriesUsed >= 0
			? execution.retriesUsed
			: 0;
	const relevantToolErrors =
		typeof execution?.relevantToolErrors === "number"
		&& Number.isFinite(execution.relevantToolErrors)
		&& execution.relevantToolErrors >= 0
			? execution.relevantToolErrors
			: 0;

	return {
		message,
		domains: domainLabels,
		attempts,
		retriesUsed,
		hadRelevantToolStart: Boolean(execution?.hadRelevantToolStart),
		relevantToolErrors,
		lastRelevantToolName: getNonEmptyString(execution?.lastRelevantToolName),
		lastRelevantErrorCategory: getNonEmptyString(execution?.lastRelevantErrorCategory),
		lastRelevantError: getNonEmptyString(execution?.lastRelevantError),
		rovoDevFallback: Boolean(rovoDevFallback),
	};
}

module.exports = {
	TOOL_FIRST_DOMAIN_CONFIG,
	TOOL_FIRST_ENFORCEMENT_MODE_SOFT_RETRY,
	resolveToolFirstPolicy,
	isToolNameRelevant,
	createToolFirstExecutionState,
	recordToolFirstAttempt,
	recordToolThinkingEvent,
	hasRelevantToolSuccess,
	getToolFirstRetryDelayMs,
	buildToolFirstRetryInstruction,
	buildToolContextForGenui,
	classifyToolErrorCategory,
	buildToolFirstTextFallback,
	stripToolFirstFailureNarrative,
	buildToolFirstWarningPayload,
};
