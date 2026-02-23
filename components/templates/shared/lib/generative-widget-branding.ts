import type { GenerativeContentType } from "@/components/templates/shared/lib/generative-widget";

export const GENERATIVE_CONTENT_TYPE_SUGGESTIONS: ReadonlyArray<GenerativeContentType> = [
	"image",
	"text",
	"translation",
	"message",
	"calendar",
	"chart-bar",
	"chart-line",
	"chart-area",
	"chart-pie",
	"chart-radar",
	"chart-scatter",
	"sound",
	"video",
	"work-item",
	"page",
	"board",
	"table",
	"code",
	"ui",
] as const;

export function formatContentTypeLabel(contentType: GenerativeContentType): string {
	if (contentType === "image") {
		return "Image";
	}

	if (contentType === "text") {
		return "Text";
	}

	if (contentType === "translation") {
		return "Translation";
	}

	if (contentType === "message") {
		return "Message";
	}

	if (contentType === "calendar") {
		return "Calendar";
	}

	if (contentType === "chart-bar") {
		return "Bar chart";
	}

	if (contentType === "chart-line") {
		return "Line chart";
	}

	if (contentType === "chart-area") {
		return "Area chart";
	}

	if (contentType === "chart-pie") {
		return "Pie chart";
	}

	if (contentType === "chart-radar") {
		return "Radar chart";
	}

	if (contentType === "chart-scatter") {
		return "Scatter chart";
	}

	if (contentType === "sound") {
		return "Audio";
	}

	if (contentType === "video") {
		return "Video";
	}

	if (contentType === "work-item") {
		return "Work item";
	}

	if (contentType === "page") {
		return "Page";
	}

	if (contentType === "board") {
		return "Board";
	}

	if (contentType === "table") {
		return "Table";
	}

	if (contentType === "code") {
		return "Code";
	}

	if (contentType === "chart") {
		return "Chart";
	}

	if (contentType === "ui") {
		return "UI";
	}

	return "Content";
}
