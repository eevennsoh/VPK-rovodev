"use client";

import { use, type ReactNode } from "react";
import { ThreadMessageContext } from "./thread-message-context";
import { AssistantReasoningSection } from "../components/assistant-reasoning-section";

export function ThreadMessageReasoning(): ReactNode {
	const { reasoning, isThinkingStatusActive } = use(ThreadMessageContext)!;

	if (!reasoning || isThinkingStatusActive) {
		return null;
	}

	return <AssistantReasoningSection reasoning={reasoning} />;
}
