"use client";

import { useMemo, type ReactNode } from "react";
import { useDynamicThinkingLabel } from "@/components/templates/shared/hooks/use-dynamic-thinking-label";
import {
	getAllDataParts,
	hasCreatePlanSkillSignal,
	getLatestDataPart,
	getMessageReasoning,
	getMessageSources,
	getMessageText,
	getThinkingToolCallSummaries,
	getToolFirstWarning,
	getMessageToolParts,
	isMessageTextStreaming,
	type RovoRenderableUIMessage,
	type RouteDecisionMeta,
} from "@/lib/rovo-ui-messages";
import type { ReasoningPhase } from "@/components/templates/shared/hooks/use-reasoning-phase";
import {
	Message as UiMessage,
} from "@/components/ui-ai/message";
import {
	extractPlanRenderableText,
	removeActionItemsSection,
	removeLeadingSingleCharacterFragment,
	removeTrailingSingleCharacterLine,
	sanitizeMarkdownArtifactMarkers,
	suppressToolJsonTrace,
} from "../lib/message-text-utils";
import { resolveThinkingLabelForSurface } from "../lib/thinking-label-policy";
import { UserMessageBubble } from "../components/user-message-bubble";
import { ThreadMessageContext, type ThreadMessageContextValue } from "./thread-message-context";

interface ThreadMessageRootProps {
	message: RovoRenderableUIMessage;
	surface: "sidebar" | "fullscreen";
	assistantStreamingRenderMode?: "rich" | "text-first";
	onDeleteMessage?: (messageId: string) => void;
	renderWidget?: (
		widget: { type: string; data: unknown },
		message: RovoRenderableUIMessage
	) => ReactNode;
	renderLoadingWidget?: (widgetType?: string) => ReactNode;
	children: ReactNode;
}

