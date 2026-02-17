"use client";

import { QuestionCard } from "@/components/blocks/question-card/components/question-card";
import type { QuestionCardAnswers } from "@/components/blocks/question-card/components/question-card";
import type { ClarificationAnswers, ParsedQuestionCardPayload } from "@/components/templates/shared/lib/question-card-widget";

interface ClarificationQuestionCardProps {
	questionCard: ParsedQuestionCardPayload;
	isSubmitting?: boolean;
	onSubmit: (answers: ClarificationAnswers) => void;
	onDismiss?: () => void;
}

export function ClarificationQuestionCard({ questionCard, isSubmitting, onSubmit, onDismiss }: Readonly<ClarificationQuestionCardProps>): React.ReactElement {
	return <QuestionCard questions={questionCard.questions} isSubmitting={isSubmitting} onSubmit={onSubmit as (answers: QuestionCardAnswers) => void} onDismiss={onDismiss} />;
}
