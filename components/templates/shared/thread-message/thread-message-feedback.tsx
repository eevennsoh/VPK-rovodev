"use client";

import { use, type ReactNode } from "react";
import { ThreadMessageContext } from "./thread-message-context";
import { AssistantFeedbackActions } from "../components/assistant-feedback-actions";

export function ThreadMessageFeedback(): ReactNode {
	const {
		messageText,
		isStreaming,
		shouldRenderMessageText,
		hasRenderedWidget,
	} = use(ThreadMessageContext)!;

	if (isStreaming || !shouldRenderMessageText || hasRenderedWidget) {
		return null;
	}

	return <AssistantFeedbackActions messageText={messageText} />;
}
