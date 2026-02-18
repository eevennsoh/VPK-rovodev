import type { ComponentDetail } from "@/app/data/component-detail-types";

export const UTILITY_DETAILS: Record<string, ComponentDetail> = {
	"streamdown": {
		description: "A streaming-optimized React Markdown renderer with syntax highlighting, Mermaid diagrams, math rendering, and CJK support. Supports caret animation, interactive code controls, and both streaming and static rendering modes.",
	},
	"multiports": {
		description: "A lightweight utility preview for launching the three-panel Sidebar Chat multiport smoke-test surface. Use it to quickly jump into concurrent chat stream validation.",
	},
	"image-generation": {
		description: "An interactive test harness for image generation via AI Gateway. Sends prompts to /api/chat-sdk with provider: \"google\", streams SSE responses, and displays both text and generated images with download support. Configure AI_GATEWAY_URL_GOOGLE (preferred), or use a Google/Gemini AI_GATEWAY_URL, to enable native image generation.",
	},
	"sound-generation": {
		description: "An interactive text-to-speech harness that posts text input to /api/sound-generation, synthesizes voice output with tts-latest, and returns playable downloadable audio.",
	},
	"ui-generation": {
		description: "A client-side showcase of json-render, rendering structured JSON specs into live UI with data dashboards, interactive forms, chart visualizations, and 3D scenes powered by React Three Fiber.",
		demoLayout: { previewContentWidth: "full" },
	},
};
