import { useMemo } from "react";
import {
	getAllDataParts,
	getLatestDataPart,
	getMessageText,
	getThinkingToolCallSummaries,
	type RovoRenderableUIMessage,
} from "@/lib/rovo-ui-messages";
import { useDynamicThinkingLabel } from "@/components/templates/shared/hooks/use-dynamic-thinking-label";
import {
	useReasoningPhase,
	getReasoningPropsForPhase,
	type ReasoningPhase,
	type ReasoningPhaseProps,
} from "@/components/templates/shared/hooks/use-reasoning-phase";
import {
	resolveThinkingLabelForSurface,
	SIDEBAR_THINKING_LABEL,
} from "@/components/templates/shared/lib/thinking-label-policy";

interface UseThinkingStatusOptions {
	messages: RovoRenderableUIMessage[];
	isRequestInFlight: boolean;
	isSubmitPending: boolean;
}

interface ThinkingStatusResult {
	shouldShowThinking: boolean;
	isAssistantAwaitingOutput: boolean;
	hasInlineThinkingStatus: boolean;
	resolvedThinkingLabel: string;
	trimmedReasoningContent: string;
	hasReasoningContent: boolean;
	thinkingToolCalls: ReturnType<typeof getThinkingToolCallSummaries>;
	hasThinkingToolCalls: boolean;
	hasThinkingDetails: boolean;
	streamingReasoningKey: string;
	lastMessage: RovoRenderableUIMessage | undefined;
	reasoningPhase: ReasoningPhase;
	reasoningPhaseProps: ReasoningPhaseProps;
}

export function useThinkingStatus({
	messages,
	isRequestInFlight,
	isSubmitPending,
}: Readonly<UseThinkingStatusOptions>): ThinkingStatusResult {
	const hasMessages = messages.length > 0;
	const lastMessage = messages[messages.length - 1];

	const isAssistantAwaitingOutput =
		isRequestInFlight &&
		hasMessages &&
		lastMessage?.role === "assistant" &&
		getMessageText(lastMessage) === "";

	const latestThinkingStatusPart =
		isAssistantAwaitingOutput && lastMessage
			? getLatestDataPart(lastMessage, "data-thinking-status")
			: null;
	const hasAssistantThinkingStatus = latestThinkingStatusPart !== null;

	const hasInlineThinkingStatus =
		lastMessage?.role === "assistant" &&
		getLatestDataPart(lastMessage, "data-thinking-status") !== null;

	const shouldShowThinking =
		isRequestInFlight &&
		!hasInlineThinkingStatus &&
		(
			(hasMessages &&
				(lastMessage?.role === "user" || isAssistantAwaitingOutput)) ||
			(isSubmitPending && !hasMessages)
		);

	const thinkingStatusParts = hasAssistantThinkingStatus
		? getAllDataParts(lastMessage, "data-thinking-status")
		: [];
	const thinkingStatusPart =
		thinkingStatusParts[thinkingStatusParts.length - 1] ?? null;
	const thinkingEventParts =
		hasAssistantThinkingStatus && lastMessage
			? getAllDataParts(lastMessage, "data-thinking-event")
			: [];
	const lastThinkingEventPart =
		thinkingEventParts[thinkingEventParts.length - 1] ?? null;

	const thinkingStatusUpdateSignal = useMemo(
		() =>
			[
				lastMessage?.id ?? "stream",
				`status-count:${thinkingStatusParts.length}`,
				`status-id:${thinkingStatusPart?.id ?? ""}`,
				`status-label:${thinkingStatusPart?.data.label ?? ""}`,
				`status-content:${thinkingStatusPart?.data.content ?? ""}`,
				`event-count:${thinkingEventParts.length}`,
				`event-id:${lastThinkingEventPart?.data.eventId ?? ""}`,
				`event-phase:${lastThinkingEventPart?.data.phase ?? ""}`,
			].join("|"),
		[
			lastMessage?.id,
			thinkingStatusParts.length,
			thinkingStatusPart?.id,
			thinkingStatusPart?.data.label,
			thinkingStatusPart?.data.content,
			thinkingEventParts.length,
			lastThinkingEventPart?.data.eventId,
			lastThinkingEventPart?.data.phase,
		]
	);

	const { label: dynamicThinkingLabel } = useDynamicThinkingLabel({
		baseLabel: thinkingStatusPart?.data.label ?? SIDEBAR_THINKING_LABEL,
		isStreaming: shouldShowThinking,
		updateSignal: thinkingStatusUpdateSignal,
		fallbackLabel: SIDEBAR_THINKING_LABEL,
	});

	const resolvedReasoningContent = hasAssistantThinkingStatus
		? thinkingStatusParts
				.map((part) => part.data.content)
				.filter(Boolean)
				.join("\n\n")
		: "";

	const thinkingToolCalls =
		hasAssistantThinkingStatus && lastMessage
			? getThinkingToolCallSummaries(lastMessage)
			: [];

	const trimmedReasoningContent = resolvedReasoningContent.trim();
	const hasReasoningContent = trimmedReasoningContent.length > 0;
	const hasThinkingToolCalls = thinkingToolCalls.length > 0;
	const hasThinkingDetails = hasReasoningContent || hasThinkingToolCalls;
	const streamingReasoningKey = lastMessage?.id ?? "stream";

	const hasMessageText =
		hasAssistantThinkingStatus ||
		(hasMessages &&
			lastMessage?.role === "assistant" &&
			getMessageText(lastMessage) !== "");

	const { phase: reasoningPhase, duration: reasoningDuration } =
		useReasoningPhase({
			isStreaming: isRequestInFlight,
			hasMessageText,
			responseKey: streamingReasoningKey,
			autoIdle: true,
		});
	const resolvedThinkingLabel = resolveThinkingLabelForSurface({
		baseLabel: dynamicThinkingLabel,
		surface: "sidebar",
		reasoningPhase,
	});

	const reasoningPhaseProps = getReasoningPropsForPhase(
		reasoningPhase,
		reasoningDuration,
		hasThinkingDetails
	);

	return {
		shouldShowThinking:
			shouldShowThinking || (reasoningPhase === "completed" && !hasInlineThinkingStatus),
		isAssistantAwaitingOutput,
		hasInlineThinkingStatus,
		resolvedThinkingLabel,
		trimmedReasoningContent,
		hasReasoningContent,
		thinkingToolCalls,
		hasThinkingToolCalls,
		hasThinkingDetails,
		streamingReasoningKey,
		lastMessage,
		reasoningPhase,
		reasoningPhaseProps,
	};
}
