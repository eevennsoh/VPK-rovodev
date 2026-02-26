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
	heading: "What are we building?",
	placeholder: "Ask, @mention, or / for actions",
	illustration: {
		light: "/illustration-ai/code/light.svg",
		dark: "/illustration-ai/code/dark.svg",
	},
	illustrationAlt: "Maker illustration",
};

export function getPlanModeCopy(_isPlanMode: boolean): PlanModeCopy {
	return DEFAULT_COPY;
}
