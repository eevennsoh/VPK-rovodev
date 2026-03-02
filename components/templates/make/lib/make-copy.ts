export interface PlanModeCopy {
	heading: string;
	placeholder: string;
	illustration: {
		light: string;
		dark: string;
	};
	illustrationAlt: string;
}

const DEFAULT_COPY: PlanModeCopy = {
	heading: "What are we making?",
	placeholder: "Describe what you'd like to make",
	illustration: {
		light: "/illustration-ai/code/light.svg",
		dark: "/illustration-ai/code/dark.svg",
	},
	illustrationAlt: "Make illustration",
};

export function getPlanModeCopy(): PlanModeCopy {
	return DEFAULT_COPY;
}

export interface ChatTabCopy {
	heading: string;
	placeholder: string;
	illustration: {
		light: string;
		dark: string;
	};
	illustrationAlt: string;
}

const DEFAULT_CHAT_TAB_COPY: ChatTabCopy = {
	heading: "How can I help?",
	placeholder: "Ask anything, or describe what you'd like to build",
	illustration: {
		light: "/illustration-ai/chat/light.svg",
		dark: "/illustration-ai/chat/dark.svg",
	},
	illustrationAlt: "Chat illustration",
};

export function getChatTabCopy(): ChatTabCopy {
	return DEFAULT_CHAT_TAB_COPY;
}

export const BRIDGE_CARD_IN_PROGRESS = "Plan in progress — View in Make tab";
export const BRIDGE_CARD_QUEUED = "Plan queued — View in Make tab";
export const SIDEBAR_SECTION_CHAT = "Chat";
export const SIDEBAR_SECTION_MAKE = "Make";
export const SIDEBAR_EMPTY_CHAT = "No conversations yet";
export const SIDEBAR_EMPTY_MAKE = "No projects yet";
export const NEW_CHAT_BUTTON = "New chat";
export const NEW_PROJECT_BUTTON = "New project";
