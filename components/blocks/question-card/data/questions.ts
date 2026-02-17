import type { QuestionCardOption, QuestionCardQuestion } from "@/components/blocks/question-card/components/question-card";

export type QuestionCardDemoOption = QuestionCardOption;
export type QuestionCardDemoQuestion = QuestionCardQuestion;

export const QUESTION_CARD_DEMO_QUESTIONS: ReadonlyArray<QuestionCardDemoQuestion> = [
	{
		id: "participation-model",
		label: "How should teams participate?",
		kind: "single-select",
		options: [
			{
				id: "team-led-flexibility",
				label: "Team-led flexibility (Recommended)",
				description: "Teams decide how to use Fridays, including remote work, focus time, and collaboration.",
			},
			{
				id: "company-wide-default",
				label: "Company-wide default",
				description: "Flexible Fridays are the default for everyone, with teams opting out when needed.",
			},
			{
				id: "individual-choice",
				label: "Individual choice with manager approval",
				description: "Employees choose whether to adopt Flexible Fridays, with manager approval.",
			},
		],
	},
	{
		id: "communication-plan",
		label: "How should rollout communication happen?",
		kind: "multi-select",
		options: [
			{
				id: "manager-briefings",
				label: "Manager briefings",
				description: "Share expectations in weekly manager syncs before launch.",
			},
			{
				id: "company-announcement",
				label: "Company-wide announcement",
				description: "Publish a launch post in company channels with a clear timeline.",
			},
			{
				id: "team-faq",
				label: "Team FAQ",
				description: "Maintain one source of truth for edge cases and eligibility.",
			},
		],
	},
	{
		id: "success-metric",
		label: "Which success signal should we prioritize first?",
		kind: "single-select",
		options: [
			{
				id: "focus-time-improvement",
				label: "Focus-time improvement",
				description: "Track reduction in meetings and increase in uninterrupted work blocks.",
			},
			{
				id: "employee-sentiment",
				label: "Employee sentiment",
				description: "Measure confidence and satisfaction in pulse surveys.",
			},
			{
				id: "delivery-predictability",
				label: "Delivery predictability",
				description: "Monitor sprint spillover and on-time milestone completion.",
			},
		],
	},
];
