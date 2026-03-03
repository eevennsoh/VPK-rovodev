"use client";

import AgentsProgress from "@/components/blocks/agent-progress/page";
import { token } from "@/lib/tokens";
import type { AgentRunListItem } from "@/lib/make-run-types";
import {
	computeTaskStatusGroupsFromRun,
	toProgressDisplayStatusGroups,
} from "../lib/execution-data";
import { resolveRunCompletedAtForDisplay } from "../lib/run-timing";
import type { RetryTaskGroupKey } from "../lib/retry-task-groups";
import {
	derivePlanEmojiFromTitle,
	resolvePlanDisplayTitle,
} from "@/components/templates/shared/lib/plan-identity";

interface SidebarRunHistoryProps {
	items: AgentRunListItem[];
	activeRunId?: string | null;
	initialNowMs?: number;
	onSelectRun?: (runId: string) => void;
	onDeleteRun?: (runId: string) => void;
	onRetryRunGroup?: (
		runId: string,
		groupKey: RetryTaskGroupKey,
		taskIds: string[]
	) => Promise<void> | void;
}

function getTaskCount(run: AgentRunListItem): number {
	return run.tasks.length;
}

function getAgentCount(run: AgentRunListItem): number {
	return Math.max(
		1,
		new Set(
			run.tasks
				.map((task) => task.agentName)
				.filter((agentName): agentName is string => Boolean(agentName))
		).size
	);
}

function hasOngoingTasks(run: AgentRunListItem): boolean {
	return run.tasks.some((task) => task.status === "in-progress");
}

function isSummaryGenerating(run: AgentRunListItem): boolean {
	if (run.status === "running") {
		return true;
	}

	return run.summary == null;
}

export default function SidebarRunHistory({
	items,
	activeRunId = null,
	initialNowMs,
	onSelectRun,
	onDeleteRun,
	onRetryRunGroup,
}: Readonly<SidebarRunHistoryProps>) {
	if (items.length === 0) {
		return null;
	}

	return (
		<div className="flex w-full flex-col px-2 pt-3 pb-2">
			<div className="px-2.5 pb-2">
				<span style={{ font: token("font.heading.xxsmall") }} className="text-text-subtlest">
					Make
				</span>
			</div>
			<div className="flex flex-col gap-3 px-0.5">
				{items.map((run) => {
					const taskStatusGroups = toProgressDisplayStatusGroups(
						computeTaskStatusGroupsFromRun(run.tasks)
					);
					const displayPlanTitle = resolvePlanDisplayTitle(
						run.plan.title,
						run.plan.tasks
					);
					const displayPlanEmoji = derivePlanEmojiFromTitle(displayPlanTitle);
					const isActive = activeRunId === run.runId;
					const showSummaryRainbow = isSummaryGenerating(run) && hasOngoingTasks(run);
					return (
						<AgentsProgress
							key={run.runId}
							planTitle={displayPlanTitle}
							planEmoji={displayPlanEmoji}
							taskStatusGroups={taskStatusGroups}
							runStatus={run.status}
							runCreatedAt={run.createdAt}
							runCompletedAt={resolveRunCompletedAtForDisplay(run)}
							initialNowMs={initialNowMs}
							showSummaryRainbow={showSummaryRainbow}
							runCount={getTaskCount(run)}
							agentCount={getAgentCount(run)}
							defaultCollapsed={!isActive}
							isCollapsible={false}
							onCardClick={onSelectRun ? () => onSelectRun(run.runId) : undefined}
							onDelete={onDeleteRun ? () => onDeleteRun(run.runId) : undefined}
							onRetryGroup={
								onRetryRunGroup
									? (groupKey, taskIds) =>
											onRetryRunGroup(run.runId, groupKey, taskIds)
									: undefined
							}
						/>
					);
				})}
			</div>
		</div>
	);
}
