/**
 * Loading messages shown during widget loading states
 */

export const HOTEL_LOADING_MESSAGES = [
	"Accessing calendar...",
	"Confirming travel policy...",
	"Searching hotels...",
] as const;

export const WIDGET_LOADING_MESSAGES: Record<string, string> = {
	"work-items": "Loading work items...",
	plan: "Drafting plan...",
	"question-card": "Preparing follow-up questions...",
	"genui-preview": "Generating interactive content...",
	"image-preview": "Generating image...",
	"audio-preview": "Generating audio...",
	default: "Loading widget...",
} as const;
