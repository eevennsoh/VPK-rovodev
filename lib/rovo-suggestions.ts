/**
 * Rovo Chat Suggestions
 *
 * Static catalog of skill/prompt suggestions for the Rovo chat sidebar.
 */

import type { ComponentType } from "react";

// Icon imports - these will be used by consuming components
import TimelineIcon from "@atlaskit/icon/core/timeline";
import EditIcon from "@atlaskit/icon/core/edit";
import TranslateIcon from "@atlaskit/icon/core/translate";

export interface RovoSuggestion {
	id: string;
	label: string;
	/** Prompt text sent to the AI — defaults to `label` if omitted */
	prompt?: string;
	/** Local icon component for skills - uses any to accommodate icon props */
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	icon?: ComponentType<any>;
	/** Image path for prompts with rich illustrations */
	imageSrc?: string;
	/** Hidden context attached when this suggestion is submitted */
	contextDescription?: string;
	/** Indicates if this is a "skill" (icon) or "prompt" (rich illustration) */
	type: "skill" | "prompt";
}

const LAST_7_DAYS_NO_TWG_CONTEXT = [
	"[Tool Guardrail]",
	"For this request, do not call any Teamwork Graph tools.",
	"Never use tools whose names start with or include: `twg_`, `twg_twg_`, or `teamwork_graph`.",
	"If TWG is unavailable, continue with a non-TWG best-effort summary instead of failing.",
	"[End Tool Guardrail]",
	"",
	"[Tool Requirement]",
	"You MUST search BOTH Jira AND Confluence for this request. Do not skip either source.",
	"Always call Jira search tools AND Confluence search tools, even if one returns empty results.",
	"Present results from both sources in your response.",
	"[End Tool Requirement]",
].join("\n");

/**
 * The actual prompt sent to the AI when the "Last 7 days of work" suggestion is clicked.
 * Includes "from Jira and Confluence" so RovoDev naturally selects the right tools.
 * The user-visible label remains short ("Last 7 days of work").
 */
const LAST_7_DAYS_PROMPT =
	"Search for all work I have done in the last 7 days from Jira and Confluence";

/**
 * Default suggestions shown in the chat greeting
 * Showcases RovoDev's tool coverage across Atlassian and external apps
 */
export const defaultSuggestions: RovoSuggestion[] = [
	{
		id: "work-last-7-days",
		label: "Last 7 days of work",
		prompt: LAST_7_DAYS_PROMPT,
		icon: TimelineIcon,
		contextDescription: LAST_7_DAYS_NO_TWG_CONTEXT,
		type: "skill",
	},
	{
		id: "translate-text",
		label: "Translate this text",
		icon: TranslateIcon,
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
		id: "list-google-calendar-events",
		label: "List Google Calendar events",
		imageSrc: "/3p/google-calendar/16-borderless.svg",
		type: "prompt",
	},
];
