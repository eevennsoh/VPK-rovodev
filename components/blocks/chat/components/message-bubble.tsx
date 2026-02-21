"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import type { ChatMessage } from "../hooks/use-chat-submit";

interface MessageBubbleProps {
	message: ChatMessage;
}

export default function MessageBubble({ message }: Readonly<MessageBubbleProps>): ReactNode {
	const isUserMessage = message.type === "user";

	return (
		<div className={cn("flex w-full", isUserMessage ? "justify-end" : "justify-start")}>
			<div
				className={cn(
					"max-w-[85%] whitespace-pre-wrap rounded-2xl px-3 py-2 text-sm leading-6",
					isUserMessage
						? "bg-bg-brand-bold text-text-inverse"
						: "border border-border bg-surface-raised text-text"
				)}
			>
				{message.content}
			</div>
		</div>
	);
}
