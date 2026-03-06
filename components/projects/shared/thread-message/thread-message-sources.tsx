"use client";

import { use, type ReactNode } from "react";
import { ThreadMessageContext } from "./thread-message-context";
import { AssistantSourcesSection } from "../components/assistant-sources-section";

export function ThreadMessageSources(): ReactNode {
	const { message, sources } = use(ThreadMessageContext)!;

	if (sources.length === 0) {
		return null;
	}

	return (
		<AssistantSourcesSection messageId={message.id} sources={sources} />
	);
}
