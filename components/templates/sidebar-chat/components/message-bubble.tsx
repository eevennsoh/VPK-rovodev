"use client";

import type { RovoRenderableUIMessage } from "@/lib/rovo-ui-messages";
import { ThreadMessageBubble } from "@/components/templates/shared/thread-message-bubble";
import { GenerativeWidgetCard } from "@/components/templates/shared/components/generative-widget-card";

interface MessageBubbleProps {
	message: RovoRenderableUIMessage;
	onSuggestionClick?: (question: string) => void;
	enableSmartWidgets?: boolean;
}

export default function MessageBubble({
	message,
	onSuggestionClick,
	enableSmartWidgets = false,
}: Readonly<MessageBubbleProps>): React.ReactElement {
	return (
		<ThreadMessageBubble
			message={message}
			surface="sidebar"
			onSuggestionClick={onSuggestionClick}
			showFeedbackActions={true}
			showFollowUpSuggestions={true}
			showThinkingStatusSection={true}
			showToolsSection={true}
			showWidgetSections={enableSmartWidgets}
			renderWidget={(widget) => {
				if (!enableSmartWidgets) {
					return null;
				}

				return (
					<GenerativeWidgetCard
						widgetType={widget.type}
						widgetData={widget.data}
					/>
				);
			}}
		/>
	);
}
