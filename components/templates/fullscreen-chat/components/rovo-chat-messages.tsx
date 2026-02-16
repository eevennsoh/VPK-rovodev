"use client";

import type { StickToBottomContext } from "use-stick-to-bottom";
import type { RovoUIMessage } from "@/lib/rovo-ui-messages";
import { ChatMessages } from "@/components/templates/shared/components/chat-messages";
import ChatEmptyState from "./chat-empty-state";
import type { PanelVariant } from "../types";

interface RovoChatMessagesProps {
	uiMessages: RovoUIMessage[];
	variant: PanelVariant;
	onSuggestedQuestionClick?: (question: string) => void;
	userName?: string;
	conversationContextRef: React.RefObject<StickToBottomContext | null>;
	scrollSpacerRef?: React.RefObject<HTMLDivElement | null>;
	contentTopPadding?: string;
	contentBottomPadding?: string;
	hideScrollbar?: boolean;
	isStreaming?: boolean;
	messageMode?: "plan" | "ask";
}

export default function RovoChatMessages({
	uiMessages,
	variant,
	onSuggestedQuestionClick,
	userName,
	conversationContextRef,
	scrollSpacerRef,
	contentTopPadding,
	contentBottomPadding,
	hideScrollbar = true,
	isStreaming = false,
	messageMode = "ask",
}: Readonly<RovoChatMessagesProps>) {
	return (
		<ChatMessages
			uiMessages={uiMessages}
			onSuggestedQuestionClick={onSuggestedQuestionClick}
			conversationContextRef={conversationContextRef}
			scrollSpacerRef={scrollSpacerRef}
			contentTopPadding={contentTopPadding}
			contentBottomPadding={contentBottomPadding}
			hideScrollbar={hideScrollbar}
			isStreaming={isStreaming}
			messageMode={messageMode}
			streamingIndicatorVariant="reasoning-expanded"
			renderEmptyState={() => (
				<ChatEmptyState variant={variant} userName={userName} />
			)}
		/>
	);
}
