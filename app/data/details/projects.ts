import type { ComponentDetail } from "@/app/data/component-detail-types";

export const PROJECT_DETAILS: Record<string, ComponentDetail> = {
	"layout": {
		description: "Application shell layout that composes ADS navigation, sidebar, and floating Rovo chat surfaces around page content.",
	},
	"make": {
		description: "The Make workspace with chat sidebar, team controls, and prompt-driven collaboration flow.",
	},
	"sidebar-chat": {
		description: "A sliding chat panel with message bubbles, greeting view, and integrated composer for conversational AI interfaces.",
	},
	"confluence": {
		description: "A document editing interface inspired by Confluence with rich text editing, bubble menus, and collaboration features.",
	},
	"jira": {
		description: "A Kanban board interface with draggable cards, column management, and detailed work item modals.",
	},
	"fullscreen-chat": {
		description: "A full AI chat interface with streaming responses, suggested questions, speech input, and customizable agents.",
	},
	"future-chat": {
		description: "A Vercel-style AI chat workspace with persistent thread history, local attachments, artifact editing, and RovoDev-backed streaming.",
		demoLayout: {
			previewHeight: "fixed",
		},
	},
	"search": {
		description: "A search results page with AI-powered summary panel, source cards carousel, and filterable result cards.",
	},
};