function useThreadMessageDerived(
	message: RovoRenderableUIMessage,
	surface: "sidebar" | "fullscreen",
	assistantStreamingRenderMode: "rich" | "text-first",
	renderWidget: ThreadMessageRootProps["renderWidget"],
	renderLoadingWidget: ThreadMessageRootProps["renderLoadingWidget"],
): ThreadMessageContextValue {
	const rawMessageText = getMessageText(message);
	const isStreaming = isMessageTextStreaming(message);

	// ---------- thinking status ----------
	const thinkingStatusPart = getLatestDataPart(message, "data-thinking-status");
	const allThinkingStatusParts = getAllDataParts(message, "data-thinking-status");
	const thinkingEventParts = getAllDataParts(message, "data-thinking-event");
	const lastThinkingEventPart =
		thinkingEventParts[thinkingEventParts.length - 1] ?? null;
	const thinkingStatusUpdateSignal = [
		message.id,
		`status-label:${thinkingStatusPart?.data.label ?? ""}`,
		`status-content:${thinkingStatusPart?.data.content ?? ""}`,
		`event-count:${thinkingEventParts.length}`,
		`event-id:${lastThinkingEventPart?.data.eventId ?? ""}`,
		`event-phase:${lastThinkingEventPart?.data.phase ?? ""}`,
	].join("|");
	const isRetryThinkingStatus =
		thinkingStatusPart?.data.label?.includes("Retrying") ?? false;
	const isThinkingStatusActive =
		Boolean(thinkingStatusPart) &&
		!(isRetryThinkingStatus && !isStreaming);
	const hasRawMessageText = rawMessageText.trim().length > 0;
	const thinkingStatusReasoningPhase: ReasoningPhase = (() => {
		if (!isThinkingStatusActive) return "idle";
		if (!hasRawMessageText) return "thinking";
		if (isStreaming) return "streaming";
		return "completed";
	})();
	const { label: dynamicThinkingStatusLabel } = useDynamicThinkingLabel({
		baseLabel: thinkingStatusPart?.data.label ?? "Thinking",
		isStreaming: isStreaming && isThinkingStatusActive,
		updateSignal: thinkingStatusUpdateSignal,
	});
	const resolvedThinkingStatusLabel = resolveThinkingLabelForSurface({
		baseLabel: dynamicThinkingStatusLabel,
		surface,
		reasoningPhase: thinkingStatusReasoningPhase,
	});

	// ---------- widget data ----------
	const widgetLoadingPart = getLatestDataPart(message, "data-widget-loading");
	const widgetDataPart = getLatestDataPart(message, "data-widget-data");
	const widgetErrorPart = getLatestDataPart(message, "data-widget-error");
	const suggestedQuestionsPart = getLatestDataPart(
		message,
		"data-suggested-questions"
	);
	const widgetType =
		widgetDataPart?.data.type ??
		widgetLoadingPart?.data.type ??
		widgetErrorPart?.data.type;
	const isWidgetLoading = widgetLoadingPart?.data.loading ?? false;

	// ---------- route decision ----------
	const routeDecisionPart = getLatestDataPart(message, "data-route-decision");
	const routeDecision: RouteDecisionMeta | null = routeDecisionPart?.data ?? null;
	const isFallbackTextRoute = routeDecision?.reason === "fallback_ui_failed";

	// ---------- message text processing ----------
	const normalizedWidgetText = widgetType
		? removeLeadingSingleCharacterFragment(rawMessageText)
		: rawMessageText;
	const isCreatePlanSkillFlow = hasCreatePlanSkillSignal(message);
	const isPlanWidgetFlow =
		widgetType === "plan" ||
		widgetLoadingPart?.data.type === "plan" ||
		widgetErrorPart?.data.type === "plan";
	const planRenderableText =
		widgetType === "plan" && isCreatePlanSkillFlow
			? extractPlanRenderableText(normalizedWidgetText, {
					maxSummaryLines: 2,
				})
			: null;
	const baseMessageText =
		widgetType === "question-card"
			? removeTrailingSingleCharacterLine(normalizedWidgetText)
			: widgetType === "plan"
				? isCreatePlanSkillFlow
					? planRenderableText?.text ?? ""
					: removeActionItemsSection(normalizedWidgetText)
				: normalizedWidgetText;

	// ---------- derived data ----------
	const suggestedQuestions = suggestedQuestionsPart?.data.questions ?? [];
	const reasoning = getMessageReasoning(message);
	const sources = getMessageSources(message);
	const toolFirstWarning = getToolFirstWarning(message);
	const toolParts = getMessageToolParts(message);
	const thinkingToolCalls = getThinkingToolCallSummaries(message);
	const hasToolExecutionEvidence =
		Boolean(thinkingStatusPart) ||
		toolParts.length > 0 ||
		thinkingToolCalls.length > 0;
	const messageTextBeforeSanitization = hasToolExecutionEvidence
		? suppressToolJsonTrace(baseMessageText).text
		: baseMessageText;
	const messageText = sanitizeMarkdownArtifactMarkers(
		messageTextBeforeSanitization
	);
	const thinkingToolCallsForStatus =
		toolParts.length > 0 ? [] : thinkingToolCalls;
	const hasToolFirstWarning =
		Boolean(toolFirstWarning?.message) && !isStreaming;

	// ---------- widget rendering ----------
	const shouldShowWidgetSections = Boolean(renderWidget) || Boolean(renderLoadingWidget);
	const shouldSuppressStreamingText =
		shouldShowWidgetSections &&
		isStreaming &&
		Boolean(isPlanWidgetFlow) &&
		isCreatePlanSkillFlow &&
		assistantStreamingRenderMode !== "text-first";
	const hasWidgetPayload = Boolean(widgetDataPart);
	// GenUI payload can arrive before the trailing loading=false event.
	// Keep the card renderable when payload exists to avoid "stuck spinner" regressions.
	const shouldRenderWidgetWhileLoading =
		widgetType === "genui-preview" && hasWidgetPayload;
	const renderedWidget =
		shouldShowWidgetSections &&
		widgetDataPart &&
		(!isWidgetLoading || shouldRenderWidgetWhileLoading) &&
		(widgetType !== "plan" || !isStreaming)
			? renderWidget?.(
					{
						type: widgetType ?? "widget",
						data: widgetDataPart.data.payload,
					},
					message
				) ?? null
			: null;
	const shouldHideLoadingWidget =
		widgetType === "genui-preview" && hasWidgetPayload;
	const loadingWidgetNode =
		shouldShowWidgetSections && isWidgetLoading && !shouldHideLoadingWidget
			? renderLoadingWidget?.(widgetType) ?? null
			: null;
	const shouldRenderPlanWidgetFirst = widgetType === "plan";
	const hasRenderedWidget = Boolean(renderedWidget);
	const shouldSuppressTextForWidget =
		shouldSuppressStreamingText ||
		(widgetType === "plan" &&
			isCreatePlanSkillFlow &&
			isWidgetLoading) ||
		(shouldShowWidgetSections &&
			widgetType === "question-card" &&
			!isStreaming) ||
		(shouldShowWidgetSections && widgetType === "genui-preview" && !isFallbackTextRoute);
	const shouldRenderMessageText =
		Boolean(messageText) && !shouldSuppressTextForWidget;
	const shouldRenderPlainTextWhileStreaming =
		isStreaming && assistantStreamingRenderMode === "text-first";

	return useMemo<ThreadMessageContextValue>(
		() => ({
			message,
			surface,
			assistantStreamingRenderMode,
			messageText,
			rawMessageText,
			isStreaming,
			reasoning,
			thinkingStatusPart,
			allThinkingStatusParts,
			resolvedThinkingStatusLabel,
			isThinkingStatusActive,
			thinkingStatusReasoningPhase,
			thinkingToolCallsForStatus,
			sources,
			toolParts,
			toolFirstWarning,
			hasToolFirstWarning,
			suggestedQuestions,
			renderedWidget,
			loadingWidgetNode,
			widgetType,
			isWidgetLoading,
			shouldRenderPlanWidgetFirst,
			hasRenderedWidget,
			shouldRenderMessageText,
			shouldRenderPlainTextWhileStreaming,
			routeDecision,
			isFallbackTextRoute,
		}),
		// eslint-disable-next-line react-hooks/exhaustive-deps -- stable key fields + thinking signals for progressive streaming
		[
			message.id,
			surface,
			isStreaming,
			messageText,
			widgetType,
			isWidgetLoading,
			suggestedQuestions.length,
			routeDecision?.reason,
			thinkingStatusUpdateSignal,
			resolvedThinkingStatusLabel,
		]
	);
}

