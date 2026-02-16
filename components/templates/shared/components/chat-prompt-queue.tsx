"use client";

import type { QueuedPromptItem } from "@/app/contexts";
import {
	Queue,
	QueueItem,
	QueueItemAction,
	QueueItemActions,
	QueueItemContent,
	QueueItemIndicator,
	QueueList,
	QueueSection,
	QueueSectionContent,
	QueueSectionLabel,
	QueueSectionTrigger,
} from "@/components/ui-ai/queue";
import { cn } from "@/lib/utils";
import { Clock3Icon, XIcon } from "lucide-react";

interface ChatPromptQueueProps {
	queuedPrompts: ReadonlyArray<QueuedPromptItem>;
	activePrompt: QueuedPromptItem | null;
	onRemoveQueuedPrompt: (id: string) => void;
	className?: string;
}

export function ChatPromptQueue({
	queuedPrompts,
	activePrompt,
	onRemoveQueuedPrompt,
	className,
}: Readonly<ChatPromptQueueProps>) {
	const queueTotal = queuedPrompts.length + (activePrompt ? 1 : 0);

	if (queueTotal === 0) {
		return null;
	}

	return (
		<div className={cn("pointer-events-auto", className)}>
			<Queue className="rounded-xl border-border bg-surface-raised shadow-none">
				<QueueSection defaultOpen>
					<QueueSectionTrigger className="rounded-lg bg-bg-neutral px-2 py-1.5 text-text-subtle hover:bg-bg-neutral-hovered">
						<QueueSectionLabel
							count={queueTotal}
							label="queued"
							icon={<Clock3Icon className="size-3.5 text-icon-subtle" />}
						/>
					</QueueSectionTrigger>
					<QueueSectionContent>
						<QueueList className="mt-1">
							{activePrompt ? (
								<QueueItem>
									<div className="flex items-center gap-2">
										<QueueItemIndicator />
										<QueueItemContent className="text-text-subtle">
											{activePrompt.text}
										</QueueItemContent>
										<span className="text-text-subtlest text-xs">In progress</span>
									</div>
								</QueueItem>
							) : null}
							{queuedPrompts.map((queuedPrompt) => (
								<QueueItem key={queuedPrompt.id}>
									<div className="flex items-center gap-2">
										<QueueItemIndicator />
										<QueueItemContent className="text-text-subtle">
											{queuedPrompt.text}
										</QueueItemContent>
										<QueueItemActions>
											<QueueItemAction
												aria-label="Remove queued message"
												onClick={() => onRemoveQueuedPrompt(queuedPrompt.id)}
												className="text-icon-subtle"
											>
												<XIcon className="size-3.5" />
											</QueueItemAction>
										</QueueItemActions>
									</div>
								</QueueItem>
							))}
						</QueueList>
					</QueueSectionContent>
				</QueueSection>
			</Queue>
		</div>
	);
}
