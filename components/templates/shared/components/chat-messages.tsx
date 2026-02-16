"use client";

import type { ReactNode } from "react";
import { useCallback, useMemo } from "react";
import type { StickToBottomContext } from "use-stick-to-bottom";
import { Conversation, ConversationContent } from "@/components/ui-ai/conversation";
import { cn } from "@/lib/utils";
import { MessageTurns } from "@/components/templates/shared/message-turns";
import { ThreadMessageBubble } from "@/components/templates/shared/thread-message-bubble";
import {
	isRenderableRovoUIMessage,
	getAllDataParts,
	getLatestDataPart,
	getMessageText,
	type RovoUIMessage,
	type RovoRenderableUIMessage,
} from "@/lib/rovo-ui-messages";
import { Message, MessageContent } from "@/components/ui-ai/message";
import {
	AdsReasoningTrigger,
	Reasoning,
	ReasoningContent,
} from "@/components/ui-ai/reasoning";
import styles from "./chat-messages.module.css";

export interface ChatMessagesProps {
	uiMessages: RovoUIMessage[];
	onSuggestedQuestionClick?: (question: string) => void;
	conversationContextRef: React.RefObject<StickToBottomContext | null>;
	scrollSpacerRef?: React.RefObject<HTMLDivElement | null>;
	contentTopPadding?: string;
	contentBottomPadding?: string;
	hideScrollbar?: boolean;
	isStreaming?: boolean;
	messageMode?: "plan" | "ask";
	thinkingLabel?: string;
	reasoningContent?: string;
	streamingIndicatorVariant?: "thinking" | "reasoning-expanded";
	streamingIndicatorMessages?: RovoUIMessage[];
	showAwaitingIndicator?: boolean;
	awaitingIndicatorLabel?: string;
	showFeedbackActions?: boolean;
	showFollowUpSuggestions?: boolean;
	assistantStreamingRenderMode?: "rich" | "text-first";
	renderEmptyState?: () => ReactNode;
	renderLoadingWidget?: (widgetType?: string) => ReactNode;
	renderWidget?: (
		widget: { type: string; data: unknown },
		message: RovoRenderableUIMessage
	) => ReactNode;
}

/**
 * Pixel offset from the top of the scroll container to position the latest
 * turn, giving visual breathing room above the newest message group.
 */
const LATEST_TURN_TOP_INSET_PX = 48;

/**
 * Calculate the scroll position that places the latest conversation turn near
 * the top of the viewport, dynamically adjusting a spacer element when the
 * content is too short to reach the desired offset naturally.
 */
function computeLatestTurnScrollTop(
	defaultTargetTop: number,
	scrollElement: HTMLElement,
	scrollSpacerRef?: React.RefObject<HTMLDivElement | null>
): number {
	const latestTurnElement = scrollElement.querySelector<HTMLElement>(
		"[data-rovo-latest-turn='true']"
	);
	if (!latestTurnElement) {
		return defaultTargetTop;
	}

	const scrollRect = scrollElement.getBoundingClientRect();
	const latestTurnRect = latestTurnElement.getBoundingClientRect();
	const rawTargetTop = scrollElement.scrollTop + (latestTurnRect.top - scrollRect.top);
	const desiredTargetTop = Math.max(0, rawTargetTop - LATEST_TURN_TOP_INSET_PX);

	const availableScrollRange = scrollElement.scrollHeight - scrollElement.clientHeight;
	const currentSpacerHeight = scrollSpacerRef?.current?.offsetHeight ?? 0;
	const availableScrollRangeWithoutSpacer = Math.max(
		0,
		availableScrollRange - currentSpacerHeight
	);
	const requiredSpacer = Math.max(
		0,
		desiredTargetTop - availableScrollRangeWithoutSpacer
	);

	if (scrollSpacerRef?.current) {
		scrollSpacerRef.current.style.height = `${requiredSpacer}px`;
	}

	const maxScrollTop = Math.max(
		0,
		scrollElement.scrollHeight - scrollElement.clientHeight
	);

	return Math.min(maxScrollTop, desiredTargetTop);
}

