"use client";

import { useCallback, useState } from "react";
import type { ParsedPlanWidgetPayload } from "@/components/templates/shared/lib/plan-widget";
import type { ParsedQuestionCardPayload } from "@/components/templates/shared/lib/question-card-widget";

interface UseDismissibleCardsOptions {
	activeQuestionCard: ParsedQuestionCardPayload | null;
	activePlanWidget: ParsedPlanWidgetPayload | null;
	/** Called when a question card is dismissed/skipped. Use to notify the backend. */
	onDismissQuestionCard?: (questionCard: ParsedQuestionCardPayload) => void;
}

interface UseDismissibleCardsReturn {
	shouldShowQuestionCard: boolean;
	shouldShowApprovalCard: boolean;
	hasBottomOverlayCard: boolean;
	activeQuestionCardKey: string | null;
	activePlanKey: string | null;
	/** Hides the question card without triggering the dismiss callback (for submit — user answered). */
	hideQuestionCard: () => void;
	/** Dismisses the question card AND triggers the dismiss callback (for skip/escape — user did NOT answer). */
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
	onDismissQuestionCard,
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

	const hideQuestionCard = useCallback(() => {
		setDismissedQuestionCardKey(activeQuestionCardKey);
	}, [activeQuestionCardKey]);

	const dismissQuestionCard = useCallback(() => {
		setDismissedQuestionCardKey(activeQuestionCardKey);
		if (activeQuestionCard) {
			onDismissQuestionCard?.(activeQuestionCard);
		}
	}, [activeQuestionCardKey, activeQuestionCard, onDismissQuestionCard]);

	const dismissApprovalCard = useCallback(() => {
		setDismissedApprovalCardKey(activePlanKey);
	}, [activePlanKey]);

	return {
		shouldShowQuestionCard,
		shouldShowApprovalCard,
		hasBottomOverlayCard,
		activeQuestionCardKey,
		activePlanKey,
		hideQuestionCard,
		dismissQuestionCard,
		dismissApprovalCard,
	};
}
