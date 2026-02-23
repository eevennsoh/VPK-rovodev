"use client";

import type { ReactNode } from "react";
import type { RovoRenderableUIMessage } from "@/lib/rovo-ui-messages";
import { ThreadMessage } from "@/components/templates/shared/thread-message";
import { GenerativeWidgetCard } from "@/components/templates/shared/components/generative-widget-card";
import type { GenerativeCardAnimationProps } from "@/components/templates/shared/components/generative-widget-card";
import type { GenerativeWidgetPrimaryActionPayload } from "@/components/templates/shared/lib/generative-widget";

interface MessageBubbleProps {
	message: RovoRenderableUIMessage;
	onSuggestionClick?: (question: string) => void;
	enableSmartWidgets?: boolean;
	showThinkingStatusSection?: boolean;
	generativeCardAnimation?: GenerativeCardAnimationProps;
	onWidgetPrimaryAction?: (
		payload: GenerativeWidgetPrimaryActionPayload
	) => Promise<void> | void;
}

export default function MessageBubble({
	message,
	onSuggestionClick,
	enableSmartWidgets = false,
	showThinkingStatusSection = true,
	generativeCardAnimation,
	onWidgetPrimaryAction,
}: Readonly<MessageBubbleProps>): ReactNode {
	const renderWidget = enableSmartWidgets
		? (widget: { type: string; data: unknown }) => (
				<GenerativeWidgetCard
					widgetType={widget.type}
					widgetData={widget.data}
					cardAnimation={generativeCardAnimation}
					onPrimaryAction={onWidgetPrimaryAction}
				/>
			)
		: undefined;

	return (
		<ThreadMessage.Root
			message={message}
			surface="sidebar"
			renderWidget={renderWidget}
		>
			<ThreadMessage.Reasoning />
			{showThinkingStatusSection ? <ThreadMessage.ThinkingStatus /> : null}
			<ThreadMessage.Widget position="before-content" />
			<ThreadMessage.Content />
			<ThreadMessage.Feedback />
			<ThreadMessage.Tools />
			<ThreadMessage.ToolFirstWarning />
			<ThreadMessage.Sources />
			<ThreadMessage.Suggestions onSuggestionClick={onSuggestionClick} />
			<ThreadMessage.Widget position="after-content" />
		</ThreadMessage.Root>
	);
}