export function ChatMessages({
	uiMessages,
	onSuggestedQuestionClick,
	conversationContextRef,
	scrollSpacerRef,
	contentTopPadding,
	contentBottomPadding,
	hideScrollbar = true,
	isStreaming = false,
	messageMode = "plan",
	thinkingLabel = "Thinking",
	reasoningContent,
	streamingIndicatorVariant = "thinking",
	streamingIndicatorMessages,
	showAwaitingIndicator = false,
	awaitingIndicatorLabel = "Waiting for your response",
	showFeedbackActions,
	showFollowUpSuggestions,
	assistantStreamingRenderMode = "rich",
	renderEmptyState,
	renderLoadingWidget,
	renderWidget,
}: Readonly<ChatMessagesProps>): ReactNode {
	const renderableMessages = useMemo(
		() => uiMessages.filter(isRenderableRovoUIMessage),
		[uiMessages]
	);
	const isPureMode = messageMode === "ask";

	const lastAssistantMessageId = useMemo(() => {
		for (let i = renderableMessages.length - 1; i >= 0; i--) {
			if (renderableMessages[i].role === "assistant") {
				return renderableMessages[i].id;
			}
		}
		return null;
	}, [renderableMessages]);

	const streamingIndicatorSourceMessages = useMemo(
		() =>
			(streamingIndicatorMessages ?? uiMessages).filter(isRenderableRovoUIMessage),
		[streamingIndicatorMessages, uiMessages]
	);
	const lastStreamingSourceMessage =
		streamingIndicatorSourceMessages[streamingIndicatorSourceMessages.length - 1];

	const isAssistantInThinkingState =
		isStreaming &&
		lastStreamingSourceMessage?.role === "assistant" &&
		getLatestDataPart(lastStreamingSourceMessage, "data-thinking-status") !== null &&
		getMessageText(lastStreamingSourceMessage) === "";

	const shouldShowStreamingIndicator =
		isStreaming &&
		streamingIndicatorSourceMessages.length > 0 &&
		(lastStreamingSourceMessage?.role === "user" || isAssistantInThinkingState);

	const thinkingStatusParts = isAssistantInThinkingState
		? getAllDataParts(lastStreamingSourceMessage, "data-thinking-status")
		: [];
	const thinkingStatusPart =
		thinkingStatusParts[thinkingStatusParts.length - 1] ?? null;
	const resolvedThinkingLabel = thinkingStatusPart?.data.label ?? thinkingLabel;
	const resolvedReasoningContent = isAssistantInThinkingState
		? thinkingStatusParts
				.map((part) => part.data.content)
				.filter(Boolean)
				.join("\n\n") || reasoningContent
		: reasoningContent;
	const shouldUseExpandedReasoning =
		streamingIndicatorVariant === "reasoning-expanded";
	const trimmedReasoningContent = resolvedReasoningContent?.trim() ?? "";
	const hasResolvedReasoningContent = trimmedReasoningContent.length > 0;
	const reasoningContentVersion = thinkingStatusParts.length;
	const streamingReasoningKey = shouldUseExpandedReasoning
		? `${lastStreamingSourceMessage?.id ?? "stream"}:${reasoningContentVersion}`
		: `${lastStreamingSourceMessage?.id ?? "stream"}:${resolvedThinkingLabel}`;

	const handleTargetScrollTop = useCallback(
		(defaultTargetTop: number, { scrollElement }: { scrollElement: HTMLElement }) =>
			computeLatestTurnScrollTop(defaultTargetTop, scrollElement, scrollSpacerRef),
		[scrollSpacerRef]
	);

	return (
		<Conversation
			className={cn("min-h-0 flex-1", hideScrollbar && styles.hideScrollbar)}
			contextRef={conversationContextRef}
			initial={false}
			targetScrollTop={handleTargetScrollTop}
		>
			<ConversationContent
				className="flex shrink-0 flex-col gap-6 p-3"
				style={{
					paddingTop: contentTopPadding,
					paddingBottom: contentBottomPadding ?? "80px",
				}}
			>
				{renderableMessages.length === 0 ? (
					renderEmptyState?.() ?? null
				) : (
					<MessageTurns
						isUserMessage={(message) => message.role === "user"}
						getMessageContainerStyle={(message, messageIndex, turn) => ({
							display: "flex",
							justifyContent: message.role === "user" ? "flex-end" : "flex-start",
							paddingLeft: message.role === "user" ? "24px" : "0",
							marginTop:
								message.role === "assistant" &&
								messageIndex > 0 &&
								turn[messageIndex - 1]?.role === "user"
									? "24px"
									: "0",
						})}
						latestTurnClassName={styles.latestTurn}
						latestTurnDataAttribute="data-rovo-latest-turn"
						messages={renderableMessages}
							renderMessage={(message) => (
								<ThreadMessageBubble
									message={message}
									surface="fullscreen"
									assistantStreamingRenderMode={assistantStreamingRenderMode}
									showFeedbackActions={showFeedbackActions}
									showFollowUpSuggestions={showFollowUpSuggestions}
									onSuggestionClick={onSuggestedQuestionClick}
									showThinkingStatusSection={message.role === "assistant" && message.id === lastAssistantMessageId}
									showToolsSection={!isPureMode}
									showWidgetSections={!isPureMode}
									renderLoadingWidget={renderLoadingWidget}
									renderWidget={renderWidget}
								/>
						)}
					/>
				)}
				{shouldShowStreamingIndicator ? (
					<div className="flex justify-start">
						<Message from="assistant" className="max-w-full">
							<MessageContent className="px-3">
								<Reasoning
									key={streamingReasoningKey}
									className="mb-0"
									isStreaming={shouldShowStreamingIndicator}
									defaultOpen={
										shouldUseExpandedReasoning &&
										hasResolvedReasoningContent
									}
								>
									<AdsReasoningTrigger
										label={resolvedThinkingLabel}
										showChevron={
											shouldUseExpandedReasoning &&
											hasResolvedReasoningContent
										}
									/>
									{shouldUseExpandedReasoning && hasResolvedReasoningContent ? (
										<ReasoningContent>
											{trimmedReasoningContent}
										</ReasoningContent>
									) : null}
								</Reasoning>
							</MessageContent>
						</Message>
					</div>
				) : null}
				{!shouldShowStreamingIndicator && showAwaitingIndicator ? (
					<div className="flex justify-start">
						<Message from="assistant" className="max-w-full">
							<MessageContent className="px-3">
								<Reasoning className="mb-0" isStreaming>
									<AdsReasoningTrigger label={awaitingIndicatorLabel} showChevron={false} />
								</Reasoning>
							</MessageContent>
						</Message>
					</div>
				) : null}
				<div ref={scrollSpacerRef} aria-hidden className="h-0 shrink-0" />
			</ConversationContent>
		</Conversation>
	);
}

/** @deprecated Use the named export `ChatMessages` instead. */
export default ChatMessages;
