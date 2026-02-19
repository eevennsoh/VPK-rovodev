import type { Spec } from "@json-render/react";

export type GenerativeContentType = "image" | "sound" | "chart" | "ui" | "other";

export interface ParsedGenerativeWidgetSource {
	name?: string;
	logoSrc?: string;
}

interface ParsedGenerativeWidgetBase {
	title?: string;
	description?: string;
	source: ParsedGenerativeWidgetSource | null;
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
	sourceName?: string;
	sourceLogoSrc?: string;
}

const CHART_SPEC_TYPE_MATCHER = /chart|graph|plot|radar|pie|bar|line|area/i;
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

	return {
		...(title ? { title } : {}),
		...(description ? { description } : {}),
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
	for (const value of Object.values(widget.spec.elements ?? {})) {
		if (!isObjectRecord(value)) {
			continue;
		}

		const typeName = getNonEmptyString(value.type);
		if (!typeName) {
			continue;
		}

		if (CHART_SPEC_TYPE_MATCHER.test(typeName)) {
			return "chart";
		}
	}

	return "ui";
}

function resolveContentType(widget: ParsedGenerativeWidget): GenerativeContentType {
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

	if (contentType === "chart") {
		return "Generated chart preview";
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
		sourceName: widget.source?.name,
		sourceLogoSrc: widget.source?.logoSrc,
	};
}