export function ThreadMessageRoot({
	message,
	surface,
	assistantStreamingRenderMode = "rich",
	onDeleteMessage,
	renderWidget,
	renderLoadingWidget,
	children,
}: Readonly<ThreadMessageRootProps>): ReactNode {
	const contextValue = useThreadMessageDerived(
		message,
		surface,
		assistantStreamingRenderMode,
		renderWidget,
		renderLoadingWidget,
	);

	if (message.role === "user") {
		return (
			<UserMessageBubble
				messageText={contextValue.rawMessageText}
				onDelete={
					onDeleteMessage
						? () => onDeleteMessage(message.id)
						: undefined
				}
			/>
		);
	}

	const hasRenderableContent =
		contextValue.shouldRenderMessageText ||
		Boolean(contextValue.reasoning) ||
		contextValue.isThinkingStatusActive ||
		contextValue.hasToolFirstWarning ||
		contextValue.toolParts.length > 0 ||
		contextValue.sources.length > 0 ||
		contextValue.suggestedQuestions.length > 0 ||
		Boolean(contextValue.loadingWidgetNode) ||
		contextValue.hasRenderedWidget;

	if (!hasRenderableContent) {
		return null;
	}

	return (
		<ThreadMessageContext value={contextValue}>
			<UiMessage from="assistant" className="max-w-full">
				{children}
			</UiMessage>
		</ThreadMessageContext>
	);
}
