"use client";

import { useEffect, useState } from "react";
import ChevronDownIcon from "@atlaskit/icon/core/chevron-down";
import PeopleGroupIcon from "@atlaskit/icon/core/people-group";
import {
	Plan,
	PlanAction,
	PlanContent,
	PlanDescription,
	PlanHeader,
	PlanTitle,
} from "@/components/ui-ai/plan";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { motion } from "motion/react";
import type { ParsedPlanTask } from "@/components/templates/shared/lib/plan-widget";

const DEFAULT_VISIBLE_TASKS = 6;
const COLLAPSED_LIST_HEIGHT_CLASS = "max-h-[280px]";

interface PlanCardWidgetProps {
	title: string;
	tasks: ParsedPlanTask[];
	agents?: string[];
	description?: string;
	emoji?: string;
	className?: string;
	style?: React.CSSProperties;
	collapsedVisibleTasks?: number;
	showMoreLabel?: string;
	isStreaming?: boolean;
}

export function PlanCardWidget({
	title,
	tasks,
	agents = [],
	description,
	emoji = "✌️",
	className,
	style,
	collapsedVisibleTasks = DEFAULT_VISIBLE_TASKS,
	showMoreLabel = "Show more",
	isStreaming = false,
}: Readonly<PlanCardWidgetProps>): React.ReactElement | null {
	const [isOpen, setIsOpen] = useState(true);
	const [isExpanded, setIsExpanded] = useState(false);
	const visibleTasks = tasks.filter((task) => task.label.trim().length > 0);
	const [streamRevealCount, setStreamRevealCount] = useState(0);

	useEffect(() => {
		if (!isStreaming || streamRevealCount >= visibleTasks.length) return;

		const timer = setTimeout(() => {
			setStreamRevealCount((prev) => Math.min(prev + 1, visibleTasks.length));
		}, 150);

		return () => clearTimeout(timer);
	}, [isStreaming, streamRevealCount, visibleTasks.length]);

	const revealedCount = isStreaming
		? streamRevealCount
		: visibleTasks.length;

	if (visibleTasks.length === 0 || !title.trim()) {
		return null;
	}

	const safeCollapsedVisibleTasks = Math.max(1, collapsedVisibleTasks);
	const canShowMore = visibleTasks.length > safeCollapsedVisibleTasks;
	const showCollapsedState = canShowMore ? !isExpanded : false;
	const descriptionText = description?.trim()
		? description
		: `${visibleTasks.length} tasks`;

	return (
		<Plan
			className={cn("w-full gap-3 py-0 shadow-xs", className)}
			style={style}
			open={isOpen}
			onOpenChange={setIsOpen}
			isStreaming={isStreaming}
		>
			<PlanHeader className={cn("items-center px-4 pt-4", !isOpen && "pb-4")}>
				<div className="flex min-w-0 items-center gap-3">
					<div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-bg-neutral">
						<span className="text-base leading-5 text-text-subtle">
							{emoji}
						</span>
					</div>
					<div className="min-w-0">
						<PlanTitle className="truncate text-sm leading-5 font-semibold text-text">
							{title}
						</PlanTitle>
						<PlanDescription className="text-xs leading-4 text-text-subtlest">
							{descriptionText}
						</PlanDescription>
					</div>
				</div>
				<PlanAction className="self-center">
					<Button
						aria-label={isOpen ? "Collapse plan" : "Expand plan"}
						size="icon-xs"
						variant="ghost"
						onClick={() => setIsOpen((previousValue) => !previousValue)}
					>
						<span
							className={cn(
								"flex items-center justify-center transition-transform duration-150",
								isOpen ? "rotate-0" : "-rotate-90"
							)}
						>
							<ChevronDownIcon label="" size="small" />
						</span>
					</Button>
				</PlanAction>
			</PlanHeader>

			<PlanContent className="px-3 pb-4">
				{agents.length > 0 ? (
					<div className="mb-2 flex items-center gap-2 rounded-lg bg-bg-neutral px-3 py-2">
						<PeopleGroupIcon label="" size="small" color="currentColor" />
						<span className="text-xs leading-4 font-medium text-text-subtle">
							{agents.length} {agents.length === 1 ? "agent" : "agents"}
						</span>
						<span className="text-xs leading-4 text-text-subtlest">
							{agents.join(" · ")}
						</span>
					</div>
				) : null}

				<div className="relative">
					<ol
						className={cn(
							"flex flex-col gap-1",
							showCollapsedState
								? `${COLLAPSED_LIST_HEIGHT_CLASS} overflow-hidden`
								: null
						)}
					>
						{visibleTasks.slice(0, revealedCount).map((task, index) => (
							<motion.li
								key={task.id}
								initial={{ opacity: 0, y: 8 }}
								animate={{ opacity: 1, y: 0 }}
								transition={{ duration: 0.25, ease: "easeOut" }}
								className="flex min-h-8 items-start gap-2 rounded-lg bg-surface px-2 py-1.5"
								style={{ willChange: "transform, opacity" }}
							>
								<span className="mt-0.5 inline-flex size-5 shrink-0 items-center justify-center rounded-[4px] border border-border bg-surface text-sm leading-5 font-medium text-text">
									{index + 1}
								</span>
								<div className="flex min-w-0 flex-1 flex-col gap-0.5">
									<span className="text-sm leading-5 font-medium text-text">
										{task.label}
									</span>
									{task.blockedBy.length > 0 ? (() => {
									const blockedByLabels = task.blockedBy
										.map((blockedById) => {
											const taskIndex = tasks.findIndex(
												(t) => t.id === blockedById
											);
											return taskIndex >= 0
												? `Task ${taskIndex + 1}`
												: null;
										})
										.filter((label): label is string => label !== null);
									return blockedByLabels.length > 0 ? (
										<span className="text-xs leading-4 text-text-subtlest">
											Blocked by: {blockedByLabels.join(", ")}
										</span>
									) : null;
								})() : null}
								</div>
								{task.agent ? (
									<span className="mt-0.5 shrink-0 rounded-md bg-bg-neutral px-1.5 py-0.5 text-xs leading-4 font-medium text-text-subtle">
										{task.agent}
									</span>
								) : null}
							</motion.li>
						))}
					</ol>

					{showCollapsedState ? (
						<>
							<div className="pointer-events-none absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-surface to-transparent" />
							<div className="absolute inset-x-0 bottom-2 flex justify-center">
								<Button
									size="xs"
									variant="ghost"
									className="h-6 rounded-full px-3 text-sm leading-5 font-normal text-text-subtle shadow-xs"
									onClick={() => setIsExpanded(true)}
								>
									{showMoreLabel}
								</Button>
							</div>
						</>
					) : null}
				</div>
			</PlanContent>
		</Plan>
	);
}
