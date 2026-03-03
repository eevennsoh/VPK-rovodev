"use client";

import { AnswerCard } from "@/components/blocks/answer-card/components/answer-card";

const DEMO_ROWS = [
	{
		question: "What type of data should the dashboard display?",
		answer: "Product metrics",
	},
	{
		question: "Which chart types would you like to include?",
		answer: "Line charts and bar graphs",
	},
	{
		question: "Should the dashboard support real-time updates?",
		answer: "Yes, with 30-second refresh intervals",
	},
];

export default function AnswerCardPage(): React.ReactElement {
	return <AnswerCard rows={DEMO_ROWS} />;
}

export { AnswerCard } from "@/components/blocks/answer-card/components/answer-card";
export type { AnswerCardProps, AnswerCardRow } from "@/components/blocks/answer-card/components/answer-card";
