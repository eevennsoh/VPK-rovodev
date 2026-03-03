"use client";

import { useCallback, useMemo, useState } from "react";
import type { RovoUIMessage } from "@/lib/rovo-ui-messages";
import { parsePlanWidgetPayload } from "@/components/templates/shared/lib/plan-widget";
import type { ParsedPlanWidgetPayload } from "@/components/templates/shared/lib/plan-widget";
import type { ParsedQuestionCardPayload } from "@/components/templates/shared/lib/question-card-widget";
import { getPlanApprovalKeyFromPlanWidget } from "@/components/templates/shared/lib/plan-approval";

interface UseDismissibleCardsOptions {
	activeQuestionCard: ParsedQuestionCardPayload | null;
	activePlanWidget: ParsedPlanWidgetPayload | null;
	messages?: ReadonlyArray<RovoUIMessage>;
	scopeKey?: string | null;
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
	return getPlanApprovalKeyFromPlanWidget(plan);
}

function getLatestPlanKeyForMessage(message: RovoUIMessage): string | null {
	if (message.role !== "assistant") {
		return null;
	}

	for (let index = message.parts.length - 1; index >= 0; index -= 1) {
		const part = message.parts[index] as {
			type?: string;
			data?: { type?: unknown; payload?: unknown };
		};
		if (part.type !== "data-widget-data") {
			continue;
		}

		if (typeof part.data?.type !== "string" || part.data.type !== "plan") {
			continue;
		}

		const parsedPlanPayload = parsePlanWidgetPayload(part.data.payload);
		if (!parsedPlanPayload) {
			continue;
		}

		const planKey = getPlanApprovalKeyFromPlanWidget(parsedPlanPayload);
		if (planKey) {
			return planKey;
		}
	}

	return null;
}

function hasPersistedAutoAcceptApproval(options: {
	activePlanKey: string | null;
	messages: ReadonlyArray<RovoUIMessage>;
}): boolean {
	const { activePlanKey, messages } = options;
	if (!activePlanKey) {
		return false;
	}

	let latestPlanMessageIndex = -1;
	for (let index = messages.length - 1; index >= 0; index -= 1) {
		const message = messages[index];
		const planKey = getLatestPlanKeyForMessage(message);
		if (planKey !== activePlanKey) {
			continue;
		}

		latestPlanMessageIndex = index;
		break;
	}

	if (latestPlanMessageIndex === -1) {
		return false;
	}

	for (let index = latestPlanMessageIndex + 1; index < messages.length; index += 1) {
		const message = messages[index];
		if (message.role !== "user") {
			continue;
		}

		if (message.metadata?.source !== "plan-approval-submit") {
			continue;
		}

		if (message.metadata?.planApprovalDecision !== "auto-accept") {
			continue;
		}

		if (message.metadata?.planApprovalPlanKey !== activePlanKey) {
			continue;
		}

		return true;
	}

	return false;
}

export function useDismissibleCards({
	activeQuestionCard,
	activePlanWidget,
	messages = [],
	scopeKey = null,
	onDismissQuestionCard,
}: Readonly<UseDismissibleCardsOptions>): UseDismissibleCardsReturn {
	const [dismissedQuestionCardByScope, setDismissedQuestionCardByScope] = useState<
		Record<string, string | null>
	>({});
	const [dismissedApprovalCardByScope, setDismissedApprovalCardByScope] = useState<
		Record<string, string | null>
	>({});
	const resolvedScopeKey = scopeKey ?? "__default__";
	const dismissedQuestionCardKey = dismissedQuestionCardByScope[resolvedScopeKey] ?? null;
	const dismissedApprovalCardKey = dismissedApprovalCardByScope[resolvedScopeKey] ?? null;

	const activeQuestionCardKey = deriveQuestionCardKey(activeQuestionCard);
	const activePlanKey = derivePlanKey(activePlanWidget);
	const isPersistedAutoAccepted = useMemo(
		() =>
			hasPersistedAutoAcceptApproval({
				activePlanKey,
				messages,
			}),
		[activePlanKey, messages],
	);

	const shouldShowQuestionCard =
		activeQuestionCard !== null && dismissedQuestionCardKey !== activeQuestionCardKey;

	const shouldShowApprovalCard =
		!shouldShowQuestionCard &&
		activePlanWidget !== null &&
		dismissedApprovalCardKey !== activePlanKey &&
		!isPersistedAutoAccepted;

	const hasBottomOverlayCard = shouldShowQuestionCard || shouldShowApprovalCard;

	const hideQuestionCard = useCallback(() => {
		setDismissedQuestionCardByScope((previousState) => ({
			...previousState,
			[resolvedScopeKey]: activeQuestionCardKey,
		}));
	}, [activeQuestionCardKey, resolvedScopeKey]);

	const dismissQuestionCard = useCallback(() => {
		setDismissedQuestionCardByScope((previousState) => ({
			...previousState,
			[resolvedScopeKey]: activeQuestionCardKey,
		}));
		if (activeQuestionCard) {
			onDismissQuestionCard?.(activeQuestionCard);
		}
	}, [
		activeQuestionCardKey,
		activeQuestionCard,
		onDismissQuestionCard,
		resolvedScopeKey,
	]);

	const dismissApprovalCard = useCallback(() => {
		setDismissedApprovalCardByScope((previousState) => ({
			...previousState,
			[resolvedScopeKey]: activePlanKey,
		}));
	}, [activePlanKey, resolvedScopeKey]);

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
