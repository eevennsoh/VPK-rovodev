import type { Spec } from "@json-render/react";

export interface ParsedGenerativeWidgetSource {
	name?: string;
	logoSrc?: string;
}

interface ParsedGenerativeWidgetBase {
	title?: string;
	description?: string;
	primaryActionLabel?: string;
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
	primaryActionLabel?: string;
}

export interface GenerativeWidgetPrimaryActionPayload {
	widgetType: "genui-preview";
	actionLabel: string;
	title: string;
	description: string;
	formState: Record<string, unknown>;
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
const PRIMARY_ACTION_PREFERRED_LABEL_PATTERN =
	/\b(send|submit|save|create|post|publish|run|confirm|continue|apply|start)\b/i;
const PRIMARY_ACTION_DEPRIORITIZED_LABEL_PATTERN =
	/\b(cancel|close|back|dismiss|reset|clear)\b/i;
const PRIMARY_ACTION_EXCLUDED_LABEL_PATTERN = /\bopen\s+preview\b/i;

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
	let primaryActionLabel = readFirstNonEmptyString(payload, [
		"primaryActionLabel",
		"primaryCtaLabel",
		"actionLabel",
		"submitLabel",
		"ctaLabel",
	]);
	const actionsValue = payload.actions;
	if (!primaryActionLabel && isObjectRecord(actionsValue)) {
		const nestedPrimary = actionsValue.primary;
		if (isObjectRecord(nestedPrimary)) {
			primaryActionLabel = readFirstNonEmptyString(nestedPrimary, [
				"label",
				"text",
				"title",
			]);
		}

		if (!primaryActionLabel) {
			primaryActionLabel = readFirstNonEmptyString(actionsValue, [
				"primaryLabel",
				"submitLabel",
				"actionLabel",
			]);
		}
	}

	const contentTypeHint = readFirstNonEmptyString(payload, [
		...GENERATIVE_CONTENT_TYPE_HINT_KEYS,
	]);

