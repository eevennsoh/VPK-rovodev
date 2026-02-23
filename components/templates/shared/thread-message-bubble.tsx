"use client";

import type { ReactNode } from "react";
import { useDynamicThinkingLabel } from "@/components/templates/shared/hooks/use-dynamic-thinking-label";
import {
	Message as UiMessage,
	MessageContent,
	MessageResponse,
} from "@/components/ui-ai/message";
import { cn } from "@/lib/utils";
import { getMessageText, type RovoRenderableUIMessage } from "@/lib/rovo-ui-messages";
import { processAssistantMessage } from "./lib/process-assistant-message";
import { AssistantFeedbackActions } from "./components/assistant-feedback-actions";
import { AssistantReasoningSection } from "./components/assistant-reasoning-section";
import { AssistantSourcesSection } from "./components/assistant-sources-section";
import { AssistantSuggestionsSection } from "./components/assistant-suggestions-section";
import { AssistantThinkingStatusSection } from "./components/assistant-thinking-status-section";
import { AssistantToolsSection } from "./components/assistant-tools-section";
import { UserMessageBubble } from "./components/user-message-bubble";

interface ThreadMessageBubbleProps {
	message: RovoRenderableUIMessage;
	surface: "sidebar" | "fullscreen";
	assistantStreamingRenderMode?: "rich" | "text-first";
	onSuggestionClick?: (question: string) => void;
	onDeleteMessage?: (messageId: string) => void;
	showFeedbackActions?: boolean;
	showFollowUpSuggestions?: boolean;
	showToolsSection?: boolean;
	showThinkingStatusSection?: boolean;
	showWidgetSections?: boolean;
	renderLoadingWidget?: (widgetType?: string) => ReactNode;
	renderWidget?: (
		widget: { type: string; data: unknown },
		message: RovoRenderableUIMessage
	) => ReactNode;
}

type ProcessedAssistantMessage = NonNullable<ReturnType<typeof processAssistantMessage>>;

export function ThreadMessageBubble({
	message,
	surface,
	assistantStreamingRenderMode = "rich",
	onSuggestionClick,
	onDeleteMessage,
	showFeedbackActions: showFeedbackActionsProp,
	showFollowUpSuggestions,
	showToolsSection,
	showThinkingStatusSection = false,
	showWidgetSections,
	renderLoadingWidget,
	renderWidget,
}: Readonly<ThreadMessageBubbleProps>): ReactNode {
	if (message.role === "user") {
		return (
			<UserMessageBubble
				messageText={getMessageText(message)}
				onDelete={onDeleteMessage ? () => onDeleteMessage(message.id) : undefined}
			/>
		);
	}

	if (message.role !== "assistant") return null;

	const processed = processAssistantMessage(message);
	if (!processed) return null;

	return (
		<AssistantThreadMessageBubble
			assistantStreamingRenderMode={assistantStreamingRenderMode}
			message={message}
			onSuggestionClick={onSuggestionClick}
			processed={processed}
			renderLoadingWidget={renderLoadingWidget}
			renderWidget={renderWidget}
			showFeedbackActionsProp={showFeedbackActionsProp}
			showFollowUpSuggestions={showFollowUpSuggestions}
			showThinkingStatusSection={showThinkingStatusSection}
			showToolsSection={showToolsSection}
			showWidgetSections={showWidgetSections}
			surface={surface}
		/>
	);
}

interface AssistantThreadMessageBubbleProps {
	assistantStreamingRenderMode: "rich" | "text-first";
	message: RovoRenderableUIMessage;
	onSuggestionClick?: (question: string) => void;
	processed: ProcessedAssistantMessage;
	renderLoadingWidget?: (widgetType?: string) => ReactNode;
	renderWidget?: (
		widget: { type: string; data: unknown },
		message: RovoRenderableUIMessage
	) => ReactNode;
	showFeedbackActionsProp?: boolean;
	showFollowUpSuggestions?: boolean;
	showThinkingStatusSection: boolean;
	showToolsSection?: boolean;
	showWidgetSections?: boolean;
	surface: "sidebar" | "fullscreen";
}

