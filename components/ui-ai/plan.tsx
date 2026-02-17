"use client";

import type { ComponentProps } from "react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Tag } from "@/components/ui/tag";
import { token } from "@/lib/tokens";
import { cn } from "@/lib/utils";
import ChevronDownIcon from "@atlaskit/icon/core/chevron-down";
import PeopleGroupIcon from "@atlaskit/icon/core/people-group";
import { ChevronsUpDownIcon } from "lucide-react";
import { motion } from "motion/react";
import { createContext, useContext, useEffect, useRef, useState } from "react";

import { Shimmer } from "./shimmer";

/* ----- Types ----- */

export interface PlanTask {
	id: string;
	label: string;
	blockedBy: string[];
	agent?: string;
	agentAvatarSrc?: string;
}

/* ----- Context ----- */

interface PlanContextValue {
	isStreaming: boolean;
}

const PlanContext = createContext<PlanContextValue | null>(null);

const usePlan = () => {
	const context = useContext(PlanContext);
	if (!context) {
		throw new Error("Plan components must be used within Plan");
	}
	return context;
};

/* ----- Plan (root) ----- */

export type PlanProps = ComponentProps<typeof Collapsible> & {
	isStreaming?: boolean;
};

export const Plan = ({ className, isStreaming = false, children, ...props }: PlanProps) => (
	<PlanContext value={{ isStreaming }}>
		<Collapsible data-slot="plan" {...props} render={<Card className={cn("shadow-none", className)} />}>
			{children}
		</Collapsible>
	</PlanContext>
);

/* ----- PlanHeader ----- */

export type PlanHeaderProps = ComponentProps<typeof CardHeader>;

export const PlanHeader = ({ className, ...props }: PlanHeaderProps) => <CardHeader className={cn("flex items-start justify-between", className)} data-slot="plan-header" {...props} />;

/* ----- PlanAvatar ----- */

export type PlanAvatarProps = ComponentProps<"div"> & {
	emoji?: string;
};

export const PlanAvatar = ({ emoji = "✌️", className, ...props }: PlanAvatarProps) => (
	<div className={cn("flex size-8 shrink-0 items-center justify-center rounded-full bg-bg-neutral", className)} data-slot="plan-avatar" {...props}>
		<span className="text-base leading-5 text-text-subtle">{emoji}</span>
	</div>
);

/* ----- PlanTitle ----- */

export type PlanTitleProps = Omit<ComponentProps<typeof CardTitle>, "children"> & {
	children: string;
};

export const PlanTitle = ({ children, ...props }: PlanTitleProps) => {
	const { isStreaming } = usePlan();

	return (
		<CardTitle data-slot="plan-title" {...props}>
			{isStreaming ? <Shimmer>{children}</Shimmer> : children}
		</CardTitle>
	);
};

/* ----- PlanDescription ----- */

export type PlanDescriptionProps = Omit<ComponentProps<typeof CardDescription>, "children"> & {
	children: string;
};

export const PlanDescription = ({ className, children, ...props }: PlanDescriptionProps) => {
	const { isStreaming } = usePlan();

	return (
		<CardDescription className={cn("text-balance", className)} data-slot="plan-description" {...props}>
			{isStreaming ? <Shimmer>{children}</Shimmer> : children}
		</CardDescription>
	);
};

/* ----- PlanAction ----- */

export type PlanActionProps = ComponentProps<typeof CardAction>;

export const PlanAction = (props: PlanActionProps) => <CardAction data-slot="plan-action" {...props} />;

/* ----- PlanContent ----- */

export type PlanContentProps = ComponentProps<typeof CardContent>;

export const PlanContent = (props: PlanContentProps) => <CollapsibleContent render={<CardContent data-slot="plan-content" {...props} />} />;

/* ----- PlanFooter ----- */

export type PlanFooterProps = ComponentProps<"div">;

export const PlanFooter = (props: PlanFooterProps) => <CardFooter data-slot="plan-footer" {...props} />;

/* ----- PlanTrigger ----- */

export type PlanTriggerProps = ComponentProps<typeof CollapsibleTrigger>;

export const PlanTrigger = ({ className, ...props }: PlanTriggerProps) => (
	<CollapsibleTrigger render={<Button className={cn("size-8", className)} data-slot="plan-trigger" size="icon" variant="ghost" {...props} />}>
		<ChevronsUpDownIcon className="size-4" />
		<span className="sr-only">Toggle plan</span>
	</CollapsibleTrigger>
);

/* ----- PlanAgentBar ----- */

export type PlanAgentBarProps = ComponentProps<"div"> & {
	agents: string[];
};

export const PlanAgentBar = ({ agents, className, ...props }: PlanAgentBarProps) => {
	if (agents.length === 0) return null;

	return (
		<div className={cn("flex items-center gap-2 rounded-lg bg-bg-neutral px-3 py-2", className)} data-slot="plan-agent-bar" {...props}>
			<PeopleGroupIcon label="" size="small" color="currentColor" />
			<span className="text-xs leading-4 font-medium text-text-subtle">
				{agents.length} {agents.length === 1 ? "agent" : "agents"}
			</span>
			<span className="text-xs leading-4 text-text-subtlest">{agents.join(" · ")}</span>
		</div>
	);
};

