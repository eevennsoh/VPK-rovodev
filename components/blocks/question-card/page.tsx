"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { QuestionCard } from "@/components/blocks/question-card/components/question-card";
import { QUESTION_CARD_DEMO_QUESTIONS } from "./data/questions";

export default function QuestionCardPage(): React.ReactElement {
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [key, setKey] = useState(0);
	const submitTimeoutRef = useRef<number | null>(null);

	useEffect(
		() => () => {
			if (submitTimeoutRef.current !== null) {
				window.clearTimeout(submitTimeoutRef.current);
			}
		},
		[],
	);

	const submitAnswers = useCallback(() => {
		if (isSubmitting) return;

		setIsSubmitting(true);
		if (submitTimeoutRef.current !== null) {
			window.clearTimeout(submitTimeoutRef.current);
		}
		submitTimeoutRef.current = window.setTimeout(() => {
			setIsSubmitting(false);
			submitTimeoutRef.current = null;
		}, 600);
	}, [isSubmitting]);

	const handleDismiss = useCallback(() => {
		if (submitTimeoutRef.current !== null) {
			window.clearTimeout(submitTimeoutRef.current);
			submitTimeoutRef.current = null;
		}
		setIsSubmitting(false);
		setKey((previous) => previous + 1);
	}, []);

	return <QuestionCard key={key} questions={QUESTION_CARD_DEMO_QUESTIONS} isSubmitting={isSubmitting} onSubmit={submitAnswers} onDismiss={handleDismiss} />;
}

export { QuestionCard } from "@/components/blocks/question-card/components/question-card";
export type { QuestionCardProps, QuestionCardQuestion, QuestionCardOption, QuestionCardAnswerValue, QuestionCardAnswers } from "@/components/blocks/question-card/components/question-card";
