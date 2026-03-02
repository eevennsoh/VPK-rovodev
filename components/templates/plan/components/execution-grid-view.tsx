"use client";

import { memo } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { useTheme } from "@/components/utils/theme-wrapper";
import { AdsReasoningTrigger, Reasoning } from "@/components/ui-ai/reasoning";
import { REASONING_LABELS } from "@/components/templates/shared/lib/reasoning-labels";
import type { TaskExecution } from "../lib/execution-data";
import { AgentScreen } from "./agent-screen";

interface ExecutionGridViewProps {
	taskExecutions: TaskExecution[];
	showGeneratingEmptyState?: boolean;
}

function getGridColumns(agentCount: number): number {
	if (agentCount <= 1) {
		return 1;
	}

	if (agentCount <= 4) {
		return 2;
	}

	return 3;
}

function getLastRowSpan(index: number, total: number, columns: number): 1 | 2 | 3 {
	if (total === 0 || columns === 1) {
		return 1;
	}

	const remainder = total % columns;
	if (remainder === 0) {
		return 1;
	}

	const firstIndexInLastRow = total - remainder;
	if (index < firstIndexInLastRow || index !== total - 1) {
		return 1;
	}

	return (columns - remainder + 1) as 1 | 2 | 3;
}

function getSpanClass(span: 1 | 2 | 3): string | undefined {
	if (span === 2) {
		return "md:col-span-2";
	}

	if (span === 3) {
		return "md:col-span-3";
	}

	return undefined;
}

export const ExecutionGridView = memo(function ExecutionGridView({
	taskExecutions,
	showGeneratingEmptyState = false,
}: Readonly<ExecutionGridViewProps>) {
	const { actualTheme } = useTheme();
	const visibleExecutions = taskExecutions.filter(
		(execution) => execution.status === "working"
	);
	const loadingAnimationSrc = actualTheme === "dark"
		? "/loading/rovo-create-dark.gif"
		: "/loading/rovo-create-light.gif";
	const shouldShowGeneratingEmptyState =
		visibleExecutions.length === 0 && showGeneratingEmptyState;
	const columnCount = getGridColumns(visibleExecutions.length);
	const rowCount =
		visibleExecutions.length > 0
			? Math.ceil(visibleExecutions.length / columnCount)
			: 1;

	return (
		<div className="relative flex h-full min-h-0 min-w-0 flex-col">
			<div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden">
				<div
					className={cn(
						"grid h-full min-h-0 grid-cols-1 auto-rows-[minmax(280px,1fr)] gap-px bg-border md:[grid-template-columns:repeat(var(--execution-grid-columns),minmax(0,1fr))] md:[grid-template-rows:repeat(var(--execution-grid-rows),minmax(280px,1fr))]"
					)}
					style={
						{
							"--execution-grid-columns": columnCount,
							"--execution-grid-rows": rowCount,
						} as React.CSSProperties
					}
					>
						{visibleExecutions.map((execution, index) => (
							<div
								key={execution.taskId}
								className={getSpanClass(
									getLastRowSpan(index, visibleExecutions.length, columnCount)
								)}
							>
								<AgentScreen
									execution={execution}
									className="h-full"
								/>
							</div>
						))}

						{visibleExecutions.length === 0 ? (
							<div className="col-span-full flex items-center justify-center bg-surface">
								{shouldShowGeneratingEmptyState ? (
									<div className="flex items-center justify-center">
										<Reasoning isStreaming className="mb-0">
											<AdsReasoningTrigger
												label={REASONING_LABELS.trigger.generatingResults}
												showChevron={false}
												className="w-auto justify-center text-text-subtlest hover:text-text-subtlest"
											/>
										</Reasoning>
									</div>
								) : (
									<div className="flex flex-col items-center gap-3 text-center">
										<Image
											alt=""
											className="h-28 w-auto"
											height={280}
											src={loadingAnimationSrc}
											unoptimized
											width={442}
										/>
										<span className="text-sm text-text-subtlest">
											Add more tasks or make a change
										</span>
									</div>
								)}
							</div>
						) : null}
					</div>
				</div>

		</div>
	);
});

ExecutionGridView.displayName = "ExecutionGridView";
