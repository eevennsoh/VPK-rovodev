"use client";

import { useState } from "react";
import type { ParsedPlanWidgetPayload } from "@/components/templates/shared/lib/plan-widget";
import type { ParsedQuestionCardPayload } from "@/components/templates/shared/lib/question-card-widget";

interface UseDismissibleCardsOptions {
	activeQuestionCard: ParsedQuestionCardPayload | null;
	activePlanWidget: ParsedPlanWidgetPayload | null;
}

interface UseDismissibleCardsReturn {
	shouldShowQuestionCard: boolean;
	shouldShowApprovalCard: boolean;
	hasBottomOverlayCard: boolean;
	activeQuestionCardKey: string | null;
	activePlanKey: string | null;
	dismissQuestionCard: () => void;
	dismissApprovalCard: () => void;
}

function deriveQuestionCardKey(card: ParsedQuestionCardPayload | null): string | null {
	if (!card) return null;
	return `${card.sessionId}-${card.round}`;
}

function derivePlanKey(plan: ParsedPlanWidgetPayload | null): string | null {
	if (!plan) return null;
	return `${plan.title}-${plan.tasks.map((t) => t.id).join("|")}`;
}

export function useDismissibleCards({
	activeQuestionCard,
	activePlanWidget,
}: Readonly<UseDismissibleCardsOptions>): UseDismissibleCardsReturn {
	const [dismissedQuestionCardKey, setDismissedQuestionCardKey] = useState<string | null>(
		null
	);
	const [dismissedApprovalCardKey, setDismissedApprovalCardKey] = useState<string | null>(
		null
	);

	const activeQuestionCardKey = deriveQuestionCardKey(activeQuestionCard);
	const activePlanKey = derivePlanKey(activePlanWidget);

	const shouldShowQuestionCard =
		activeQuestionCard !== null && dismissedQuestionCardKey !== activeQuestionCardKey;

	const shouldShowApprovalCard =
		!shouldShowQuestionCard &&
		activePlanWidget !== null &&
		dismissedApprovalCardKey !== activePlanKey;

	const hasBottomOverlayCard = shouldShowQuestionCard || shouldShowApprovalCard;

	function dismissQuestionCard() {
		setDismissedQuestionCardKey(activeQuestionCardKey);
	}

	function dismissApprovalCard() {
		setDismissedApprovalCardKey(activePlanKey);
	}

	return {
		shouldShowQuestionCard,
		shouldShowApprovalCard,
		hasBottomOverlayCard,
		activeQuestionCardKey,
		activePlanKey,
		dismissQuestionCard,
		dismissApprovalCard,
	};
}
