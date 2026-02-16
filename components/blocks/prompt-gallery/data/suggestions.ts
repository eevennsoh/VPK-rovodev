import ChartTrendUpIcon from "@atlaskit/icon/core/chart-trend-up";
import SearchIcon from "@atlaskit/icon/core/search";

export interface PromptGallerySuggestion {
	icon: typeof SearchIcon;
	label: string;
	prompt?: string;
}

export const DEFAULT_PROMPT_GALLERY_SUGGESTIONS: PromptGallerySuggestion[] = [
	{ icon: SearchIcon, label: "Find information" },
	{ icon: ChartTrendUpIcon, label: "Measure productivity" },
	{ icon: SearchIcon, label: "Find People" },
] as const;
