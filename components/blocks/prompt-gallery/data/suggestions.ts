import AiGenerativeTextSummaryIcon from "@atlaskit/icon/core/ai-generative-text-summary";
import PageIcon from "@atlaskit/icon/core/page";
import SearchIcon from "@atlaskit/icon/core/search";

export interface PromptGallerySuggestion {
	icon: typeof SearchIcon;
	label: string;
	prompt?: string;
}

export const DEFAULT_PROMPT_GALLERY_SUGGESTIONS: PromptGallerySuggestion[] = [
	{
		icon: AiGenerativeTextSummaryIcon,
		label: "Summarize this page",
		prompt: "Summarize this page into key points, decisions, and action items. Highlight anything that requires follow-up.",
	},
	{
		icon: SearchIcon,
		label: "Write a JQL query",
		prompt: "Write a JQL query to find all unresolved bugs with priority Critical or Blocker assigned to my team in the current sprint.",
	},
	{
		icon: PageIcon,
		label: "Draft release notes",
		prompt: "Write user-friendly release notes for the latest update. Group changes by category and highlight the most impactful changes.",
	},
] as const;
