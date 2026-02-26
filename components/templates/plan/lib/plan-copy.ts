export interface PlanModeCopy {
	heading: string;
	placeholder: string;
	illustration: {
		light: string;
		dark: string;
	};
	illustrationAlt: string;
}

const ASK_MODE_COPY: PlanModeCopy = {
	heading: "What do you need?",
	placeholder: "Ask, @mention, or / for actions",
	illustration: {
		light: "/illustration-ai/chat/light.svg",
		dark: "/illustration-ai/chat/dark.svg",
	},
	illustrationAlt: "Ask mode illustration",
};

const PLAN_MODE_COPY: PlanModeCopy = {
	heading: "Yo, tell me your problem",
	placeholder: "Let a team of AI minions solve your problem",
	illustration: {
		light: "/illustration-ai/write/light.svg",
		dark: "/illustration-ai/write/dark.svg",
	},
	illustrationAlt: "Plan mode illustration",
};

export function getPlanModeCopy(isPlanMode: boolean): PlanModeCopy {
	return isPlanMode ? PLAN_MODE_COPY : ASK_MODE_COPY;
}
