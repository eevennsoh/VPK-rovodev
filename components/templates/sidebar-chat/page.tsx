"use client";

import { useEffect, useMemo, useCallback, useRef, useState } from "react";

import ChatHeader from "./components/chat-header";
import ChatGreeting from "./components/chat-greeting";
import ChatComposer from "./components/chat-composer";
import MessageBubble from "./components/message-bubble";
import { MessageTurns } from "@/components/templates/shared/message-turns";
import {
	Conversation,
	ConversationContent,
} from "@/components/ui-ai/conversation";
import {
	isRenderableRovoUIMessage,
	getAllDataParts,
	getLatestDataPart,
	getMessageText,
	getThinkingToolCallSummaries,
} from "@/lib/rovo-ui-messages";
import {
	buildClarificationSummaryPrompt,
	createClarificationSubmission,
	getLatestQuestionCardPayload,
	type ClarificationAnswers,
} from "@/components/templates/shared/lib/question-card-widget";
import type { RovoSuggestion } from "@/lib/rovo-suggestions";
import { Message } from "@/components/ui-ai/message";
import {
	AdsReasoningTrigger,
	Reasoning,
	ReasoningContent,
	ReasoningSection,
	ReasoningText,
} from "@/components/ui-ai/reasoning";
import { AssistantThinkingToolsSection } from "@/components/templates/shared/components/assistant-thinking-tools-section";
import { ClarificationQuestionCard } from "@/components/templates/shared/components/clarification-question-card";
import { QuestionCardShortcutsFooter } from "@/components/templates/shared/components/question-card-shortcuts-footer";
import { chatStyles } from "./data/styles";
import { useRovoChat } from "@/app/contexts";
import type { SendPromptOptions } from "@/app/contexts";
import { useChatSubmit } from "./hooks/use-chat-submit";
import { useScrollAnchor } from "./hooks/use-scroll-anchor";
import styles from "./chat.module.css";

interface ChatPanelProps {
	onClose: () => void;
	sendPromptOptions?: SendPromptOptions;
	enableSmartWidgets?: boolean;
}

const COMPACT_CHAT_WIDTH_MAX = 520;
const REGULAR_CHAT_WIDTH_MAX = 900;

type SmartWidthClass = "compact" | "regular" | "wide";

function getSmartWidthClass(widthPx: number): SmartWidthClass {
	if (widthPx <= COMPACT_CHAT_WIDTH_MAX) {
		return "compact";
	}

	if (widthPx <= REGULAR_CHAT_WIDTH_MAX) {
		return "regular";
	}

	return "wide";
}

