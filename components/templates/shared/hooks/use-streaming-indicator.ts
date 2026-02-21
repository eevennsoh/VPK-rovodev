import { useMemo } from "react";
import {
	isRenderableRovoUIMessage,
	getAllDataParts,
	getLatestDataPart,
	getMessageText,
	getThinkingToolCallSummaries,
	type RovoUIMessage,
} from "@/lib/rovo-ui-messages";
import { useDynamicThinkingLabel } from "@/components/templates/shared/hooks/use-dynamic-thinking-label";

interface UseStreamingIndicatorOptions {
	isStreaming: boolean;
	isSubmitPending: boolean;
	thinkingLabel: string;
	reasoningContent?: string;
	streamingIndicatorVariant: "thinking" | "reasoning-expanded";
	streamingIndicatorMessages?: RovoUIMessage[];
	lastAssistantMessageId: string | null;
}

export interface StreamingIndicatorState {
	shouldShow: boolean;
	resolvedLabel: string;
	reasoningKey: string;
	shouldUseExpanded: boolean;
	trimmedContent: string;
	hasContent: boolean;
	hasToolCalls: boolean;
	hasDetails: boolean;
	thinkingToolCalls: ReturnType<typeof getThinkingToolCallSummaries>;
	lastSourceMessageId?: string;
}

export function useStreamingIndicatorState(
	uiMessages: RovoUIMessage[],
	options: Readonly<UseStreamingIndicatorOptions>
): StreamingIndicatorState {
	const {
		isStreaming,
		isSubmitPending,
		thinkingLabel,
		reasoningContent,
		streamingIndicatorVariant,
		streamingIndicatorMessages,
		lastAssistantMessageId,
	} = options;

	const sourceMessages = useMemo(
		() =>
			(streamingIndicatorMessages ?? uiMessages).filter(isRenderableRovoUIMessage),
		[streamingIndicatorMessages, uiMessages]
	);
	const lastSource = sourceMessages[sourceMessages.length - 1];

	const hasInlineThinkingStatus = useMemo(() => {
		if (!lastSource || lastSource.role !== "assistant") return false;
		if (lastSource.id !== lastAssistantMessageId) return false;
		return getLatestDataPart(lastSource, "data-thinking-status") !== null;
	}, [lastAssistantMessageId, lastSource]);

	const isAwaitingOutput =
		isStreaming &&
		lastSource?.role === "assistant" &&
		getMessageText(lastSource) === "";
	const hasThinkingStatus =
		isAwaitingOutput &&
		getLatestDataPart(lastSource, "data-thinking-status") !== null;

	const shouldShowFromStream =
		isStreaming &&
		sourceMessages.length > 0 &&
		(lastSource?.role === "user" || isAwaitingOutput) &&
		!hasInlineThinkingStatus;
	const shouldShow = shouldShowFromStream || isSubmitPending;

	const thinkingStatusParts = hasThinkingStatus
		? getAllDataParts(lastSource, "data-thinking-status")
		: [];
	const thinkingStatusPart =
		thinkingStatusParts[thinkingStatusParts.length - 1] ?? null;
	const thinkingEventParts =
		hasThinkingStatus && lastSource
			? getAllDataParts(lastSource, "data-thinking-event")
			: [];
	const lastThinkingEventPart =
		thinkingEventParts[thinkingEventParts.length - 1] ?? null;

	const thinkingStatusUpdateSignal = [
		lastSource?.id ?? "stream",
		`status-count:${thinkingStatusParts.length}`,
		`status-id:${thinkingStatusPart?.id ?? ""}`,
		`status-label:${thinkingStatusPart?.data.label ?? ""}`,
		`status-content:${thinkingStatusPart?.data.content ?? ""}`,
		`event-count:${thinkingEventParts.length}`,
		`event-id:${lastThinkingEventPart?.data.eventId ?? ""}`,
		`event-phase:${lastThinkingEventPart?.data.phase ?? ""}`,
	].join("|");

	const { label: resolvedLabel } = useDynamicThinkingLabel({
		baseLabel: thinkingStatusPart?.data.label ?? thinkingLabel,
		isStreaming: shouldShow,
		updateSignal: thinkingStatusUpdateSignal,
	});

	const resolvedContent = hasThinkingStatus
		? thinkingStatusParts
				.map((part) => part.data.content)
				.filter(Boolean)
				.join("\n\n") || reasoningContent
		: reasoningContent;

	const thinkingToolCalls =
		hasThinkingStatus && lastSource
			? getThinkingToolCallSummaries(lastSource)
			: [];

	const trimmedContent = resolvedContent?.trim() ?? "";
	const hasContent = trimmedContent.length > 0;
	const hasToolCalls = thinkingToolCalls.length > 0;

	return {
		shouldShow,
		resolvedLabel,
		reasoningKey: lastSource?.id ?? "stream",
		shouldUseExpanded: streamingIndicatorVariant === "reasoning-expanded",
		trimmedContent,
		hasContent,
		hasToolCalls,
		hasDetails: hasContent || hasToolCalls,
		thinkingToolCalls,
		lastSourceMessageId: lastSource?.id,
	};
}
