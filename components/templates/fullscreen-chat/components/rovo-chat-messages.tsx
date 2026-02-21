"use client";

import type { StickToBottomContext } from "use-stick-to-bottom";
import type { RovoUIMessage } from "@/lib/rovo-ui-messages";
import { ChatMessages } from "@/components/templates/shared/components/chat-messages";
import { GenerativeWidgetCard } from "@/components/templates/shared/components/generative-widget-card";
import type { GenerativeWidgetPrimaryActionPayload } from "@/components/templates/shared/lib/generative-widget";
import ChatEmptyState from "./chat-empty-state";
import LoadingWidget from "./loading-widget";
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
	isSubmitPending?: boolean;
	messageMode?: "plan" | "ask";
	enableSmartWidgets?: boolean;
	onWidgetPrimaryAction?: (
		payload: GenerativeWidgetPrimaryActionPayload
	) => Promise<void> | void;
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
	isSubmitPending = false,
	messageMode = "ask",
	enableSmartWidgets = false,
	onWidgetPrimaryAction,
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
			isSubmitPending={isSubmitPending}
			messageMode={messageMode}
			showWidgetSections={enableSmartWidgets}
			streamingIndicatorVariant="reasoning-expanded"
			renderEmptyState={() => (
				<ChatEmptyState variant={variant} userName={userName} />
			)}
			renderLoadingWidget={(widgetType) =>
				enableSmartWidgets ? <LoadingWidget widgetType={widgetType} /> : null}
			renderWidget={(widget) => {
				if (!enableSmartWidgets) {
					return null;
				}

				return (
					<GenerativeWidgetCard
						widgetType={widget.type}
						widgetData={widget.data}
						onPrimaryAction={onWidgetPrimaryAction}
					/>
				);
			}}
		/>
	);
}
