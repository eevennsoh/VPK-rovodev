"use client";

import { useEffect, useState } from "react";
import {
	Plan,
	PlanAction,
	PlanAgentBar,
	PlanAvatar,
	PlanChevronTrigger,
	PlanContent,
	PlanDescription,
	PlanHeader,
	PlanTaskItem,
	PlanTaskList,
	PlanTitle,
	type PlanTask,
} from "@/components/ui-ai/plan";
import {
	derivePlanEmojiFromTitle,
	resolvePlanDisplayTitle,
} from "@/components/templates/shared/lib/plan-identity";
import { cn } from "@/lib/utils";

function stripTaskMarkdownDecorators(label: string): string {
	return label
		.replace(/\*\*([^*\n]+)\*\*/g, "$1")
		.replace(/__([^_\n]+)__/g, "$1")
		.replace(/^[*_`\s]+/, "")
		.replace(/[\s*_`]+$/, "")
		.trim();
}

function extractTaskHeading(label: string): string {
	const normalizedLabel = stripTaskMarkdownDecorators(label);
	const emDashIndex = normalizedLabel.indexOf("\u2014"); // em-dash
	if (emDashIndex === -1) return normalizedLabel;
	const heading = stripTaskMarkdownDecorators(normalizedLabel.slice(0, emDashIndex));
	return heading.length > 0 ? heading : normalizedLabel;
}

function resolveBlockedByLabels(task: PlanTask, allTasks: PlanTask[]): string[] {
	return task.blockedBy
		.map((blockedById) => {
			const taskIndex = allTasks.findIndex((t) => t.id === blockedById);
			return taskIndex >= 0 ? `Task ${taskIndex + 1}` : null;
		})
		.filter((label): label is string => label !== null);
}

interface PlanCardWidgetInlineProps {
	title: string;
	tasks: PlanTask[];
	agents?: string[];
	description?: string;
	isStreaming?: boolean;
}

export function PlanCardWidgetInline({
	title,
	tasks,
	agents = [],
	description,
	isStreaming = false,
}: Readonly<PlanCardWidgetInlineProps>): React.ReactElement | null {
	const [isOpen, setIsOpen] = useState(true);
	const visibleTasks = tasks.filter((task) => task.label.trim().length > 0);
	const [streamRevealCount, setStreamRevealCount] = useState(0);

	useEffect(() => {
		if (!isStreaming || streamRevealCount >= visibleTasks.length) return;

		const timer = setTimeout(() => {
			setStreamRevealCount((prev) => Math.min(prev + 1, visibleTasks.length));
		}, 150);

		return () => clearTimeout(timer);
	}, [isStreaming, streamRevealCount, visibleTasks.length]);

	const revealedCount = isStreaming ? streamRevealCount : visibleTasks.length;

	if (visibleTasks.length === 0 || !title.trim()) {
		return null;
	}

	const displayTitle = resolvePlanDisplayTitle(title, visibleTasks);
	const displayEmoji = derivePlanEmojiFromTitle(displayTitle);
	const descriptionText = description?.trim() ? description : `${visibleTasks.length} tasks`;

	return (
		<Plan className="w-full gap-3 py-0 shadow-xs" open={isOpen} onOpenChange={setIsOpen} isStreaming={isStreaming}>
			<PlanHeader className={cn("items-center px-4 pt-4", !isOpen && "pb-4")}>
				<div className="flex min-w-0 items-center gap-3">
					<PlanAvatar emoji={displayEmoji} />
					<div className="min-w-0">
						<PlanTitle className="truncate text-sm leading-5 font-semibold text-text">{displayTitle}</PlanTitle>
						<PlanDescription className="text-xs leading-4 text-text-subtlest">{descriptionText}</PlanDescription>
					</div>
				</div>
				<PlanAction className="self-center">
					<PlanChevronTrigger isOpen={isOpen} onClick={() => setIsOpen((prev) => !prev)} />
				</PlanAction>
			</PlanHeader>

			<PlanContent className="px-3 pb-4">
				<PlanAgentBar agents={agents} className="mb-2" />

				<PlanTaskList>
					{visibleTasks.slice(0, revealedCount).map((task, index) => (
						<PlanTaskItem key={task.id} index={index + 1} label={extractTaskHeading(task.label)} blockedByLabels={resolveBlockedByLabels(task, tasks)} agent={task.agent} />
					))}
				</PlanTaskList>
			</PlanContent>
		</Plan>
	);
}
