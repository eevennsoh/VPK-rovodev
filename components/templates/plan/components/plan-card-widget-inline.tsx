"use client";

import { useEffect, useMemo, useState } from "react";
import {
	Plan,
	PlanAvatar,
	PlanContent,
	PlanDescription,
	PlanHeader,
	PlanTitle,
	type PlanTask,
} from "@/components/ui-ai/plan";
import {
	derivePlanEmojiFromTitle,
	resolvePlanDisplayTitle,
} from "@/components/templates/shared/lib/plan-identity";
import { PlanTabContent } from "@/components/templates/shared/lib/plan-card-utils";

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
	const visibleTasks = useMemo(
		() => tasks.filter((task) => task.label.trim().length > 0),
		[tasks],
	);
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
	const descriptionText = description?.trim() ? `${visibleTasks.length} tasks • ${description.trim()}` : `${visibleTasks.length} tasks`;

	return (
		<Plan className="w-full gap-0 py-0 shadow-xs" open={isOpen} onOpenChange={setIsOpen} isStreaming={isStreaming}>
			<PlanHeader
				leading={<PlanAvatar emoji={displayEmoji} />}
				title={<PlanTitle className="truncate text-sm leading-5 font-semibold text-text">{displayTitle}</PlanTitle>}
				description={<PlanDescription className="text-xs leading-4 text-text-subtlest">{descriptionText}</PlanDescription>}
			/>

			<PlanContent className="px-0 pb-0 pt-4">
				<PlanTabContent
					description={description ?? ""}
					tasks={tasks}
					agents={agents}
					revealedCount={revealedCount}
				/>
			</PlanContent>
		</Plan>
	);
}