export default function ChatPanel({
	onClose,
	sendPromptOptions,
	enableSmartWidgets = false,
}: Readonly<ChatPanelProps>): React.ReactElement {
	const { resetChat, uiMessages: rawUiMessages, sendPrompt } = useRovoChat();
	const panelRef = useRef<HTMLDivElement | null>(null);
	const [containerWidthPx, setContainerWidthPx] = useState<number | null>(null);
	const [viewportWidthPx, setViewportWidthPx] = useState<number | null>(null);

	useEffect(() => {
		const updateViewportWidth = () => {
			if (typeof window === "undefined") {
				return;
			}

			const width = Math.max(1, Math.round(window.innerWidth));
			setViewportWidthPx((prev) => (prev === width ? prev : width));
		};

		updateViewportWidth();
		window.addEventListener("resize", updateViewportWidth);
		return () => {
			window.removeEventListener("resize", updateViewportWidth);
		};
	}, []);

	useEffect(() => {
		const panelElement = panelRef.current;
		if (!panelElement) {
			return;
		}

		const updateContainerWidth = (widthValue: number) => {
			const width = Math.max(1, Math.round(widthValue));
			setContainerWidthPx((prev) => (prev === width ? prev : width));
		};

		updateContainerWidth(panelElement.getBoundingClientRect().width);

		if (typeof ResizeObserver !== "function") {
			return;
		}

		const observer = new ResizeObserver((entries) => {
			const entry = entries[0];
			if (!entry) {
				return;
			}

			updateContainerWidth(entry.contentRect.width);
		});

		observer.observe(panelElement);
		return () => {
			observer.disconnect();
		};
	}, []);

	const resolvedSendPromptOptions = useMemo(() => {
		if (!sendPromptOptions || !sendPromptOptions.smartGeneration) {
			return sendPromptOptions;
		}

		const widthSource = containerWidthPx ?? viewportWidthPx;
		const widthClass = widthSource ? getSmartWidthClass(widthSource) : undefined;

		return {
			...sendPromptOptions,
			smartGeneration: {
				...sendPromptOptions.smartGeneration,
				containerWidthPx: containerWidthPx ?? undefined,
				viewportWidthPx: viewportWidthPx ?? undefined,
				widthClass,
			},
		};
	}, [containerWidthPx, sendPromptOptions, viewportWidthPx]);

	const {
		prompt,
		setPrompt,
		handleSubmit,
		submitPrompt,
		abort,
		uiMessages,
		isStreaming,
		isSubmitPending,
		queuedPrompts,
		removeQueuedPrompt,
	} = useChatSubmit({
		defaultPromptOptions: resolvedSendPromptOptions,
	});
	const isRequestInFlight = isStreaming || isSubmitPending;

	const activeQuestionCard = useMemo(
		() => getLatestQuestionCardPayload(rawUiMessages),
		[rawUiMessages]
	);
	const activeQuestionCardKey = useMemo(
		() => (activeQuestionCard ? `${activeQuestionCard.sessionId}-${activeQuestionCard.round}` : null),
		[activeQuestionCard]
	);
	const [dismissedQuestionCardKey, setDismissedQuestionCardKey] = useState<string | null>(null);
	const shouldShowQuestionCard = !isRequestInFlight && activeQuestionCard !== null && dismissedQuestionCardKey !== activeQuestionCardKey;
	const dismissQuestionCard = useCallback(() => {
		if (!activeQuestionCardKey) {
			return;
		}
		setDismissedQuestionCardKey(activeQuestionCardKey);
	}, [activeQuestionCardKey]);

	const handleClarificationSubmit = useCallback(
		(answers: ClarificationAnswers) => {
			if (!activeQuestionCard) {
				return;
			}

			const clarificationSubmission = createClarificationSubmission(
				activeQuestionCard,
				answers
			);
			const clarificationPrompt = buildClarificationSummaryPrompt(
				activeQuestionCard,
				answers
			);

			void sendPrompt(clarificationPrompt, {
				...resolvedSendPromptOptions,
				messageMetadata: {
					...(resolvedSendPromptOptions?.messageMetadata ?? {}),
					source: "clarification-submit",
					visibility: "hidden",
				},
				clarification: clarificationSubmission,
			});
		},
		[activeQuestionCard, resolvedSendPromptOptions, sendPrompt]
	);
	const messages = useMemo(
		() => uiMessages.filter(isRenderableRovoUIMessage),
		[uiMessages]
	);

	const {
		conversationContextRef,
		scrollSpacerRef,
		getLatestTurnTargetTop,
	} = useScrollAnchor({ uiMessages });

	useEffect(() => {
		return () => abort();
	}, [abort]);

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
	const hasInlineThinkingStatus = false;

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
	const resolvedThinkingLabel = thinkingStatusPart?.data.label ?? "Thinking";
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
	const handleFollowUpSuggestionClick = useCallback(
		(question: string) => {
			void submitPrompt(question);
		},
		[submitPrompt]
	);
	const handleGreetingSuggestionClick = useCallback(
		(suggestion: RovoSuggestion) => {
			void submitPrompt(suggestion.label);
		},
		[submitPrompt]
	);

	const messagesContainerStyle = {
		...chatStyles.messagesContainer,
		justifyContent: hasMessages ? "flex-start" : "center",
		flex: hasMessages ? "0 0 auto" : chatStyles.messagesContainer.flex,
		minHeight: "100%",
		paddingBottom: hasMessages
			? chatStyles.messagesContainer.paddingBottom
			: chatStyles.messagesContainer.padding,
	};
	return (
		<div ref={panelRef} style={chatStyles.chatPanel}>
			<div>
				<ChatHeader onClose={onClose} onNewChat={resetChat} />
			</div>

			<Conversation
				className="min-h-0 flex-1"
				contextRef={conversationContextRef}
				initial={false}
				targetScrollTop={getLatestTurnTargetTop}
			>
				<ConversationContent className="gap-0 p-0" style={messagesContainerStyle}>
					{messages.length === 0 ? (
						<div style={chatStyles.emptyState}>
							<ChatGreeting onSuggestionClick={handleGreetingSuggestionClick} />
						</div>
					) : (
						<MessageTurns
							isUserMessage={(message) => message.role === "user"}
							getTurnContainerStyle={(_turn, turnIndex) => ({
								marginTop: turnIndex > 0 ? "24px" : "0",
							})}
							getMessageContainerStyle={(message, messageIndex, turn) => {
								const isHiddenAssistantPlaceholder =
									isAssistantAwaitingOutput &&
									lastMessage?.id === message.id;

								return {
									paddingLeft: message.role === "assistant" ? "12px" : "0",
									paddingRight: message.role === "assistant" ? "12px" : "0",
									marginTop:
										message.role === "assistant" &&
										!isHiddenAssistantPlaceholder &&
										messageIndex > 0 &&
										turn[messageIndex - 1]?.role === "user"
											? "24px"
											: "0",
								};
							}}
							latestTurnClassName={styles.latestTurn}
							latestTurnDataAttribute="data-chat-latest-turn"
							messages={messages}
							renderMessage={(message) => (
								<MessageBubble
									message={message}
									onSuggestionClick={handleFollowUpSuggestionClick}
									enableSmartWidgets={enableSmartWidgets}
									showThinkingStatusSection={
										message.role === "assistant" &&
										message.id === lastMessage?.id
									}
								/>
							)}
						/>
					)}
					{shouldShowThinking ? (
						<div style={chatStyles.thinkingContainer}>
							<Message from="assistant" className="max-w-full">
								<Reasoning
									key={streamingReasoningKey}
									className="mb-0"
									isStreaming={isRequestInFlight}
								>
									<AdsReasoningTrigger
										label={resolvedThinkingLabel}
										showChevron={hasThinkingDetails}
									/>
									{hasThinkingDetails ? (
										<ReasoningContent>
											<div className="space-y-4">
												{hasReasoningContent ? (
													<ReasoningSection title="Thinking">
														<ReasoningText
															maxVisibleTimelineItems={6}
															text={trimmedReasoningContent}
															timelineMode="auto"
														/>
													</ReasoningSection>
												) : null}
												{hasThinkingToolCalls ? (
													<ReasoningSection title="Tools">
														<AssistantThinkingToolsSection
															defaultOpenMode="running"
															idPrefix={lastMessage?.id ?? "stream"}
															thinkingToolCalls={thinkingToolCalls}
														/>
													</ReasoningSection>
												) : null}
											</div>
										</ReasoningContent>
									) : null}
								</Reasoning>
							</Message>
						</div>
					) : null}
					{hasMessages ? (
						<div ref={scrollSpacerRef} aria-hidden style={{ height: 0, flexShrink: 0 }} />
					) : null}
				</ConversationContent>
			</Conversation>

			<div>
				{shouldShowQuestionCard && activeQuestionCard ? (
					<>
						<div className="px-3">
							<ClarificationQuestionCard
								key={activeQuestionCardKey ?? undefined}
								questionCard={activeQuestionCard}
								onSubmit={(answers) => {
									handleClarificationSubmit(answers);
									dismissQuestionCard();
								}}
								onDismiss={dismissQuestionCard}
							/>
						</div>
						<QuestionCardShortcutsFooter />
					</>
				) : (
					<ChatComposer
						prompt={prompt}
						isStreaming={isRequestInFlight}
						queuedPrompts={queuedPrompts}
						onPromptChange={setPrompt}
						onSubmit={handleSubmit}
						onStop={abort}
						onRemoveQueuedPrompt={removeQueuedPrompt}
					/>
				)}
			</div>
		</div>
	);
}