/* ----- PlanTaskList ----- */

const COLLAPSED_LIST_MAX_HEIGHT_PX = 240;
const COLLAPSED_LIST_HEIGHT_CLASS = "max-h-[240px]";

export type PlanTaskListProps = ComponentProps<"ol"> & {
	showMoreLabel?: string;
};

export const PlanTaskList = ({ children, className, showMoreLabel = "Show more", ...props }: PlanTaskListProps) => {
	const [isExpanded, setIsExpanded] = useState(false);
	const [hasOverflow, setHasOverflow] = useState(false);
	const [hasMeasured, setHasMeasured] = useState(false);
	const listRef = useRef<HTMLOListElement | null>(null);

	useEffect(() => {
		if (isExpanded || !listRef.current) return;

		const listElement = listRef.current;
		const updateOverflow = () => {
			const overflowsVisible = listElement.scrollHeight - listElement.clientHeight > 1;
			const overflowsCollapsed = listElement.scrollHeight - COLLAPSED_LIST_MAX_HEIGHT_PX > 1;
			setHasOverflow(overflowsVisible || overflowsCollapsed);
			setHasMeasured(true);
		};

		const rafId = requestAnimationFrame(updateOverflow);

		if (typeof ResizeObserver === "undefined") {
			return () => cancelAnimationFrame(rafId);
		}

		const resizeObserver = new ResizeObserver(() => {
			updateOverflow();
		});

		resizeObserver.observe(listElement);

		return () => {
			cancelAnimationFrame(rafId);
			resizeObserver.disconnect();
		};
	}, [isExpanded]);

	const showCollapsedState = !isExpanded;
	const showCollapsedControls = showCollapsedState && (hasMeasured ? hasOverflow : false);

	return (
		<div className="relative" data-slot="plan-task-list">
			<ol ref={listRef} className={cn("flex flex-col gap-0", showCollapsedState ? `${COLLAPSED_LIST_HEIGHT_CLASS} overflow-hidden` : null, className)} {...props}>
				{children}
			</ol>

			{showCollapsedControls ? (
				<>
					<div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-surface via-surface/80 to-transparent" />
					<div className="absolute inset-x-0 bottom-2 flex justify-center">
						<Button
							size="xs"
							variant="ghost"
							className="h-7 rounded-full border-0 bg-surface px-3 text-sm leading-5 font-normal text-text-subtle hover:bg-surface-hovered"
							style={{ boxShadow: token("elevation.shadow.overlay") }}
							onClick={() => setIsExpanded(true)}
						>
							{showMoreLabel}
						</Button>
					</div>
				</>
			) : null}
		</div>
	);
};

/* ----- PlanTaskItem ----- */

export type PlanTaskItemProps = {
	index: number;
	label: string;
	blockedByLabels?: string[];
	agent?: string;
	agentAvatarSrc?: string;
	className?: string;
};

export const PlanTaskItem = ({ index, label, blockedByLabels, agent, agentAvatarSrc, className }: PlanTaskItemProps) => (
	<motion.li
		initial={{ opacity: 0, y: 8 }}
		animate={{ opacity: 1, y: 0 }}
		transition={{ duration: 0.25, ease: "easeOut" }}
		className={cn("flex min-h-8 shrink-0 items-center gap-4 rounded-lg bg-surface px-2 py-1.5", className)}
		style={{ willChange: "transform, opacity" }}
		data-slot="plan-task-item"
	>
		<span className="inline-flex size-5 shrink-0 items-center justify-center rounded-[4px] border border-border bg-surface text-sm leading-5 font-medium text-text">{index}</span>
		<div className="flex min-w-0 flex-1 flex-col gap-0.5">
			<span className="text-sm leading-5 text-text">{label}</span>
			{blockedByLabels && blockedByLabels.length > 0 ? <span className="text-xs leading-4 text-text-subtlest">Blocked by: {blockedByLabels.join(", ")}</span> : null}
		</div>
		{agent ? (
			<Tag
				type="agent"
				elemBefore={
					<Avatar size="xs" shape="hexagon">
						{agentAvatarSrc ? <AvatarImage src={agentAvatarSrc} alt={agent} /> : null}
						<AvatarFallback>{agent.slice(0, 2).toUpperCase()}</AvatarFallback>
					</Avatar>
				}
			>
				{agent}
			</Tag>
		) : null}
	</motion.li>
);

/* ----- PlanChevronTrigger ----- */

export type PlanChevronTriggerProps = ComponentProps<typeof Button> & {
	isOpen?: boolean;
};

export const PlanChevronTrigger = ({ isOpen = true, className, ...props }: PlanChevronTriggerProps) => (
	<Button
		aria-label={isOpen ? "Collapse plan" : "Expand plan"}
		size="icon"
		variant="ghost"
		className={cn("rounded-full [&_svg]:transition-transform [&_svg]:duration-150", isOpen ? "[&_svg]:rotate-0" : "[&_svg]:-rotate-90", className)}
		data-slot="plan-chevron-trigger"
		{...props}
	>
		<ChevronDownIcon label="" size="small" />
	</Button>
);
