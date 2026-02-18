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
import { isRenderableRovoUIMessage } from "@/lib/rovo-ui-messages";
import type { RovoSuggestion } from "@/lib/rovo-suggestions";
import { Message, MessageContent } from "@/components/ui-ai/message";
import { AdsReasoningTrigger, Reasoning } from "@/components/ui-ai/reasoning";
import { chatStyles } from "./data/styles";
import { useRovoChat } from "@/app/contexts";
import { useChatSubmit } from "./hooks/use-chat-submit";
import { useScrollAnchor } from "./hooks/use-scroll-anchor";
import styles from "./chat.module.css";

interface ChatPanelProps {
	onClose: () => void;
}

export default function ChatPanel({ onClose }: Readonly<ChatPanelProps>): React.ReactElement {
	const { resetChat } = useRovoChat();
	const {
		prompt,
		setPrompt,
		handleSubmit,
		submitPrompt,
		abort,
		uiMessages,
		isStreaming,
		queuedPrompts,
		removeQueuedPrompt,
	} = useChatSubmit();
	const messages = useMemo(
		() => uiMessages.filter(isRenderableRovoUIMessage),
		[uiMessages]
	);

	const {
		conversationContextRef,
		scrollSpacerRef,
		getLatestTurnTargetTop,
	} = useScrollAnchor({ uiMessages });
	const headerRef = useRef<HTMLDivElement>(null);
	const composerRef = useRef<HTMLDivElement>(null);
	const [emptyStateOffset, setEmptyStateOffset] = useState(0);

	useEffect(() => {
		return () => abort();
	}, [abort]);

	const hasMessages = messages.length > 0;
	const lastMessage = messages[messages.length - 1];
	const shouldShowThinking =
		isStreaming && hasMessages && lastMessage?.role === "user";
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

	useEffect(() => {
		if (hasMessages) {
			return;
		}

		const headerElement = headerRef.current;
		const composerElement = composerRef.current;
		if (!headerElement || !composerElement) {
			return;
		}

		const measureOffset = () => {
			const headerHeight = headerElement.getBoundingClientRect().height;
			const composerHeight = composerElement.getBoundingClientRect().height;
			const nextOffset = Math.max(0, Math.min(48, (composerHeight - headerHeight) / 2));

			setEmptyStateOffset((previousOffset) =>
				Math.abs(previousOffset - nextOffset) < 1 ? previousOffset : nextOffset
			);
		};

		const measureOffsetNextFrame = () => {
			window.requestAnimationFrame(measureOffset);
		};

		measureOffsetNextFrame();
		const resizeObserver = new ResizeObserver(measureOffset);
		resizeObserver.observe(headerElement);
		resizeObserver.observe(composerElement);
		window.addEventListener("resize", measureOffsetNextFrame);

		return () => {
			resizeObserver.disconnect();
			window.removeEventListener("resize", measureOffsetNextFrame);
		};
	}, [hasMessages]);

	const emptyStateStyle = useMemo(
		() => ({
			...chatStyles.emptyState,
			transform:
				!hasMessages && emptyStateOffset > 0
					? `translateY(${Math.round(emptyStateOffset)}px)`
					: undefined,
		}),
		[emptyStateOffset, hasMessages]
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
		<div style={chatStyles.chatPanel}>
			<div ref={headerRef}>
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
						<div style={emptyStateStyle}>
							<ChatGreeting onSuggestionClick={handleGreetingSuggestionClick} />
						</div>
					) : (
						<MessageTurns
							isUserMessage={(message) => message.role === "user"}
							getMessageContainerStyle={(message, messageIndex, turn) => ({
								marginTop:
									message.role === "assistant" &&
									messageIndex > 0 &&
									turn[messageIndex - 1]?.role === "user"
										? "24px"
										: "0",
							})}
							latestTurnClassName={styles.latestTurn}
							latestTurnDataAttribute="data-chat-latest-turn"
							messages={messages}
							renderMessage={(message) => (
								<MessageBubble
									message={message}
									onSuggestionClick={handleFollowUpSuggestionClick}
								/>
							)}
						/>
					)}
					{shouldShowThinking ? (
						<Message from="assistant" className="max-w-full">
							<MessageContent className="px-3">
								<Reasoning className="mb-0" isStreaming>
									<AdsReasoningTrigger label="Thinking" showChevron={false} />
								</Reasoning>
							</MessageContent>
						</Message>
					) : null}
					{hasMessages ? (
						<div ref={scrollSpacerRef} aria-hidden style={{ height: 0, flexShrink: 0 }} />
					) : null}
				</ConversationContent>
			</Conversation>

			<div ref={composerRef}>
				<ChatComposer
					prompt={prompt}
					isStreaming={isStreaming}
					queuedPrompts={queuedPrompts}
					onPromptChange={setPrompt}
					onSubmit={handleSubmit}
					onStop={abort}
					onRemoveQueuedPrompt={removeQueuedPrompt}
				/>
			</div>
		</div>
	);
}
