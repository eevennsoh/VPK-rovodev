"use client";

import { use, type ReactNode } from "react";
import { ThreadMessageContext } from "./thread-message-context";
import { AssistantToolsSection } from "../components/assistant-tools-section";

/**
 * Renders standalone tool invocation results.
 *
 * Self-gates: returns null when there are no tool parts or when the
 * thinking-status section is active (which embeds tools internally).
 */
export function ThreadMessageTools(): ReactNode {
	const {
		message,
		toolParts,
		isThinkingStatusActive,
	} = use(ThreadMessageContext)!;

	if (toolParts.length === 0 || isThinkingStatusActive) {
		return null;
	}

	return (
		<AssistantToolsSection messageId={message.id} toolParts={toolParts} />
	);
}
