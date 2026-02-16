"use client";

import type { RovoRenderableUIMessage } from "@/lib/rovo-ui-messages";
import { ThreadMessageBubble } from "@/components/templates/shared/thread-message-bubble";

interface MessageBubbleProps {
	message: RovoRenderableUIMessage;
	onSuggestionClick?: (question: string) => void;
}

export default function MessageBubble({
	message,
	onSuggestionClick,
}: Readonly<MessageBubbleProps>): React.ReactElement {
	return (
		<ThreadMessageBubble
			message={message}
			surface="sidebar"
			onSuggestionClick={onSuggestionClick}
			showFeedbackActions={true}
			showFollowUpSuggestions={true}
			showToolsSection={false}
			showWidgetSections={false}
		/>
	);
}
