"use client";

import { useEffect, useMemo, useCallback } from "react";

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
import { useChatSubmit } from "./hooks/use-chat-submit";
import { useScrollAnchor } from "./hooks/use-scroll-anchor";
import styles from "./chat.module.css";

interface ChatPanelProps {
	onClose: () => void;
}

export default function ChatPanel({ onClose }: Readonly<ChatPanelProps>): React.ReactElement {
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

	const messagesContainerStyle = {
		...chatStyles.messagesContainer,
		justifyContent: hasMessages ? "flex-start" : "flex-end",
		flex: hasMessages ? "0 0 auto" : chatStyles.messagesContainer.flex,
		minHeight: hasMessages ? "100%" : undefined,
	};

	return (
		<div style={chatStyles.chatPanel}>
			<ChatHeader onClose={onClose} />

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
					<div ref={scrollSpacerRef} aria-hidden style={{ height: 0, flexShrink: 0 }} />
				</ConversationContent>
			</Conversation>

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
	);
}