function AssistantThreadMessageBubble({
	assistantStreamingRenderMode,
	message,
	onSuggestionClick,
	processed,
	renderLoadingWidget,
	renderWidget,
	showFeedbackActionsProp,
	showFollowUpSuggestions,
	showThinkingStatusSection,
	showToolsSection,
	showWidgetSections,
	surface,
}: Readonly<AssistantThreadMessageBubbleProps>): ReactNode {
	const thinkingStatusPart = processed.thinkingStatusPart ?? null;
	const thinkingEventParts = processed.thinkingEventParts ?? [];
	const isStreaming = processed.isStreaming ?? false;

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
	const { label: resolvedThinkingStatusLabel } = useDynamicThinkingLabel({
		baseLabel: thinkingStatusPart?.data.label ?? "Thinking",
		isStreaming:
			isStreaming && showThinkingStatusSection && Boolean(thinkingStatusPart),
		updateSignal: thinkingStatusUpdateSignal,
	});

	const {
		messageText,
		widgetType,
		isWidgetLoading,
		isPlanWidgetFlow,
		isCreatePlanSkillFlow,
		suggestedQuestions,
		reasoning,
		sources,
		toolFirstWarning,
		toolParts,
		thinkingToolCalls,
		widgetDataPart,
		routeDecision,
	} = processed;

	const isFallbackTextRoute = routeDecision?.reason === "fallback_ui_failed";

	const thinkingToolCallsForStatus = toolParts.length > 0 ? [] : thinkingToolCalls;
	const shouldShowToolsSection = showToolsSection ?? true;
	const shouldShowWidgetSections = showWidgetSections ?? true;
	const shouldShowFeedbackActions = showFeedbackActionsProp ?? surface === "fullscreen";
	const shouldShowFollowUpSuggestions = showFollowUpSuggestions ?? surface === "fullscreen";
	const shouldRenderPlainTextWhileStreaming =
		isStreaming && assistantStreamingRenderMode === "text-first";
	const shouldSuppressStreamingText =
		shouldShowWidgetSections &&
		isStreaming &&
		Boolean(isPlanWidgetFlow) &&
		isCreatePlanSkillFlow &&
		assistantStreamingRenderMode !== "text-first";

	const isRetryThinkingStatus = thinkingStatusPart?.data.label?.includes("Retrying") ?? false;
	const showThinkingStatus =
		showThinkingStatusSection &&
		Boolean(thinkingStatusPart) &&
		!(isRetryThinkingStatus && !isStreaming);

	const renderedWidget =
		shouldShowWidgetSections &&
		widgetDataPart &&
		!isWidgetLoading &&
		(widgetType !== "plan" || !isStreaming)
			? renderWidget?.(
					{ type: widgetType ?? "widget", data: widgetDataPart.data.payload },
					message
				)
			: null;
	const shouldRenderPlanWidgetFirst = widgetType === "plan";
	const hasRenderedWidget = Boolean(renderedWidget);

	const shouldSuppressTextForWidget =
		shouldSuppressStreamingText ||
		(widgetType === "plan" && isCreatePlanSkillFlow && isWidgetLoading) ||
		(shouldShowWidgetSections && widgetType === "question-card" && !isStreaming) ||
		(
			shouldShowWidgetSections &&
			widgetType === "genui-preview" &&
			!isFallbackTextRoute &&
			(Boolean(widgetDataPart) || isWidgetLoading)
		);
	const shouldRenderMessageText = Boolean(messageText) && !shouldSuppressTextForWidget;
	const showFeedback = shouldShowFeedbackActions && !isStreaming && shouldRenderMessageText && !hasRenderedWidget;
	const showSuggestions = shouldShowFollowUpSuggestions && !isStreaming && suggestedQuestions.length > 0 && !hasRenderedWidget;
	const hasToolFirstWarning = Boolean(toolFirstWarning?.message) && !isStreaming;

	const hasRenderableContent =
		shouldRenderMessageText ||
		showFeedback ||
		Boolean(reasoning) ||
		showThinkingStatus ||
		hasToolFirstWarning ||
		(shouldShowToolsSection && toolParts.length > 0) ||
		sources.length > 0 ||
		showSuggestions ||
		(shouldShowWidgetSections && isWidgetLoading && Boolean(renderLoadingWidget)) ||
		Boolean(renderedWidget);

	if (!hasRenderableContent) return null;

	const widgetSection = (
		<>
			{shouldShowWidgetSections && isWidgetLoading
				? renderLoadingWidget?.(widgetType)
				: null}
			{renderedWidget}
		</>
	);

	return (
		<UiMessage from="assistant" className="max-w-full">
			{reasoning ? (
				<AssistantReasoningSection reasoning={reasoning} />
			) : null}

			{showThinkingStatus && thinkingStatusPart ? (
				<AssistantThinkingStatusSection
					message={message}
					label={resolvedThinkingStatusLabel}
					isStreaming={isStreaming}
					hasReasoning={Boolean(reasoning)}
					toolParts={toolParts}
					thinkingToolCalls={thinkingToolCallsForStatus}
				/>
			) : null}

			{shouldRenderPlanWidgetFirst ? widgetSection : null}

			{shouldRenderMessageText ? (
				<MessageContent
					className={cn(
						(widgetDataPart || isWidgetLoading) && "mb-2"
					)}
				>
					{shouldRenderPlainTextWhileStreaming ? (
						<div className="whitespace-pre-wrap break-words text-sm leading-6 text-text">
							{messageText}
						</div>
					) : (
						<MessageResponse isAnimating={isStreaming}>
							{messageText}
						</MessageResponse>
					)}
				</MessageContent>
			) : null}

			{showFeedback ? (
				<AssistantFeedbackActions messageText={messageText} />
			) : null}

			{shouldShowToolsSection && toolParts.length > 0 && !showThinkingStatus ? (
				<AssistantToolsSection messageId={message.id} toolParts={toolParts} />
			) : null}

			{hasToolFirstWarning && toolFirstWarning ? (
				<div className="pt-2">
					<div className="rounded-lg border border-border bg-bg-neutral px-3 py-2">
						<p className="text-xs leading-5 font-medium text-text">
							Integration warning
						</p>
						<p className="mt-1 whitespace-pre-wrap text-xs leading-5 text-text-subtle">
							{toolFirstWarning.message}
						</p>
					</div>
				</div>
			) : null}

			{sources.length > 0 ? (
				<AssistantSourcesSection messageId={message.id} sources={sources} />
			) : null}

			{showSuggestions ? (
				<AssistantSuggestionsSection
					messageId={message.id}
					suggestedQuestions={suggestedQuestions}
					onSuggestionClick={onSuggestionClick}
				/>
			) : null}

			{!shouldRenderPlanWidgetFirst ? widgetSection : null}
		</UiMessage>
	);
}
