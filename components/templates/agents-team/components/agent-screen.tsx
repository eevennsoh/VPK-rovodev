"use client";

import { memo, useMemo } from "react";
import { cn } from "@/lib/utils";
import { token } from "@/lib/tokens";
import { Button } from "@/components/ui/button";
import CommentIcon from "@atlaskit/icon/core/comment";
import VideoPauseIcon from "@atlaskit/icon/core/video-pause";
import { MessageResponse } from "@/components/ui-ai/message";
import {
	Conversation,
	ConversationContent,
	ConversationScrollButton,
} from "@/components/ui-ai/conversation";
import { ThinkingIndicator } from "@/components/templates/shared/components/thinking-indicator";
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
	const isVisualPresenter = execution.agentName === "Visual Presenter";

	const conversation = useMemo(() => {
		const result: { id: string; role: "assistant"; content: string }[] = [];

		if (execution.content && !isVisualPresenter) {
			result.push({ id: "a-0", role: "assistant", content: execution.content });
		}

		return result;
	}, [execution.content, isVisualPresenter]);

	const renderVisualPresenterContent = () => {
		if (isWorking) {
			return <ThinkingIndicator label="Designing visual presentation..." />;
		}
		if (execution.status === "completed") {
			return (
				<div className="flex items-center gap-2 text-sm text-text-success">
					<span className="inline-block size-2 rounded-full bg-bg-success-bold" />
					Visual presentation ready
				</div>
			);
		}
		if (execution.status === "failed") {
			return (
				<div className="flex items-center gap-2 text-sm text-text-danger">
					<span className="inline-block size-2 rounded-full bg-bg-danger-bold" />
					Visual presentation failed
				</div>
			);
		}
		return null;
	};

	return (
		<div
			className={cn(
				"flex flex-col overflow-hidden border-b border-r border-border",
				className
			)}
		>
			<div className="flex items-center justify-between px-3 py-2">
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
				<div className="flex items-center gap-2">
					<Button
						aria-label="View details"
						variant="ghost"
						size="icon-sm"
						className="text-icon-subtle"
					>
						<CommentIcon label="" size="small" />
					</Button>
					<Button
						aria-label="Pause agent"
						variant="ghost"
						size="icon-sm"
						className="text-icon-subtle"
					>
						<VideoPauseIcon label="" size="small" />
					</Button>
				</div>
			</div>

			<Conversation className="min-h-0 flex-1">
				<ConversationContent className="gap-4 p-3">
					{isVisualPresenter ? (
						renderVisualPresenterContent()
					) : conversation.length > 0 ? (
						conversation.map((msg) => (
							<MessageResponse key={msg.id} className="text-sm">
								{msg.content}
							</MessageResponse>
						))
					) : isWorking ? (
						<ThinkingIndicator label="Working..." />
					) : null}
				</ConversationContent>
				<ConversationScrollButton />
			</Conversation>
		</div>
	);
}, areAgentScreenPropsEqual);

AgentScreen.displayName = "AgentScreen";
