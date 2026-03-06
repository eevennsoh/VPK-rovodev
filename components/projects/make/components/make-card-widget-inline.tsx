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
	sanitizePlanDescription,
} from "@/components/projects/shared/lib/plan-identity";
import { PlanTabContent } from "@/components/projects/shared/lib/plan-card-utils";
import { computeEstimate, parseAgentMultiplier } from "@/components/projects/shared/lib/agent-multiplier";
import { useMakeState, useMakeActions } from "@/app/contexts/context-make";
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

interface MakeCardWidgetInlineProps {
	title: string;
	tasks: PlanTask[];
	agents?: string[];
	description?: string;
	enrichedTitle?: string;
	enrichedDescription?: string;
	isStreaming?: boolean;
	collapsed?: boolean;
	onBuild?: () => void;
	onOpenPreview?: () => void;
}

export function MakeCardWidgetInline({
	title,
	tasks,
	agents = [],
	description,
	enrichedTitle,
	enrichedDescription,
	isStreaming = false,
	collapsed: controlledCollapsed,
	onBuild,
	onOpenPreview,
}: Readonly<MakeCardWidgetInlineProps>): React.ReactElement | null {
	const { agentCount } = useMakeState();
	const { setAgentCount } = useMakeActions();
	const [isOpen, setIsOpen] = useState(true);
	const [internalCollapsed, setInternalCollapsed] = useState(false);
	const isCollapsed = controlledCollapsed ?? internalCollapsed;
	const setIsCollapsed = setInternalCollapsed;
	const contentRef = useRef<HTMLDivElement>(null);
	const visibleTasks = useMemo(
		() => tasks.filter((task) => task.label.trim().length > 0),
		[tasks],
	);
	const taskCount = visibleTasks.length;
	const estimate = useMemo(() => computeEstimate(taskCount, agentCount), [agentCount, taskCount]);
	const agentMultiplierDisplay = `${agentCount}x`;
	const getAgentBuildLabel = (count: number) =>
		`Build with ${count} ${count === 1 ? "agent" : "agents"}`;
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

	const displayTitle = enrichedTitle || resolvePlanDisplayTitle(title, visibleTasks);
	const displayEmoji = derivePlanEmojiFromTitle(displayTitle);
	const descriptionText = enrichedDescription || sanitizePlanDescription(description, visibleTasks.length);

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
					description={<PlanDescription className="truncate text-xs leading-4 text-text-subtlest">{descriptionText}</PlanDescription>}
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
								<span className="text-xs leading-4 text-text-subtlest">{getAgentBuildLabel(agentCount)}</span>
								<Select value={agentMultiplierDisplay} onValueChange={(value) => setAgentCount(parseAgentMultiplier(value ?? "1x"))}>
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
