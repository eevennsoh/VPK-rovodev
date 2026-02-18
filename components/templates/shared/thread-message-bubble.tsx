"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
	getAllDataParts,
	hasCreatePlanSkillSignal,
	getLatestDataPart,
	getMessageReasoning,
	getMessageSources,
	getMessageText,
	getMessageToolParts,
	isMessageTextStreaming,
	type RovoRenderableUIMessage,
} from "@/lib/rovo-ui-messages";
import {
	AdsReasoningTrigger,
	Reasoning,
	ReasoningContent,
} from "@/components/ui-ai/reasoning";
import {
	Message as UiMessage,
	MessageContent,
	MessageResponse,
} from "@/components/ui-ai/message";
import {
	extractPlanRenderableText,
	removeActionItemsSection,
	removeLeadingSingleCharacterFragment,
	removeTrailingSingleCharacterLine,
} from "./lib/message-text-utils";
import { UserMessageBubble } from "./components/user-message-bubble";
import { AssistantFeedbackActions } from "./components/assistant-feedback-actions";
import { AssistantReasoningSection } from "./components/assistant-reasoning-section";
import { AssistantToolsSection } from "./components/assistant-tools-section";
import { AssistantSourcesSection } from "./components/assistant-sources-section";
import { AssistantSuggestionsSection } from "./components/assistant-suggestions-section";

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
	onRetryWidget?: (widgetType: string) => void;
}

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
	onRetryWidget,
}: Readonly<ThreadMessageBubbleProps>): ReactNode {
	const rawMessageText = getMessageText(message);

	if (message.role === "user") {
		return <UserMessageBubble surface={surface} messageText={rawMessageText} onDelete={onDeleteMessage ? () => onDeleteMessage(message.id) : undefined} />;
	}

	const widgetLoadingPart = getLatestDataPart(message, "data-widget-loading");
	const widgetDataPart = getLatestDataPart(message, "data-widget-data");
	const widgetErrorPart = getLatestDataPart(message, "data-widget-error");
	const suggestedQuestionsPart = getLatestDataPart(message, "data-suggested-questions");
	const thinkingStatusPart = getLatestDataPart(message, "data-thinking-status");
	const isStreaming = isMessageTextStreaming(message);
	const widgetType =
		widgetDataPart?.data.type ??
		widgetLoadingPart?.data.type ??
		widgetErrorPart?.data.type;
	const isWidgetLoading = widgetLoadingPart?.data.loading ?? false;
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
			? extractPlanRenderableText(normalizedWidgetText, { maxSummaryLines: 2 })
			: null;
	const messageText =
		widgetType === "question-card"
			? removeTrailingSingleCharacterLine(normalizedWidgetText)
			: widgetType === "plan"
				? isCreatePlanSkillFlow
					? planRenderableText?.text ?? ""
					: removeActionItemsSection(normalizedWidgetText)
			: normalizedWidgetText;
	const suggestedQuestions = suggestedQuestionsPart?.data.questions ?? [];
	const reasoning = getMessageReasoning(message);
	const sources = getMessageSources(message);
	const toolParts = getMessageToolParts(message);
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
	const showThinkingStatus = showThinkingStatusSection && Boolean(thinkingStatusPart) && (!isStreaming || Boolean(messageText)) && !(isRetryThinkingStatus && !isStreaming);
	const shouldShowWidgetError =
		shouldShowWidgetSections && Boolean(widgetErrorPart) && !isWidgetLoading;
	const renderedWidget =
		shouldShowWidgetSections &&
		widgetDataPart &&
		!isWidgetLoading &&
		!shouldShowWidgetError &&
		(widgetType !== "plan" || !isStreaming)
			? renderWidget?.(
					{
						type: widgetType ?? "widget",
						data: widgetDataPart.data.payload,
					},
					message
				)
			: null;
	const shouldRenderPlanWidgetFirst = widgetType === "plan";
	const hasRenderedWidget = Boolean(renderedWidget) || shouldShowWidgetError;
	const shouldSuppressTextForWidget =
		shouldSuppressStreamingText ||
		(widgetType === "plan" &&
			isCreatePlanSkillFlow &&
			(isWidgetLoading || shouldShowWidgetError)) ||
		(shouldShowWidgetSections && widgetType === "question-card" && !isStreaming);
	const shouldRenderMessageText = Boolean(messageText) && !shouldSuppressTextForWidget;
	const showFeedback = shouldShowFeedbackActions && !isStreaming && shouldRenderMessageText && !hasRenderedWidget;
	const showSuggestions = shouldShowFollowUpSuggestions && !isStreaming && suggestedQuestions.length > 0 && !hasRenderedWidget;
	const hasRenderableContent = shouldRenderMessageText ||
		showFeedback ||
		Boolean(reasoning) ||
		showThinkingStatus ||
		(shouldShowToolsSection && toolParts.length > 0) ||
		sources.length > 0 ||
		showSuggestions ||
		(shouldShowWidgetSections && isWidgetLoading) ||
		shouldShowWidgetError ||
		Boolean(renderedWidget);
	if (!hasRenderableContent) {
		return null;
	}

	const widgetSection = (
		<>
			{shouldShowWidgetSections && isWidgetLoading
				? renderLoadingWidget?.(widgetType)
				: null}
			{renderedWidget}
			{shouldShowWidgetError && widgetErrorPart ? (
				<div className="px-3 pb-2">
					<div className="rounded-lg border border-border-danger bg-bg-danger p-3">
						<p className="text-sm leading-5 text-text">
							{widgetErrorPart.data.message}
						</p>
						{widgetErrorPart.data.canRetry && onRetryWidget ? (
							<div className="mt-3">
								<Button
									size="sm"
									variant="outline"
									onClick={() => onRetryWidget(widgetType ?? "widget")}
								>
									Retry
								</Button>
							</div>
						) : null}
					</div>
				</div>
			) : null}
		</>
	);

	return (
		<UiMessage from="assistant" className="max-w-full">
			{reasoning ? (
				<AssistantReasoningSection reasoning={reasoning} />
			) : null}

			{showThinkingStatus && thinkingStatusPart ? (() => {
				const accumulatedContent = getAllDataParts(message, "data-thinking-status")
					.map((part) => part.data.content)
					.filter(Boolean)
					.join("\n\n");
				const hasContent = Boolean(accumulatedContent);
				return (
					<div className="px-3 pt-2">
						<Reasoning className="mb-0" defaultOpen={hasContent} isStreaming={isStreaming}>
							<AdsReasoningTrigger
								label={thinkingStatusPart.data.label}
								showChevron={hasContent}
							/>
							{accumulatedContent ? (
								<ReasoningContent>{accumulatedContent}</ReasoningContent>
							) : null}
						</Reasoning>
					</div>
				);
			})() : null}

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

			{shouldShowToolsSection && toolParts.length > 0 ? (
				<AssistantToolsSection messageId={message.id} toolParts={toolParts} />
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
