/**
 * Rovo Chat Suggestions
 *
 * Static catalog of skill/prompt suggestions for the Rovo chat sidebar.
 */

import type { ComponentType } from "react";

// Icon imports - these will be used by consuming components
import LightbulbIcon from "@atlaskit/icon/core/lightbulb";
import BookOpenIcon from "@atlaskit/icon/core/book-with-bookmark";

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
 * Based on Figma design
 */
export const defaultSuggestions: RovoSuggestion[] = [
	{
		id: "collect-insights",
		label: "Collect insights",
		icon: LightbulbIcon,
		type: "skill",
	},
	{
		id: "organize-folder",
		label: "Organize folder",
		imageSrc: "/3p/google-drive/16-borderless.svg",
		type: "prompt",
	},
	{
		id: "send-message",
		label: "Send message",
		imageSrc: "/3p/slack/16-borderless.svg",
		type: "prompt",
	},
	{
		id: "conduct-surveys",
		label: "Conduct follow-up surveys",
		imageSrc: "/illustration-ai/search/light.svg",
		type: "prompt",
	},
	{
		id: "brainstorm-ideas",
		label: "Brainstorm ideas for project",
		imageSrc: "/illustration-ai/write/light.svg",
		type: "prompt",
	},
	{
		id: "discover-more",
		label: "Discover more prompts and skills",
		icon: BookOpenIcon,
		type: "skill",
	},
];
