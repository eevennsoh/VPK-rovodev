"use client";

import type { QueuedPromptItem } from "@/app/contexts";
import { Button } from "@/components/ui/button";
import {
	QueueItem,
	QueueItemActions,
	QueueItemContent,
	QueueItemIndicator,
	QueueList,
} from "@/components/ui-ai/queue";
import { cn } from "@/lib/utils";
import DeleteIcon from "@atlaskit/icon/core/delete";

interface ChatPromptQueueProps {
	queuedPrompts: ReadonlyArray<QueuedPromptItem>;
	onRemoveQueuedPrompt: (id: string) => void;
	className?: string;
}

export function ChatPromptQueue({
	queuedPrompts,
	onRemoveQueuedPrompt,
	className,
}: Readonly<ChatPromptQueueProps>) {
	if (queuedPrompts.length === 0) {
		return null;
	}

	return (
		<QueueList
			className={cn(
				"mt-0 mb-0 w-full [&_[data-slot=scroll-area-viewport]>div]:max-h-28 [&_[data-slot=scroll-area-viewport]>div]:pr-0 [&_ul]:w-full",
				className
			)}
		>
			{queuedPrompts.map((queuedPrompt) => (
				<QueueItem
					key={queuedPrompt.id}
					className="w-full rounded-xl bg-surface px-3 py-2 hover:bg-surface-hovered"
				>
					<div className="flex items-center gap-2">
						<QueueItemIndicator />
						<QueueItemContent className="text-text-subtle">
							{queuedPrompt.text}
						</QueueItemContent>
						<QueueItemActions className="ml-auto">
							<Button
								aria-label="Remove queued message"
								onClick={() => onRemoveQueuedPrompt(queuedPrompt.id)}
								size="icon-sm"
								variant="ghost"
								className="size-7 cursor-pointer rounded-full text-icon-subtle opacity-0 transition-opacity group-hover:opacity-100"
							>
								<DeleteIcon label="" size="small" />
							</Button>
						</QueueItemActions>
					</div>
				</QueueItem>
			))}
		</QueueList>
	);
}
