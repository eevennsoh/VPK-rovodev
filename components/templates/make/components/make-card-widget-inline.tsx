"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
	Plan,
	PlanAvatar,
	PlanChevronTrigger,
	PlanContent,
	PlanDescription,
	PlanFooter,
	PlanHeader,
	PlanTitle,
	type PlanTask,
} from "@/components/ui-ai/plan";
import {
	derivePlanEmojiFromTitle,
	resolvePlanDisplayTitle,
} from "@/components/templates/shared/lib/plan-identity";
import { PlanTabContent } from "@/components/templates/shared/lib/plan-card-utils";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { token } from "@/lib/tokens";
import FullscreenEnterIcon from "@atlaskit/icon/core/fullscreen-enter";

// ---------------------------------------------------------------------------
// Collapsed bubble
// ---------------------------------------------------------------------------

interface CollapsedPlanBubbleProps {
	title: string;
	emoji: string;
	onExpand: () => void;
}

function CollapsedPlanBubble({ title, emoji, onExpand }: Readonly<CollapsedPlanBubbleProps>) {
	return (
		<button
			type="button"
			onClick={onExpand}
			className="flex w-full cursor-pointer items-center gap-3 rounded-xl border border-border bg-surface-raised px-4 py-3 text-left transition-colors hover:bg-surface-raised-hovered"
			style={{ boxShadow: token("elevation.shadow.raised") }}
		>
			<span className="text-base">{emoji}</span>
			<span className="min-w-0 flex-1 truncate text-sm font-semibold text-text">{title}</span>
			<PlanChevronTrigger
				isOpen={false}
				onClick={(e) => {
					e.stopPropagation();
					onExpand();
				}}
			/>
		</button>
	);
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

interface MakerCardWidgetInlineProps {
	title: string;
	tasks: PlanTask[];
	agents?: string[];
	description?: string;
	isStreaming?: boolean;
	collapsed?: boolean;
	onBuild?: () => void;
	onOpenPreview?: () => void;
}

const USD_FORMATTER = new Intl.NumberFormat(undefined, {
	style: "currency",
	currency: "USD",
	minimumFractionDigits: 2,
	maximumFractionDigits: 2,
});

function parseAgentMultiplier(value: string): number {
	const parsedValue = Number.parseInt(value, 10);
	return Number.isFinite(parsedValue) && parsedValue > 0 ? parsedValue : 1;
}

function formatEstimatedDuration(minutes: number): string {
	return minutes === 1 ? "~1 min" : `~${minutes} min`;
}

export function MakeCardWidgetInline({
	title,
	tasks,
	agents = [],
	description,
	isStreaming = false,
	collapsed: controlledCollapsed,
	onBuild,
	onOpenPreview,
}: Readonly<MakerCardWidgetInlineProps>): React.ReactElement | null {
	const [isOpen, setIsOpen] = useState(true);
	const [internalCollapsed, setInternalCollapsed] = useState(false);
	const [agentMultiplier, setAgentMultiplier] = useState("1x");
	const isCollapsed = controlledCollapsed ?? internalCollapsed;
	const setIsCollapsed = setInternalCollapsed;
	const contentRef = useRef<HTMLDivElement>(null);
	const visibleTasks = useMemo(
		() => tasks.filter((task) => task.label.trim().length > 0),
		[tasks],
	);
	const taskCount = visibleTasks.length;
	const multiplier = useMemo(() => parseAgentMultiplier(agentMultiplier), [agentMultiplier]);
	const estimate = useMemo(() => {
		const baseCostUsd = Math.max(0.2, taskCount * 0.17);
		const baseDurationMinutes = Math.max(1, Math.round(taskCount * 0.6));
		const scaledCostUsd = baseCostUsd * multiplier;
		const scaledDurationMinutes = Math.max(
			1,
			Math.round(baseDurationMinutes / (1 + 0.6 * (multiplier - 1))),
		);

		return {
			cost: USD_FORMATTER.format(scaledCostUsd),
			duration: formatEstimatedDuration(scaledDurationMinutes),
		};
	}, [multiplier, taskCount]);
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
	const descriptionText = description?.trim() ? `${visibleTasks.length} tasks • Description` : `${visibleTasks.length} tasks`;

	if (isCollapsed) {
		return <CollapsedPlanBubble title={displayTitle} emoji={displayEmoji} onExpand={() => setIsCollapsed(false)} />;
	}

	return (
		<div
			ref={contentRef}
			className="w-full transition-[height] duration-300 ease-out"
		>
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

					{/* Footer CTAs */}
					<PlanFooter className="flex-wrap items-end justify-between gap-x-4 gap-y-3 border-t border-border px-4 py-3">
						<div className="min-w-0 flex flex-wrap items-center gap-x-6 gap-y-2">
							<div className="flex flex-col gap-0.5">
								<span className="text-xs leading-4 text-text-subtlest">Estimated cost and time</span>
								<span className="text-xs leading-4 font-medium text-text">
									{estimate.cost} • {estimate.duration}
								</span>
							</div>
							<div className="flex flex-col gap-0.5">
								<span className="text-xs leading-4 text-text-subtlest">Number of agents</span>
								<Select value={agentMultiplier} onValueChange={(value) => setAgentMultiplier(value ?? "1x")}>
									<SelectTrigger variant="none" size="sm" className="!h-auto gap-1 !p-0 text-xs leading-4 font-medium text-text">
										<SelectValue />
									</SelectTrigger>
									<SelectContent alignItemWithTrigger={false} align="start" className="min-w-0">
										<SelectGroup>
											<SelectItem value="1x" className="py-1.5 pl-7 pr-2.5 text-xs">1x</SelectItem>
											<SelectItem value="2x" className="py-1.5 pl-7 pr-2.5 text-xs">2x</SelectItem>
											<SelectItem value="3x" className="py-1.5 pl-7 pr-2.5 text-xs">3x</SelectItem>
											<SelectItem value="4x" className="py-1.5 pl-7 pr-2.5 text-xs">4x</SelectItem>
										</SelectGroup>
									</SelectContent>
								</Select>
							</div>
						</div>
						<div className="ml-auto flex shrink-0 flex-wrap items-center justify-end gap-2">
							{onOpenPreview ? (
								<Button variant="outline" onClick={onOpenPreview} disabled={isStreaming}>
									<FullscreenEnterIcon label="" size="small" />
									Open preview
								</Button>
							) : null}
							{onBuild ? (
								<Button onClick={onBuild} disabled={isStreaming}>
									Build
								</Button>
							) : null}
						</div>
					</PlanFooter>
				</PlanContent>
			</Plan>
		</div>
	);
}
