import type { Spec } from "@json-render/react";

export interface ParsedGenerativeWidgetSource {
	name?: string;
	logoSrc?: string;
}

interface ParsedGenerativeWidgetBase {
	title?: string;
	description?: string;
	source: ParsedGenerativeWidgetSource | null;
	contentTypeHint?: string;
}

export interface ParsedGenuiPreviewWidget extends ParsedGenerativeWidgetBase {
	type: "genui-preview";
	spec: Spec;
	summary?: string;
}

export interface ParsedAudioPreviewWidget extends ParsedGenerativeWidgetBase {
	type: "audio-preview";
	audioUrl: string;
	mimeType?: string;
	transcript?: string;
}

export interface ParsedImagePreviewWidget extends ParsedGenerativeWidgetBase {
	type: "image-preview";
	images: Array<{
		url: string;
		mimeType?: string;
	}>;
	prompt?: string;
}

export type ParsedGenerativeWidget =
	| ParsedGenuiPreviewWidget
	| ParsedAudioPreviewWidget
	| ParsedImagePreviewWidget;

export interface GenerativeWidgetMetadata {
	contentType: GenerativeContentType;
	title: string;
	description: string;
}

const GENERATIVE_CONTENT_TYPE_HINT_KEYS = [
	"contentType",
	"generatedContentType",
	"artifactType",
	"outputType",
	"widgetContentType",
] as const;

export type GenerativeContentType =
	| "image"
	| "text"
	| "chart-bar"
	| "chart-line"
	| "chart-area"
	| "chart-pie"
	| "chart-radar"
	| "chart-scatter"
	| "chart"
	| "sound"
	| "video"
	| "work-item"
	| "page"
	| "board"
	| "table"
	| "code"
	| "ui"
	| "other";

const CONTENT_TYPE_HINT_MATCHERS: ReadonlyArray<{
	pattern: RegExp;
	contentType: GenerativeContentType;
}> = [
	{
		pattern: /\b(bar(?:\s|-)?chart|column(?:\s|-)?chart|histogram)\b/i,
		contentType: "chart-bar",
	},
	{
		pattern: /\b(line(?:\s|-)?chart|trend\s*chart|time\s*series)\b/i,
		contentType: "chart-line",
	},
	{
		pattern: /\b(area(?:\s|-)?chart)\b/i,
		contentType: "chart-area",
	},
	{
		pattern: /\b(pie(?:\s|-)?chart|donut(?:\s|-)?chart|doughnut(?:\s|-)?chart)\b/i,
		contentType: "chart-pie",
	},
	{
		pattern: /\b(radar(?:\s|-)?chart|spider(?:\s|-)?chart)\b/i,
		contentType: "chart-radar",
	},
	{
		pattern: /\b(scatter(?:\s|-)?plot|scatter(?:\s|-)?chart|bubble(?:\s|-)?chart|bubble\s*plot)\b/i,
		contentType: "chart-scatter",
	},
	{
		pattern: /\b(chart|graph|plot|visuali[sz]ation)\b/i,
		contentType: "chart",
	},
	{
		pattern: /\b(work\s*item|work-item|task|tasks|issue|issues|ticket|tickets|bug|bugs|story|epic|backlog)\b/i,
		contentType: "work-item",
	},
	{
		pattern: /\b(board|kanban|sprint\s*board)\b/i,
		contentType: "board",
	},
	{
		pattern: /\b(page|document|doc|docs|wiki|article)\b/i,
		contentType: "page",
	},
	{
		pattern: /\b(table|grid|spreadsheet|dataset)\b/i,
		contentType: "table",
	},
	{
		pattern: /\b(code|snippet|script|sql|query|json|markdown)\b/i,
		contentType: "code",
	},
	{
		pattern: /\b(audio|sound|voice(?:over)?|narration|podcast|speech)\b/i,
		contentType: "sound",
	},
	{
		pattern: /\b(video|clip|reel|movie)\b/i,
		contentType: "video",
	},
	{
		pattern: /\b(image|images|picture|photo|illustration|mockup|banner)\b/i,
		contentType: "image",
	},
	{
		pattern: /\b(text|summary|draft|copy|transcript|notes?)\b/i,
		contentType: "text",
	},
	{
		pattern: /\b(ui|interface|layout|form|dashboard)\b/i,
		contentType: "ui",
	},
];

const ELEMENT_TYPE_CONTENT_MATCHERS: ReadonlyArray<{
	pattern: RegExp;
	contentType: GenerativeContentType;
}> = [
	{ pattern: /\bbar\s*chart\b/i, contentType: "chart-bar" },
	{ pattern: /\bline\s*chart\b/i, contentType: "chart-line" },
	{ pattern: /\barea\s*chart\b/i, contentType: "chart-area" },
	{ pattern: /\bpie\s*chart\b/i, contentType: "chart-pie" },
	{ pattern: /\bradar\s*chart\b/i, contentType: "chart-radar" },
	{ pattern: /\bscatter\s*chart\b/i, contentType: "chart-scatter" },
	{ pattern: /\bbubble\s*chart\b/i, contentType: "chart-scatter" },
	{ pattern: /\btable\b/i, contentType: "table" },
	{ pattern: /\bpage\s*header\b/i, contentType: "page" },
	{ pattern: /\bwork\s*item\b/i, contentType: "work-item" },
	{ pattern: /\bboard\b/i, contentType: "board" },
	{ pattern: /\bcode\s*block\b/i, contentType: "code" },
	{ pattern: /\bimage\b/i, contentType: "image" },
	{ pattern: /\baudio\b/i, contentType: "sound" },
	{ pattern: /\bvideo\b/i, contentType: "video" },
	{ pattern: /\bchart\b/i, contentType: "chart" },
];
const DEFAULT_DESCRIPTION = "Generated from your request";

function isObjectRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null;
}

function getNonEmptyString(value: unknown): string | undefined {
	if (typeof value !== "string") {
		return undefined;
	}

	const trimmed = value.trim();
	return trimmed.length > 0 ? trimmed : undefined;
}

function normalizeHintText(value: string): string {
	return value
		.replace(/([a-z0-9])([A-Z])/g, "$1 $2")
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, " ")
		.trim();
}

function resolveContentTypeFromHint(value?: string): GenerativeContentType | null {
	if (!value) {
		return null;
	}

	const normalized = normalizeHintText(value);
	if (!normalized) {
		return null;
	}

	for (const matcher of CONTENT_TYPE_HINT_MATCHERS) {
		if (matcher.pattern.test(normalized)) {
			return matcher.contentType;
		}
	}

	return null;
}

function resolveContentTypeFromElementType(value: string): GenerativeContentType | null {
	const normalized = normalizeHintText(value);
	if (!normalized) {
		return null;
	}

	for (const matcher of ELEMENT_TYPE_CONTENT_MATCHERS) {
		if (matcher.pattern.test(normalized)) {
			return matcher.contentType;
		}
	}

	return null;
}

function readFirstNonEmptyString(record: Record<string, unknown>, keys: string[]): string | undefined {
	for (const key of keys) {
		const value = getNonEmptyString(record[key]);
		if (value) {
			return value;
		}
	}

	return undefined;
}

function clipText(text: string, maxLength: number): string {
	if (text.length <= maxLength) {
		return text;
	}

	return `${text.slice(0, maxLength - 1).trimEnd()}…`;
}

function parseExplicitSource(payload: Record<string, unknown>): ParsedGenerativeWidgetSource | null {
	const rootName = readFirstNonEmptyString(payload, [
		"sourceAppName",
		"sourceName",
		"sourceProduct",
		"sourceLabel",
	]);
	const rootLogoSrc = readFirstNonEmptyString(payload, [
		"sourceLogoSrc",
		"sourceLogo",
		"sourceIconSrc",
	]);

	let nestedName: string | undefined;
	let nestedLogoSrc: string | undefined;
	const sourceValue = payload.source;
	if (isObjectRecord(sourceValue)) {
		nestedName = readFirstNonEmptyString(sourceValue, [
			"appName",
			"name",
			"product",
			"label",
		]);
		nestedLogoSrc = readFirstNonEmptyString(sourceValue, [
			"logoSrc",
			"logo",
			"iconSrc",
			"imageSrc",
		]);
	}

	const name = rootName ?? nestedName;
	const logoSrc = rootLogoSrc ?? nestedLogoSrc;
	if (!name && !logoSrc) {
		return null;
	}

	return {
		...(name ? { name } : {}),
		...(logoSrc ? { logoSrc } : {}),
	};
}

function parseGenerativeWidgetBase(payload: Record<string, unknown>): ParsedGenerativeWidgetBase {
	const title = readFirstNonEmptyString(payload, [
		"title",
		"cardTitle",
		"widgetTitle",
	]);
	const description = readFirstNonEmptyString(payload, [
		"description",
		"cardDescription",
		"widgetDescription",
	]);

	const contentTypeHint = readFirstNonEmptyString(payload, [
		...GENERATIVE_CONTENT_TYPE_HINT_KEYS,
	]);

	return {
		...(title ? { title } : {}),
		...(description ? { description } : {}),
		...(contentTypeHint ? { contentTypeHint } : {}),
		source: parseExplicitSource(payload),
	};
}

function parseGenuiPreviewWidgetData(value: unknown): ParsedGenuiPreviewWidget | null {
	if (!isObjectRecord(value) || !isObjectRecord(value.spec)) {
		return null;
	}

	const rawSpec = value.spec;
	const root = typeof rawSpec.root === "string" ? rawSpec.root : "";
	const elements = isObjectRecord(rawSpec.elements) ? rawSpec.elements : null;
	if (!root.trim() || !elements || Object.keys(elements).length === 0) {
		return null;
	}

	const spec = {
		root,
		elements,
		...(Object.prototype.hasOwnProperty.call(rawSpec, "state")
			? { state: rawSpec.state }
			: {}),
	} as Spec;

	const summary = getNonEmptyString(value.summary);

	return {
		type: "genui-preview",
		spec,
		...(summary ? { summary } : {}),
		...parseGenerativeWidgetBase(value),
	};
}

