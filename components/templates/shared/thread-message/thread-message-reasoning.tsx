"use client";

import { use, type ReactNode } from "react";
import { ThreadMessageContext } from "./thread-message-context";
import { AssistantReasoningSection } from "../components/assistant-reasoning-section";

export function ThreadMessageReasoning(): ReactNode {
	const { reasoning } = use(ThreadMessageContext)!;

	if (!reasoning) {
		return null;
	}

	return <AssistantReasoningSection reasoning={reasoning} />;
}
