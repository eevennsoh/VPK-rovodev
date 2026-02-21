import type { QuestionCardOption, QuestionCardQuestion } from "@/components/blocks/question-card/types";

export type QuestionCardDemoOption = QuestionCardOption;
export type QuestionCardDemoQuestion = QuestionCardQuestion;

export const QUESTION_CARD_DEMO_QUESTIONS: ReadonlyArray<QuestionCardDemoQuestion> = [
	{
		id: "participation-model",
		label: "How should teams participate?",
		header: "Participation",
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
		header: "Communication",
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
		header: "Metrics",
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

export const QUESTION_CARD_SINGLE_SELECT_DEMO: ReadonlyArray<QuestionCardDemoQuestion> = [
	{
		id: "deployment-strategy",
		label: "Which deployment strategy should we use?",
		kind: "single-select",
		options: [
			{
				id: "blue-green",
				label: "Blue-green deployment",
				description: "Run two identical environments and switch traffic between them.",
			},
			{
				id: "canary",
				label: "Canary release",
				description: "Gradually roll out to a small subset of users before full deployment.",
			},
			{
				id: "rolling",
				label: "Rolling update",
				description: "Incrementally replace instances with the new version.",
			},
		],
	},
];

export const QUESTION_CARD_MULTI_SELECT_DEMO: ReadonlyArray<QuestionCardDemoQuestion> = [
	{
		id: "notification-channels",
		label: "Which notification channels should we enable?",
		kind: "multi-select",
		options: [
			{
				id: "email",
				label: "Email notifications",
				description: "Send digest emails for important updates and mentions.",
			},
			{
				id: "slack",
				label: "Slack integration",
				description: "Push real-time alerts to team Slack channels.",
			},
			{
				id: "in-app",
				label: "In-app notifications",
				description: "Show notification badges and a notification center in the product.",
			},
		],
	},
];
