/**
 * Rovo Chat Suggestions
 *
 * Static catalog of skill/prompt suggestions for the Rovo chat sidebar.
 */

import type { ComponentType } from "react";

// Icon imports - these will be used by consuming components
import TimelineIcon from "@atlaskit/icon/core/timeline";
import EditIcon from "@atlaskit/icon/core/edit";

export interface RovoSuggestion {
	id: string;
	label: string;
	/** Local icon component for skills - uses any to accommodate icon props */
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	icon?: ComponentType<any>;
	/** Image path for prompts with rich illustrations */
	imageSrc?: string;
	/** Indicates if this is a "skill" (icon) or "prompt" (rich illustration) */
	type: "skill" | "prompt";
}

/**
 * Default suggestions shown in the chat greeting
 * Showcases RovoDev's tool coverage across Atlassian and external apps
 */
export const defaultSuggestions: RovoSuggestion[] = [
	{
		id: "work-last-7-days",
		label: "Last 7 days of work",
		icon: TimelineIcon,
		type: "skill",
	},
	{
		id: "draft-confluence-page",
		label: "Draft Confluence page",
		icon: EditIcon,
		type: "skill",
	},
	{
		id: "figma-design-context",
		label: "Get Figma design context",
		imageSrc: "/3p/figma/16.svg",
		type: "prompt",
	},
	{
		id: "send-slack-message",
		label: "Send Slack message",
		imageSrc: "/3p/slack/16-borderless.svg",
		type: "prompt",
	},
	{
		id: "list-google-drive",
		label: "List Google Drive files",
		imageSrc: "/3p/google-drive/16-borderless.svg",
		type: "prompt",
	},
	{
		id: "list-google-calendar-events",
		label: "List Google Calendar events",
		imageSrc: "/3p/google-calendar/16-borderless.svg",
		type: "prompt",
	},
];
