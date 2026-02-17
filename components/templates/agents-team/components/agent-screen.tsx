"use client";

import { memo, useMemo } from "react";
import { cn } from "@/lib/utils";
import { token } from "@/lib/tokens";
import {
	Conversation,
	ConversationContent,
	ConversationScrollButton,
} from "@/components/ui-ai/conversation";
import { Message, MessageContent, MessageResponse } from "@/components/ui-ai/message";
import { AdsReasoningTrigger, Reasoning } from "@/components/ui-ai/reasoning";
import type { TaskExecution } from "../lib/execution-data";

interface AgentScreenProps {
	execution: TaskExecution;
	className?: string;
}

function areAgentScreenPropsEqual(
	previous: Readonly<AgentScreenProps>,
	next: Readonly<AgentScreenProps>
): boolean {
	return (
		previous.className === next.className &&
		previous.execution.taskId === next.execution.taskId &&
		previous.execution.taskLabel === next.execution.taskLabel &&
		previous.execution.agentId === next.execution.agentId &&
		previous.execution.agentName === next.execution.agentName &&
		previous.execution.status === next.execution.status &&
		previous.execution.content === next.execution.content
	);
}

export const AgentScreen = memo(function AgentScreen({
	execution,
	className,
}: Readonly<AgentScreenProps>) {
	const isWorking = execution.status === "working";

	const conversation = useMemo(() => {
		const result: { id: string; role: "assistant"; content: string }[] = [];

		if (execution.content) {
			result.push({ id: "a-0", role: "assistant", content: execution.content });
		}

		return result;
	}, [execution.content]);

	return (
		<div
			className={cn(
				"flex flex-col overflow-hidden border-b border-r border-border",
				className
			)}
		>
			<div className="flex items-center px-3 py-2">
				<div className="flex min-w-0 items-center">
					<div className="flex min-w-0 flex-col items-start">
						<span
							style={{ font: token("font.heading.xsmall") }}
							className="truncate text-text"
						>
							{execution.taskLabel}
						</span>
						<div className="flex items-center gap-1">
							<span className="text-xs leading-4 text-text-subtlest">
								{execution.taskId}
							</span>
							<span className="text-xs leading-4 text-text-subtlest">•</span>
							<span className="inline-flex size-3 items-center justify-center">
								<span
									className={cn(
										"inline-block size-2 rounded-full",
										isWorking ? "bg-bg-success-bold" : "bg-bg-neutral"
									)}
								/>
							</span>
							<span className="text-xs leading-4 text-text-subtlest">
								{execution.agentName}
							</span>
						</div>
					</div>
				</div>
			</div>

			<Conversation className="min-h-0 flex-1">
				<ConversationContent className="gap-4 p-3">
					{conversation.length > 0 ? (
						conversation.map((msg) => (
							<Message key={msg.id} from="assistant" className="max-w-full">
								<MessageContent>
									<MessageResponse>{msg.content}</MessageResponse>
								</MessageContent>
							</Message>
						))
					) : isWorking ? (
						<Message from="assistant" className="max-w-full">
						<MessageContent className="px-3">
							<Reasoning className="mb-0" isStreaming>
								<AdsReasoningTrigger label="Working" showChevron={false} />
							</Reasoning>
						</MessageContent>
					</Message>
					) : null}
				</ConversationContent>
				<ConversationScrollButton />
			</Conversation>
		</div>
	);
}, areAgentScreenPropsEqual);

AgentScreen.displayName = "AgentScreen";