	return {
		...(title ? { title } : {}),
		...(description ? { description } : {}),
		...(primaryActionLabel ? { primaryActionLabel } : {}),
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

function getSpecTraversalKeys(spec: Spec): string[] {
	const keys: string[] = [];
	const visited = new Set<string>();
	const elements = spec.elements ?? {};

	const visit = (key: string) => {
		if (!key || visited.has(key)) {
			return;
		}

		visited.add(key);
		keys.push(key);

		const element = elements[key];
		if (!isObjectRecord(element) || !Array.isArray(element.children)) {
			return;
		}

		for (const childKey of element.children) {
			if (typeof childKey === "string" && childKey.trim().length > 0) {
				visit(childKey);
			}
		}
	};

	visit(spec.root);
	for (const key of Object.keys(elements)) {
		visit(key);
	}

	return keys;
}

function getElementProps(element: Record<string, unknown>): Record<string, unknown> | null {
	return isObjectRecord(element.props) ? element.props : null;
}

function chooseBestTextCandidate(
	currentBest: { text: string; score: number; index: number } | null,
	candidate: { text: string; score: number; index: number }
): { text: string; score: number; index: number } {
	if (!currentBest) {
		return candidate;
	}

	if (candidate.score > currentBest.score) {
		return candidate;
	}

	if (candidate.score === currentBest.score && candidate.index < currentBest.index) {
		return candidate;
	}

	return currentBest;
}

function resolveGenuiTitleFromSpec(widget: ParsedGenuiPreviewWidget): string | undefined {
	const traversalKeys = getSpecTraversalKeys(widget.spec);
	let best: { text: string; score: number; index: number } | null = null;

	for (const [index, key] of traversalKeys.entries()) {
		const element = widget.spec.elements[key];
		if (!isObjectRecord(element)) {
			continue;
		}

		const elementType = getNonEmptyString(element.type);
		const props = getElementProps(element);
		if (!elementType || !props) {
			continue;
		}

		let candidateText: string | undefined;
		let score = 0;
		if (elementType === "PageHeader") {
			candidateText = getNonEmptyString(props.title);
			score = 140;
		} else if (elementType === "Heading") {
			candidateText = getNonEmptyString(props.text);
			const headingLevel = getNonEmptyString(props.level);
			score = headingLevel === "h1" ? 130 : headingLevel === "h2" ? 125 : 120;
		} else if (elementType === "Card") {
			candidateText = getNonEmptyString(props.title);
			score = 110;
		} else {
			candidateText = getNonEmptyString(props.title) ?? getNonEmptyString(props.text);
			score = 80;
		}

		if (!candidateText) {
			continue;
		}

		best = chooseBestTextCandidate(best, {
			text: candidateText,
			score,
			index,
		});
	}

	return best?.text;
}

function resolveGenuiDescriptionFromSpec(widget: ParsedGenuiPreviewWidget): string | undefined {
	const traversalKeys = getSpecTraversalKeys(widget.spec);
	let best: { text: string; score: number; index: number } | null = null;

	for (const [index, key] of traversalKeys.entries()) {
		const element = widget.spec.elements[key];
		if (!isObjectRecord(element)) {
			continue;
		}

		const elementType = getNonEmptyString(element.type);
		const props = getElementProps(element);
		if (!elementType || !props) {
			continue;
		}

		let candidateText: string | undefined;
		let score = 0;
		if (elementType === "PageHeader") {
			candidateText = getNonEmptyString(props.description);
			score = 140;
		} else if (elementType === "Card") {
			candidateText = getNonEmptyString(props.description);
			score = 120;
		} else if (elementType === "Text") {
			candidateText = getNonEmptyString(props.content);
			score = 100;
		} else {
			candidateText = getNonEmptyString(props.description);
			score = 80;
		}

		if (!candidateText || candidateText.length < 12) {
			continue;
		}

		best = chooseBestTextCandidate(best, {
			text: candidateText,
			score,
			index,
		});
	}

	return best?.text;
}

function scorePrimaryActionLabel(
	label: string,
	variant: string | undefined
): number {
	if (PRIMARY_ACTION_EXCLUDED_LABEL_PATTERN.test(label)) {
		return -1000;
	}

	let score = 0;
	if (PRIMARY_ACTION_PREFERRED_LABEL_PATTERN.test(label)) {
		score += 100;
	}

	if (PRIMARY_ACTION_DEPRIORITIZED_LABEL_PATTERN.test(label)) {
		score -= 120;
	}

	if (variant === "default") {
		score += 25;
	}

	if (variant === "outline" || variant === "ghost" || variant === "link") {
		score -= 20;
	}

	if (label.length > 40) {
		score -= 10;
	}

	return score;
}

function resolveGenuiPrimaryActionLabelFromSpec(
	widget: ParsedGenuiPreviewWidget
): string | undefined {
	const traversalKeys = getSpecTraversalKeys(widget.spec);
	let fallbackLabel: string | undefined;
	let bestLabel: { text: string; score: number } | null = null;

	for (const key of traversalKeys) {
		const element = widget.spec.elements[key];
		if (!isObjectRecord(element)) {
			continue;
		}

		if (getNonEmptyString(element.type) !== "Button") {
			continue;
		}

		const props = getElementProps(element);
		if (!props) {
			continue;
		}

		const label = getNonEmptyString(props.label);
		if (!label) {
			continue;
		}

		if (!fallbackLabel) {
			fallbackLabel = label;
		}

		const variant = getNonEmptyString(props.variant);
		const score = scorePrimaryActionLabel(label, variant);
		if (!bestLabel || score > bestLabel.score) {
			bestLabel = { text: label, score };
		}
	}

	if (bestLabel && bestLabel.score >= 0) {
		return bestLabel.text;
	}

	if (
		fallbackLabel &&
		!PRIMARY_ACTION_DEPRIORITIZED_LABEL_PATTERN.test(fallbackLabel) &&
		!PRIMARY_ACTION_EXCLUDED_LABEL_PATTERN.test(fallbackLabel)
	) {
		return fallbackLabel;
	}

	return undefined;
}

const CONTENT_TYPE_FALLBACK_TITLES: Partial<Record<GenerativeContentType, string>> = {
	"image": "Generated image",
	"sound": "Generated audio",
	"chart": "Generated chart preview",
	"chart-bar": "Generated chart preview",
	"chart-line": "Generated chart preview",
	"chart-area": "Generated chart preview",
	"chart-pie": "Generated chart preview",
	"chart-radar": "Generated chart preview",
	"chart-scatter": "Generated chart preview",
	"text": "Generated text draft",
	"work-item": "Generated work item",
	"page": "Generated page draft",
	"board": "Generated board preview",
	"table": "Generated table preview",
	"code": "Generated code snippet",
	"video": "Generated video draft",
	"ui": "Generated UI preview",
};

function resolveTitle(
	widget: ParsedGenerativeWidget,
	contentType: GenerativeContentType,
	derivedGenuiTitle?: string
): string {
	if (widget.title) {
		return clipText(widget.title, 72);
	}

	if (widget.type === "genui-preview" && derivedGenuiTitle) {
		return clipText(derivedGenuiTitle, 72);
	}

	if (widget.type === "image-preview" && widget.prompt) {
		return clipText(widget.prompt, 72);
	}

	if (widget.type === "audio-preview" && widget.transcript) {
		return clipText(widget.transcript, 72);
	}

	return CONTENT_TYPE_FALLBACK_TITLES[contentType] ?? "Generated content";
}

function resolveDescription(
	widget: ParsedGenerativeWidget,
	derivedGenuiDescription?: string
): string {
	if (widget.description) {
		return clipText(widget.description, 140);
	}

	if (widget.type === "image-preview") {
		if (widget.title && widget.prompt) {
			return clipText(widget.prompt, 140);
		}
		return "AI-generated image";
	}

	if (widget.type === "audio-preview") {
		if (widget.title && widget.transcript) {
			return clipText(widget.transcript, 140);
		}
		return "AI-generated audio";
	}

	if (widget.type === "genui-preview" && derivedGenuiDescription) {
		return clipText(derivedGenuiDescription, 140);
	}

	if (widget.type === "genui-preview" && widget.summary) {
		return clipText(widget.summary, 140);
	}

	return DEFAULT_DESCRIPTION;
}

function resolvePrimaryActionLabel(
	widget: ParsedGenerativeWidget,
	derivedGenuiPrimaryActionLabel?: string
): string | undefined {
	if (widget.type !== "genui-preview") {
		return undefined;
	}

	if (widget.primaryActionLabel) {
		return clipText(widget.primaryActionLabel, 40);
	}

	if (derivedGenuiPrimaryActionLabel) {
		return clipText(derivedGenuiPrimaryActionLabel, 40);
	}

	return undefined;
}

export function resolveGenerativeWidgetMetadata(
	widget: ParsedGenerativeWidget
): GenerativeWidgetMetadata {
	const contentType = resolveContentType(widget);
	const derivedGenuiTitle =
		widget.type === "genui-preview"
			? resolveGenuiTitleFromSpec(widget)
			: undefined;
	const derivedGenuiDescription =
		widget.type === "genui-preview"
			? resolveGenuiDescriptionFromSpec(widget)
			: undefined;
	const derivedGenuiPrimaryActionLabel =
		widget.type === "genui-preview"
			? resolveGenuiPrimaryActionLabelFromSpec(widget)
			: undefined;
	const primaryActionLabel = resolvePrimaryActionLabel(
		widget,
		derivedGenuiPrimaryActionLabel
	);

	return {
		contentType,
		title: resolveTitle(widget, contentType, derivedGenuiTitle),
		description: resolveDescription(widget, derivedGenuiDescription),
		...(primaryActionLabel ? { primaryActionLabel } : {}),
	};
}

export function buildGenerativeWidgetSubmitPrompt(
	payload: GenerativeWidgetPrimaryActionPayload
): string {
	const serializedState = JSON.stringify(payload.formState ?? {}, null, 2);

	return [
		`Please execute "${payload.actionLabel}" for "${payload.title}".`,
		`Context: ${payload.description}`,
		"Use these form values:",
		"```json",
		serializedState,
		"```",
	].join("\n");
}

interface SpecTextSource {
	key: string;
	propName: string;
}

function findTitleSourceInSpec(widget: ParsedGenuiPreviewWidget): SpecTextSource | null {
	const traversalKeys = getSpecTraversalKeys(widget.spec);
	let best: { key: string; propName: string; score: number; index: number } | null = null;

	for (const [index, key] of traversalKeys.entries()) {
		const element = widget.spec.elements[key];
		if (!isObjectRecord(element)) continue;

		const elementType = getNonEmptyString(element.type);
		const props = getElementProps(element);
		if (!elementType || !props) continue;

		let candidateText: string | undefined;
		let propName = "title";
		let score = 0;

		if (elementType === "PageHeader") {
			candidateText = getNonEmptyString(props.title);
			propName = "title";
			score = 140;
		} else if (elementType === "Heading") {
			candidateText = getNonEmptyString(props.text);
			propName = "text";
			const headingLevel = getNonEmptyString(props.level);
			score = headingLevel === "h1" ? 130 : headingLevel === "h2" ? 125 : 120;
		} else if (elementType === "Card") {
			candidateText = getNonEmptyString(props.title);
			propName = "title";
			score = 110;
		} else {
			candidateText = getNonEmptyString(props.title);
			propName = "title";
			if (!candidateText) {
				candidateText = getNonEmptyString(props.text);
				propName = "text";
			}
			score = 80;
		}

		if (!candidateText) continue;

		if (!best || score > best.score || (score === best.score && index < best.index)) {
			best = { key, propName, score, index };
		}
	}

	return best ? { key: best.key, propName: best.propName } : null;
}

function findDescriptionSourceInSpec(widget: ParsedGenuiPreviewWidget): SpecTextSource | null {
	const traversalKeys = getSpecTraversalKeys(widget.spec);
	let best: { key: string; propName: string; score: number; index: number } | null = null;

	for (const [index, key] of traversalKeys.entries()) {
		const element = widget.spec.elements[key];
		if (!isObjectRecord(element)) continue;

		const elementType = getNonEmptyString(element.type);
		const props = getElementProps(element);
		if (!elementType || !props) continue;

		let candidateText: string | undefined;
		let propName = "description";
		let score = 0;

		if (elementType === "PageHeader") {
			candidateText = getNonEmptyString(props.description);
			propName = "description";
			score = 140;
		} else if (elementType === "Card") {
			candidateText = getNonEmptyString(props.description);
			propName = "description";
			score = 120;
		} else if (elementType === "Text") {
			candidateText = getNonEmptyString(props.content);
			propName = "content";
			score = 100;
		} else {
			candidateText = getNonEmptyString(props.description);
			propName = "description";
			score = 80;
		}

		if (!candidateText || candidateText.length < 12) continue;

		if (!best || score > best.score || (score === best.score && index < best.index)) {
			best = { key, propName, score, index };
		}
	}

	return best ? { key: best.key, propName: best.propName } : null;
}

const REMOVABLE_HEADER_TYPES = new Set(["PageHeader", "Heading", "Text"]);

export function createBodyOnlySpec(widget: ParsedGenuiPreviewWidget): Spec {
	const titleSource = findTitleSourceInSpec(widget);
	const descSource = findDescriptionSourceInSpec(widget);

	if (!titleSource && !descSource) {
		return widget.spec;
	}

	const propsToStrip = new Map<string, Set<string>>();
	for (const source of [titleSource, descSource]) {
		if (!source) continue;
		if (!propsToStrip.has(source.key)) {
			propsToStrip.set(source.key, new Set());
		}
		propsToStrip.get(source.key)!.add(source.propName);
	}

	const newElements: Record<string, unknown> = {};
	const keysToRemove = new Set<string>();

	for (const [key, element] of Object.entries(widget.spec.elements)) {
		if (!propsToStrip.has(key)) {
			newElements[key] = element;
			continue;
		}

		if (!isObjectRecord(element)) {
			newElements[key] = element;
			continue;
		}

		const props = getElementProps(element);
		if (!props) {
			newElements[key] = element;
			continue;
		}

		const stripSet = propsToStrip.get(key)!;
		const newProps: Record<string, unknown> = {};
		for (const [propKey, propVal] of Object.entries(props)) {
			if (!stripSet.has(propKey)) {
				newProps[propKey] = propVal;
			}
		}

		const elementType = getNonEmptyString(element.type);
		const hasChildren = Array.isArray(element.children) && element.children.length > 0;

		if (!hasChildren && elementType && REMOVABLE_HEADER_TYPES.has(elementType)) {
			keysToRemove.add(key);
		} else {
			newElements[key] = { ...element, props: newProps };
		}
	}

	if (keysToRemove.size > 0) {
		for (const [key, element] of Object.entries(newElements)) {
			if (!isObjectRecord(element) || !Array.isArray(element.children)) continue;

			const filtered = (element.children as unknown[]).filter(
				(childKey) => typeof childKey !== "string" || !keysToRemove.has(childKey)
			);

			if (filtered.length !== (element.children as unknown[]).length) {
				newElements[key] = { ...element, children: filtered };
			}
		}
	}

	if (keysToRemove.has(widget.spec.root)) {
		return widget.spec;
	}

	return {
		...widget.spec,
		elements: newElements,
	} as Spec;
}
