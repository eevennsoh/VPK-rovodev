import type { GenerativeContentType } from "@/components/projects/shared/lib/generative-widget";

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

const CONTENT_TYPE_LABELS: Record<string, string> = {
	image: "Image",
	text: "Text",
	translation: "Translation",
	message: "Message",
	calendar: "Calendar",
	"chart-bar": "Bar chart",
	"chart-line": "Line chart",
	"chart-area": "Area chart",
	"chart-pie": "Pie chart",
	"chart-radar": "Radar chart",
	"chart-scatter": "Scatter chart",
	chart: "Chart",
	sound: "Audio",
	video: "Video",
	"work-item": "Work item",
	page: "Page",
	board: "Board",
	table: "Table",
	code: "Code",
	ui: "UI",
};

export function formatContentTypeLabel(contentType: GenerativeContentType): string {
	return CONTENT_TYPE_LABELS[contentType] ?? "Content";
}
