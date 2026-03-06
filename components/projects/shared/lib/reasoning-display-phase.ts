import type { ReasoningPhase } from "@/components/projects/shared/hooks/use-reasoning-phase";

interface ResolveThinkingIndicatorVisibilityOptions {
	requestActive: boolean;
	hasThinkingStatusInline: boolean;
	hasBackendThinkingActivity: boolean;
	reasoningPhase: ReasoningPhase;
}

interface ThinkingIndicatorVisibility {
	shouldShowPreloader: boolean;
	shouldShowThinkingStatus: boolean;
	shouldShowAny: boolean;
}

export function resolveThinkingIndicatorVisibility({
	requestActive,
	hasThinkingStatusInline,
	hasBackendThinkingActivity,
	reasoningPhase,
}: Readonly<ResolveThinkingIndicatorVisibilityOptions>): ThinkingIndicatorVisibility {
	const shouldShowPreloader =
		requestActive &&
		!hasThinkingStatusInline &&
		!hasBackendThinkingActivity;

	const shouldShowThinkingStatus =
		!hasThinkingStatusInline &&
		hasBackendThinkingActivity &&
		(requestActive || reasoningPhase === "completed");

	return {
		shouldShowPreloader,
		shouldShowThinkingStatus,
		shouldShowAny: shouldShowPreloader || shouldShowThinkingStatus,
	};
}