function parseAudioPreviewWidgetData(value: unknown): ParsedAudioPreviewWidget | null {
	if (!isObjectRecord(value) || typeof value.audioUrl !== "string") {
		return null;
	}

	const audioUrl = value.audioUrl.trim();
	if (!audioUrl) {
		return null;
	}

	const mimeType = getNonEmptyString(value.mimeType);
	const transcript = getNonEmptyString(value.transcript);

	return {
		type: "audio-preview",
		audioUrl,
		...(mimeType ? { mimeType } : {}),
		...(transcript ? { transcript } : {}),
		...parseGenerativeWidgetBase(value),
	};
}

function parseImagePreviewWidgetData(value: unknown): ParsedImagePreviewWidget | null {
	if (!isObjectRecord(value) || !Array.isArray(value.images)) {
		return null;
	}

	const images = value.images
		.filter((entry): entry is Record<string, unknown> => isObjectRecord(entry))
		.map((entry) => ({
			url: typeof entry.url === "string" ? entry.url.trim() : "",
			mimeType: getNonEmptyString(entry.mimeType),
		}))
		.filter((entry) => entry.url.length > 0);
	if (images.length === 0) {
		return null;
	}

	const prompt = getNonEmptyString(value.prompt);

	return {
		type: "image-preview",
		images,
		...(prompt ? { prompt } : {}),
		...parseGenerativeWidgetBase(value),
	};
}

export function parseGenerativeWidget(
	widgetType: string,
	widgetData: unknown
): ParsedGenerativeWidget | null {
	if (widgetType === "genui-preview") {
		return parseGenuiPreviewWidgetData(widgetData);
	}

	if (widgetType === "audio-preview") {
		return parseAudioPreviewWidgetData(widgetData);
	}

	if (widgetType === "image-preview") {
		return parseImagePreviewWidgetData(widgetData);
	}

	return null;
}

function resolveGenuiContentType(widget: ParsedGenuiPreviewWidget): GenerativeContentType {
	const textHints = [
		widget.contentTypeHint,
		widget.title,
		widget.description,
		widget.summary,
	]
		.filter((value): value is string => typeof value === "string" && value.trim().length > 0)
		.join(" ");

	const hintedContentType = resolveContentTypeFromHint(textHints);
	if (hintedContentType) {
		return hintedContentType;
	}

	for (const value of Object.values(widget.spec.elements ?? {})) {
		if (!isObjectRecord(value)) {
			continue;
		}

		const typeName = getNonEmptyString(value.type);
		if (!typeName) {
			continue;
		}

		const inferredElementType = resolveContentTypeFromElementType(typeName);
		if (inferredElementType) {
			return inferredElementType;
		}
	}

	return "other";
}

function resolveContentType(widget: ParsedGenerativeWidget): GenerativeContentType {
	const explicitHint = resolveContentTypeFromHint(widget.contentTypeHint);
	if (explicitHint) {
		return explicitHint;
	}

	if (widget.type === "image-preview") {
		return "image";
	}

	if (widget.type === "audio-preview") {
		return "sound";
	}

	if (widget.type === "genui-preview") {
		return resolveGenuiContentType(widget);
	}

	return "other";
}

function resolveTitle(widget: ParsedGenerativeWidget, contentType: GenerativeContentType): string {
	if (widget.title) {
		return clipText(widget.title, 72);
	}

	if (contentType === "image") {
		return "Generated image";
	}

	if (contentType === "sound") {
		return "Generated audio";
	}

	if (
		contentType === "chart" ||
		contentType === "chart-bar" ||
		contentType === "chart-line" ||
		contentType === "chart-area" ||
		contentType === "chart-pie" ||
		contentType === "chart-radar" ||
		contentType === "chart-scatter"
	) {
		return "Generated chart preview";
	}

	if (contentType === "text") {
		return "Generated text draft";
	}

	if (contentType === "work-item") {
		return "Generated work item";
	}

	if (contentType === "page") {
		return "Generated page draft";
	}

	if (contentType === "board") {
		return "Generated board preview";
	}

	if (contentType === "table") {
		return "Generated table preview";
	}

	if (contentType === "code") {
		return "Generated code snippet";
	}

	if (contentType === "video") {
		return "Generated video draft";
	}

	if (contentType === "ui") {
		return "Generated UI preview";
	}

	return "Generated content";
}

function resolveDescription(widget: ParsedGenerativeWidget): string {
	if (widget.description) {
		return clipText(widget.description, 140);
	}

	if (widget.type === "image-preview" && widget.prompt) {
		return clipText(widget.prompt, 140);
	}

	if (widget.type === "audio-preview" && widget.transcript) {
		return clipText(widget.transcript, 140);
	}

	if (widget.type === "genui-preview" && widget.summary) {
		return clipText(widget.summary, 140);
	}

	return DEFAULT_DESCRIPTION;
}

export function resolveGenerativeWidgetMetadata(
	widget: ParsedGenerativeWidget
): GenerativeWidgetMetadata {
	const contentType = resolveContentType(widget);

	return {
		contentType,
		title: resolveTitle(widget, contentType),
		description: resolveDescription(widget),
	};
}
