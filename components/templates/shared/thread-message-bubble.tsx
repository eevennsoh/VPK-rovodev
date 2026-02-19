"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
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
} from "@/lib/rovo-ui-messages";
import {
	AdsReasoningTrigger,
	Reasoning,
	ReasoningContent,
	ReasoningSection,
	ReasoningText,
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
	sanitizeMarkdownArtifactMarkers,
	suppressToolJsonTrace,
} from "./lib/message-text-utils";
import { UserMessageBubble } from "./components/user-message-bubble";
import { AssistantFeedbackActions } from "./components/assistant-feedback-actions";
import { AssistantReasoningSection } from "./components/assistant-reasoning-section";
import { AssistantThinkingToolsSection } from "./components/assistant-thinking-tools-section";
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
}: Readonly<ThreadMessageBubbleProps>): ReactNode {
	const rawMessageText = getMessageText(message);

	if (message.role === "user") {
		return <UserMessageBubble messageText={rawMessageText} onDelete={onDeleteMessage ? () => onDeleteMessage(message.id) : undefined} />;
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
	const baseMessageText =
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
	const toolFirstWarning = getToolFirstWarning(message);
	const toolParts = getMessageToolParts(message);
	const thinkingToolCalls = getThinkingToolCallSummaries(message);
	const hasToolExecutionEvidence =
		Boolean(thinkingStatusPart) ||
		toolParts.length > 0 ||
		thinkingToolCalls.length > 0;
	const messageTextBeforeMarkdownSanitization = hasToolExecutionEvidence
		? suppressToolJsonTrace(baseMessageText).text
		: baseMessageText;
	const messageText = sanitizeMarkdownArtifactMarkers(
		messageTextBeforeMarkdownSanitization
	);
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
	const showThinkingStatus = showThinkingStatusSection && Boolean(thinkingStatusPart) && Boolean(rawMessageText) && !(isRetryThinkingStatus && !isStreaming);
	const renderedWidget =
		shouldShowWidgetSections &&
		widgetDataPart &&
		!isWidgetLoading &&
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
	const hasRenderedWidget = Boolean(renderedWidget);
	const shouldSuppressTextForWidget =
		shouldSuppressStreamingText ||
		(widgetType === "plan" &&
			isCreatePlanSkillFlow &&
			isWidgetLoading) ||
		(shouldShowWidgetSections && widgetType === "question-card" && !isStreaming);
	const shouldRenderMessageText = Boolean(messageText) && !shouldSuppressTextForWidget;
	const showFeedback = shouldShowFeedbackActions && !isStreaming && shouldRenderMessageText && !hasRenderedWidget;
	const showSuggestions = shouldShowFollowUpSuggestions && !isStreaming && suggestedQuestions.length > 0 && !hasRenderedWidget;
	const hasToolFirstWarning =
		Boolean(toolFirstWarning?.message) && !isStreaming;
	const hasRenderableContent = shouldRenderMessageText ||
		showFeedback ||
		Boolean(reasoning) ||
		showThinkingStatus ||
		hasToolFirstWarning ||
		(shouldShowToolsSection && toolParts.length > 0) ||
		sources.length > 0 ||
		showSuggestions ||
		(shouldShowWidgetSections && isWidgetLoading && Boolean(renderLoadingWidget)) ||
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
				const hasThinkingText = Boolean(accumulatedContent);
				const hasToolParts = toolParts.length > 0;
				const hasThinkingToolCalls = thinkingToolCallsForStatus.length > 0;
				const hasTools = hasToolParts || hasThinkingToolCalls;
				const hasDetails = hasThinkingText || hasTools;
				return (
					<div className={reasoning ? "pt-2" : undefined}>
						<Reasoning className="mb-0" defaultOpen={hasDetails} isStreaming={isStreaming}>
							<AdsReasoningTrigger
								label={thinkingStatusPart.data.label}
								showChevron={hasDetails}
							/>
							{hasDetails ? (
								<ReasoningContent>
									<div className="space-y-4">
										{hasThinkingText ? (
											<ReasoningSection title="Thinking">
												<ReasoningText
													maxVisibleTimelineItems={6}
													text={accumulatedContent}
													timelineMode="auto"
												/>
											</ReasoningSection>
										) : null}
										{hasTools ? (
											<ReasoningSection title="Tools">
												{hasToolParts ? (
													<div className="-mx-6">
														<AssistantToolsSection
															messageId={message.id}
															toolParts={toolParts}
															defaultOpenMode="running"
														/>
													</div>
												) : null}
												{hasThinkingToolCalls ? (
													<AssistantThinkingToolsSection
														className="pt-1"
														defaultOpenMode="running"
														idPrefix={message.id}
														thinkingToolCalls={thinkingToolCallsForStatus}
													/>
												) : null}
											</ReasoningSection>
										) : null}
									</div>
								</ReasoningContent>
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
