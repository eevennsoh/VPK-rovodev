const DEFAULT_MAX_TOOL_GROUPS = 24;
const DEFAULT_MAX_TOTAL_EVENTS = 160;
const DEFAULT_MAX_EVENTS_PER_TOOL = 40;
const DEFAULT_MAX_DETAIL_LINES_PER_EVENT = 18;
const DEFAULT_MAX_EVENT_PREVIEW_CHARS = 1600;
const DEFAULT_MAX_LINE_CHARS = 220;
const DEFAULT_MAX_LINKS_PER_EVENT = 4;
const MAX_SCAN_NODES = 1800;
const URL_PATTERN = /https?:\/\/[^\s<>"')\]}]+/gi;

function isObjectRecord(value) {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getNonEmptyString(value) {
	if (typeof value !== "string") {
		return null;
	}

	const trimmed = value.trim();
	return trimmed.length > 0 ? trimmed : null;
}

function clipText(value, maxChars = DEFAULT_MAX_LINE_CHARS) {
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

function toStructuredPayload(value) {
	if (value === null || value === undefined) {
		return null;
	}

	if (Array.isArray(value) || isObjectRecord(value)) {
		return value;
	}

	if (typeof value === "string") {
		return parseMaybeJson(value);
	}

	return null;
}

function normalizeToolName(toolName) {
	const normalized = getNonEmptyString(toolName);
	if (!normalized) {
		return "Tool";
	}

	return normalized
		.replace(/^mcp__/i, "")
		.replace(/^functions\./i, "")
		.replace(/__/g, " / ")
		.replace(/[_:/.-]+/g, " ")
		.replace(/\s+/g, " ")
		.trim();
}

function extractUrlsFromString(value) {
	if (typeof value !== "string") {
		return [];
	}

	const matches = value.match(URL_PATTERN);
	return Array.isArray(matches) ? matches : [];
}

function walkNodes(rootValue, visit, maxNodes = MAX_SCAN_NODES) {
	const queue = [{ value: rootValue, path: "" }];
	let visited = 0;

	while (queue.length > 0 && visited < maxNodes) {
		const { value, path } = queue.shift();
		if (value === undefined || value === null) {
			continue;
		}

		visited += 1;
		visit(value, path);

		if (Array.isArray(value)) {
			for (let index = 0; index < value.length; index += 1) {
				const childPath = path ? `${path}[${index}]` : `[${index}]`;
				queue.push({
					value: value[index],
					path: childPath,
				});
			}
			continue;
		}

		if (isObjectRecord(value)) {
			for (const [key, nestedValue] of Object.entries(value)) {
				const childPath = path ? `${path}.${key}` : key;
				queue.push({
					value: nestedValue,
					path: childPath,
				});
			}
		}
	}
}

function lineFromLeaf(path, value, maxChars) {
	const pathLabel = clipText(path || "value", 80);
	if (!pathLabel) {
		return null;
	}

	if (typeof value === "string") {
		const clippedValue = clipText(value, maxChars);
		if (!clippedValue) {
			return null;
		}
		return `${pathLabel}: ${clippedValue}`;
	}

	if (typeof value === "number" || typeof value === "boolean") {
		return `${pathLabel}: ${String(value)}`;
	}

	return null;
}

function collectDetailLinesFromStructuredPayload(
	payload,
	maxLines = DEFAULT_MAX_DETAIL_LINES_PER_EVENT,
	maxChars = DEFAULT_MAX_LINE_CHARS
) {
	if (!payload || (!Array.isArray(payload) && !isObjectRecord(payload))) {
		return [];
	}

	const lines = [];
	const seenLines = new Set();

	if (Array.isArray(payload)) {
		lines.push(`items: ${payload.length}`);
	}

	walkNodes(payload, (node, path) => {
		if (lines.length >= maxLines) {
			return;
		}

		if (Array.isArray(node)) {
			const pathLabel = clipText(path || "items", 80);
			if (!pathLabel) {
				return;
			}

			const arraySummary = `${pathLabel}: ${node.length} item${node.length === 1 ? "" : "s"}`;
			if (!seenLines.has(arraySummary)) {
				lines.push(arraySummary);
				seenLines.add(arraySummary);
			}
			return;
		}

		const leafLine = lineFromLeaf(path, node, maxChars);
		if (!leafLine || seenLines.has(leafLine)) {
			return;
		}

		lines.push(leafLine);
		seenLines.add(leafLine);
	});

	return lines.slice(0, maxLines);
}

function collectLinksFromObservation(observation, maxLinks = DEFAULT_MAX_LINKS_PER_EVENT) {
	const links = [];
	const seen = new Set();

	const pushLink = (candidate) => {
		const link = clipText(candidate, 300);
		if (!link || seen.has(link)) {
			return;
		}
		seen.add(link);
		links.push(link);
	};

	const previewText = getNonEmptyString(observation?.text);
	if (previewText) {
		for (const url of extractUrlsFromString(previewText)) {
			if (links.length >= maxLinks) {
				return links;
			}
			pushLink(url);
		}
	}

	const rawOutput =
		toStructuredPayload(observation?.rawOutput) ||
		toStructuredPayload(observation?.text);
	if (!rawOutput) {
		return links;
	}

	walkNodes(rawOutput, (node) => {
		if (links.length >= maxLinks) {
			return;
		}
		if (typeof node !== "string") {
			return;
		}

		for (const url of extractUrlsFromString(node)) {
			if (links.length >= maxLinks) {
				break;
			}
			pushLink(url);
		}
	});

	return links;
}

function collectDetailLinesFromObservation(
	observation,
	{
		maxLines = DEFAULT_MAX_DETAIL_LINES_PER_EVENT,
		maxChars = DEFAULT_MAX_LINE_CHARS,
	} = {}
) {
	const rawOutput =
		toStructuredPayload(observation?.rawOutput) ||
		toStructuredPayload(observation?.text);
	if (rawOutput) {
		return collectDetailLinesFromStructuredPayload(rawOutput, maxLines, maxChars);
	}

	const previewText = getNonEmptyString(observation?.text);
	if (!previewText) {
		return [];
	}

	const lines = previewText
		.split(/\r?\n/)
		.map((line) => clipText(line, maxChars))
		.filter(Boolean);

	return lines.slice(0, maxLines);
}

function toRenderableObservation(observation, index, options) {
	const phase =
		observation?.phase === "error" || observation?.phase === "result"
			? observation.phase
			: "result";
	const toolName = normalizeToolName(observation?.toolName);
	const preview = clipText(observation?.text || "", options.maxPreviewChars);
	const detailLines = collectDetailLinesFromObservation(observation, {
		maxLines: options.maxDetailLines,
		maxChars: options.maxLineChars,
	});
	const links = collectLinksFromObservation(observation, options.maxLinks);

	return {
		id: `${toolName.toLowerCase()}-${index}`,
		phase,
		toolName,
		preview,
		detailLines,
		links,
	};
}

function toObservationDedupeKey(observation) {
	if (!observation || typeof observation !== "object") {
		return null;
	}

	const phase = observation.phase === "result" || observation.phase === "error"
		? observation.phase
		: null;
	if (!phase) {
		return null;
	}

	const normalizedTool = normalizeToolName(observation.toolName).toLowerCase();
	const textFingerprint = clipText(
		getNonEmptyString(observation.text) || "",
		DEFAULT_MAX_EVENT_PREVIEW_CHARS
	);
	if (!textFingerprint) {
		return null;
	}

	return `${phase}|${normalizedTool}|${textFingerprint.toLowerCase()}`;
}

function dedupeObservations(observations) {
	const entries = Array.isArray(observations) ? observations : [];
	const deduped = [];
	const seenKeys = new Set();

	for (const observation of entries) {
		const key = toObservationDedupeKey(observation);
		if (!key) {
			continue;
		}

		if (seenKeys.has(key)) {
			continue;
		}

		seenKeys.add(key);
		deduped.push(observation);
	}

	return deduped;
}

function groupObservationsByTool(observations, options) {
	const groups = new Map();
	let order = 0;

	for (let index = 0; index < observations.length; index += 1) {
		const observation = observations[index];
		if (!observation || (observation.phase !== "result" && observation.phase !== "error")) {
			continue;
		}

		const renderableObservation = toRenderableObservation(observation, index, options);
		const groupKey = renderableObservation.toolName.toLowerCase();

		if (!groups.has(groupKey)) {
			groups.set(groupKey, {
				toolName: renderableObservation.toolName,
				order,
				observations: [],
			});
			order += 1;
		}

		groups.get(groupKey).observations.push(renderableObservation);
	}

	for (const group of groups.values()) {
		const resultObservations = group.observations.filter(
			(observation) => observation.phase === "result"
		);
		const errorObservations = group.observations.filter(
			(observation) => observation.phase === "error"
		);
		group.observations = [...resultObservations, ...errorObservations];
		group.hasResults = resultObservations.length > 0;
	}

	return Array.from(groups.values()).sort((left, right) => left.order - right.order);
}

function allocateGroupsAndEvents(
	groups,
	{
		maxToolGroups = DEFAULT_MAX_TOOL_GROUPS,
		maxTotalEvents = DEFAULT_MAX_TOTAL_EVENTS,
		maxEventsPerTool = DEFAULT_MAX_EVENTS_PER_TOOL,
	} = {}
) {
	const selectedGroups = groups.slice(0, maxToolGroups);
	let remainingEventBudget = maxTotalEvents;

	const renderedGroups = selectedGroups.map((group) => {
		const allowedForGroup = Math.max(
			0,
			Math.min(maxEventsPerTool, remainingEventBudget)
		);
		const renderedObservations = group.observations.slice(0, allowedForGroup);
		remainingEventBudget -= renderedObservations.length;

		return {
			toolName: group.toolName,
			hasResults: group.hasResults === true,
			total: group.observations.length,
			rendered: renderedObservations,
			omitted: group.observations.length - renderedObservations.length,
		};
	});

	const omittedGroups = groups.length - selectedGroups.length;
	const omittedEventsFromUnselectedGroups = groups
		.slice(maxToolGroups)
		.reduce((sum, group) => sum + group.observations.length, 0);
	const omittedEventsFromBudget = renderedGroups.reduce(
		(sum, group) => sum + group.omitted,
		0
	);

	return {
		renderedGroups,
		omittedGroups,
		omittedEvents: omittedEventsFromUnselectedGroups + omittedEventsFromBudget,
	};
}

function pushTextLine(elements, parentChildren, key, content, muted = false) {
	const line = clipText(content, DEFAULT_MAX_LINE_CHARS);
	if (!line) {
		return;
	}

	parentChildren.push(key);
	elements[key] = {
		type: "Text",
		props: {
			content: line,
			...(muted ? { muted: true } : {}),
		},
	};
}

function buildStructuredToolSpec({
	title,
	description,
	renderedGroups,
	resultCount,
	errorCount,
	omittedGroups,
	omittedEvents,
}) {
	const elements = {};
	const cardChildren = [];

	elements.root = {
		type: "Stack",
		props: { direction: "vertical", gap: "md" },
		children: ["summary-card"],
	};

	elements["summary-card"] = {
		type: "Card",
		props: {
			title,
			description,
		},
		children: cardChildren,
	};

	pushTextLine(
		elements,
		cardChildren,
		"summary-overview",
		`Tool results: ${resultCount} | Tool errors: ${errorCount} | Tools: ${renderedGroups.length}`,
		true
	);

	if (omittedGroups > 0 || omittedEvents > 0) {
		pushTextLine(
			elements,
			cardChildren,
			"summary-omitted",
			`${omittedGroups > 0 ? `${omittedGroups} tool group${omittedGroups === 1 ? "" : "s"} omitted` : "No tool groups omitted"}${
				omittedEvents > 0 ? ` | ${omittedEvents} tool event${omittedEvents === 1 ? "" : "s"} omitted` : ""
			}.`,
			true
		);
	}

	renderedGroups.forEach((group, groupIndex) => {
		const headingKey = `tool-group-heading-${groupIndex}`;
		cardChildren.push(headingKey);
		elements[headingKey] = {
			type: "Heading",
			props: {
				level: "h3",
				text: `${group.toolName} (${group.total})`,
			},
		};

		const groupListKey = `tool-group-list-${groupIndex}`;
		const groupChildren = [];
		cardChildren.push(groupListKey);
		elements[groupListKey] = {
			type: "Stack",
			props: { direction: "vertical", gap: "sm" },
			children: groupChildren,
		};

		group.rendered.forEach((event, eventIndex) => {
			const eventKey = `tool-group-${groupIndex}-event-${eventIndex}`;
			const eventChildren = [];
			groupChildren.push(eventKey);

			elements[eventKey] = {
				type: "Card",
				props: {
					title:
						event.phase === "error"
							? `Error ${eventIndex + 1}`
							: `Result ${eventIndex + 1}`,
					description: event.phase === "error"
						? group.hasResults
							? "Generated from tool execution errors (secondary context)."
							: "Generated from tool execution errors."
						: "Generated from tool execution results.",
				},
				children: eventChildren,
			};

			pushTextLine(
				elements,
				eventChildren,
				`${eventKey}-preview`,
				event.preview,
				true
			);

			event.detailLines.forEach((line, detailIndex) => {
				pushTextLine(
					elements,
					eventChildren,
					`${eventKey}-detail-${detailIndex}`,
					line,
					true
				);
			});

			event.links.forEach((href, linkIndex) => {
				const linkKey = `${eventKey}-link-${linkIndex}`;
				eventChildren.push(linkKey);
				elements[linkKey] = {
					type: "Link",
					props: {
						text: "Open link",
						href,
					},
				};
			});

			if (eventChildren.length > 0) {
				elements[eventKey].children = eventChildren;
			}
		});

		if (group.omitted > 0) {
			pushTextLine(
				elements,
				cardChildren,
				`tool-group-${groupIndex}-omitted`,
				`+${group.omitted} additional ${group.toolName} event${
					group.omitted === 1 ? "" : "s"
				} omitted.`,
				true
			);
		}
	});

	return {
		root: "root",
		elements,
	};
}

function resolveFallbackTitle(prompt, title) {
	const explicitTitle = clipText(title, 80);
	if (explicitTitle) {
		return explicitTitle;
	}

	const promptTitle = clipText(prompt, 80);
	if (promptTitle) {
		return promptTitle;
	}

	return "Tool Results";
}

function resolveFallbackDescription(description, { errorsOnly = false } = {}) {
	const explicitDescription = clipText(description, 140);
	if (explicitDescription) {
		return explicitDescription;
	}

	if (errorsOnly) {
		return "No successful tool results were returned. Showing error context and retry guidance.";
	}

	return "Generated from tool execution results and errors.";
}

function buildToolObservationStructuredFallback({
	observations,
	prompt,
	title,
	description,
	maxToolGroups = DEFAULT_MAX_TOOL_GROUPS,
	maxTotalEvents = DEFAULT_MAX_TOTAL_EVENTS,
	maxEventsPerTool = DEFAULT_MAX_EVENTS_PER_TOOL,
	maxDetailLinesPerEvent = DEFAULT_MAX_DETAIL_LINES_PER_EVENT,
	maxEventPreviewChars = DEFAULT_MAX_EVENT_PREVIEW_CHARS,
	maxLineChars = DEFAULT_MAX_LINE_CHARS,
	maxLinksPerEvent = DEFAULT_MAX_LINKS_PER_EVENT,
} = {}) {
	const entries = dedupeObservations(observations);
	if (entries.length === 0) {
		return null;
	}

	const groups = groupObservationsByTool(entries, {
		maxDetailLines: maxDetailLinesPerEvent,
		maxPreviewChars: maxEventPreviewChars,
		maxLineChars,
		maxLinks: maxLinksPerEvent,
	});
	if (groups.length === 0) {
		return null;
	}

	const boundedMaxToolGroups =
		typeof maxToolGroups === "number" && Number.isFinite(maxToolGroups) && maxToolGroups > 0
			? Math.min(Math.floor(maxToolGroups), 60)
			: DEFAULT_MAX_TOOL_GROUPS;
	const boundedMaxTotalEvents =
		typeof maxTotalEvents === "number" && Number.isFinite(maxTotalEvents) && maxTotalEvents > 0
			? Math.min(Math.floor(maxTotalEvents), 500)
			: DEFAULT_MAX_TOTAL_EVENTS;
	const boundedMaxEventsPerTool =
		typeof maxEventsPerTool === "number" &&
		Number.isFinite(maxEventsPerTool) &&
		maxEventsPerTool > 0
			? Math.min(Math.floor(maxEventsPerTool), 120)
			: DEFAULT_MAX_EVENTS_PER_TOOL;

	const allocation = allocateGroupsAndEvents(groups, {
		maxToolGroups: boundedMaxToolGroups,
		maxTotalEvents: boundedMaxTotalEvents,
		maxEventsPerTool: boundedMaxEventsPerTool,
	});
	const renderedEventsCount = allocation.renderedGroups.reduce(
		(sum, group) => sum + group.rendered.length,
		0
	);
	if (renderedEventsCount === 0) {
		return null;
	}

	const resultCount = entries.filter((entry) => entry?.phase === "result").length;
	const errorCount = entries.filter((entry) => entry?.phase === "error").length;
	const errorsOnly = resultCount === 0 && errorCount > 0;
	const resolvedTitle = resolveFallbackTitle(prompt, title);
	const resolvedDescription = resolveFallbackDescription(description, {
		errorsOnly,
	});
	const summaryBase = `Rendered ${renderedEventsCount} tool event${
		renderedEventsCount === 1 ? "" : "s"
	} across ${allocation.renderedGroups.length} tool${
		allocation.renderedGroups.length === 1 ? "" : "s"
	}.`;
	const summary =
		allocation.omittedGroups > 0 || allocation.omittedEvents > 0
			? `${summaryBase} ${allocation.omittedGroups > 0 ? `${allocation.omittedGroups} tool group${allocation.omittedGroups === 1 ? "" : "s"} omitted.` : ""}${
					allocation.omittedEvents > 0 ? ` ${allocation.omittedEvents} additional event${allocation.omittedEvents === 1 ? "" : "s"} omitted.` : ""
				}`.trim()
			: summaryBase;

	return {
		spec: buildStructuredToolSpec({
			title: resolvedTitle,
			description: resolvedDescription,
			renderedGroups: allocation.renderedGroups,
			resultCount,
			errorCount,
			omittedGroups: allocation.omittedGroups,
			omittedEvents: allocation.omittedEvents,
		}),
		summary,
		source: "tool-observation-structured",
		observationUsed: true,
		observationCount: entries.length,
		resultCount,
		errorCount,
		omittedGroups: allocation.omittedGroups,
		omittedEvents: allocation.omittedEvents,
	};
}

module.exports = {
	buildToolObservationStructuredFallback,
};
