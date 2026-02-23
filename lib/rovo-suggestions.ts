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
	"Use exactly 2 tool calls for this request:",
	"1. One `search_jira_using_jql` call for Jira issues assigned to or updated by the current user in the last 7 days.",
	"2. One `search_confluence_using_cql` call using `contributor = currentUser()` to cover both created and edited pages in a single query.",
	"Do not make additional tool calls beyond these two. Present results from both sources in your response.",
	"[End Tool Requirement]",
].join("\n");

/**
 * The actual prompt sent to the AI when the "Last 7 days of work" suggestion is clicked.
 * Includes "from Jira and Confluence" so RovoDev naturally selects the right tools.
 * The user-visible label remains short ("Last 7 days of work").
 */
const LAST_7_DAYS_PROMPT =
	"Search for all work I have done in the last 7 days from Jira and Confluence";

const GOOGLE_CALENDAR_LIST_EVENTS_PROMPT =
	"List Google Calendar events for today";

const GOOGLE_CALENDAR_LIST_EVENTS_CONTEXT = [
	"[Tool Requirement]",
	"For this request, use `google_google_calendar_atlassian_calendar_get_events`.",
	"Always include required parameters: `calendarId`, `timeMin`, and `timeMax`.",
	"If the user does not specify a calendar, use `calendarId: \"primary\"`.",
	"`timeMin` and `timeMax` must be strict UTC ISO 8601 timestamps.",
	"[End Tool Requirement]",
].join("\n");

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
		id: "draft-confluence-page",
		label: "Draft Confluence page",
		icon: EditIcon,
		type: "skill",
	},
	{
		id: "translate-text",
		label: "Translate this text",
		icon: TranslateIcon,
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
		prompt: GOOGLE_CALENDAR_LIST_EVENTS_PROMPT,
		contextDescription: GOOGLE_CALENDAR_LIST_EVENTS_CONTEXT,
		imageSrc: "/3p/google-calendar/16-borderless.svg",
		type: "prompt",
	},
];
