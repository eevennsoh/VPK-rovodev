"use client";

import { memo, useCallback, useMemo, useState } from "react";
import ArrowUpIcon from "@atlaskit/icon/core/arrow-up";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { useTheme } from "@/components/utils/theme-wrapper";
import { AdsReasoningTrigger, Reasoning } from "@/components/ui-ai/reasoning";
import { REASONING_LABELS } from "@/components/projects/shared/lib/reasoning-labels";
import {
	PromptInput,
	PromptInputBody,
	PromptInputSubmit,
	PromptInputTextarea,
} from "@/components/ui-ai/prompt-input";
import { SpeechInput } from "@/components/ui-ai/speech-input";
import type { TaskExecution } from "../lib/execution-data";
import { AgentScreen } from "./agent-screen";

interface ExecutionGridViewProps {
	taskExecutions: TaskExecution[];
	onAddTask?: (message: string) => void;
	showGeneratingEmptyState?: boolean;
}

/**
 * Returns the number of CSS grid columns based on the active agent count.
 *
 * Layout rules:
 * - 1 agent: full-width single column
 * - 2 agents: 2 equal columns
 * - 3 agents: 2 columns (the last item spans full width via getLastRowSpan)
 * - 4 agents: 2x2 grid
 */
function getGridColumns(agentCount: number): number {
	if (agentCount <= 1) {
		return 1;
	}

	return 2;
}

/**
 * Calculate column span for the last item in the grid to fill remaining space.
 * For 3 agents in a 2-column grid: the third item spans both columns (2+1 layout).
 */
function getLastRowSpan(index: number, total: number, columns: number): 1 | 2 {
	if (total === 0 || columns === 1) {
		return 1;
	}

	const remainder = total % columns;
	if (remainder === 0) {
		return 1;
	}

	// Only the very last item should span extra columns to fill the row
	const firstIndexInLastRow = total - remainder;
	if (index < firstIndexInLastRow || index !== total - 1) {
		return 1;
	}

	return 2;
}

function getSpanClass(span: 1 | 2): string | undefined {
	if (span === 2) {
		return "md:col-span-2";
	}

	return undefined;
}

function getVisibleExecutions(taskExecutions: TaskExecution[]): TaskExecution[] {
	const latestWorkingByAgentId = new Map<string, TaskExecution>();
	for (const execution of taskExecutions) {
		if (execution.status !== "working") {
			continue;
		}
		latestWorkingByAgentId.set(execution.agentId, execution);
	}

	const toLaneIndex = (agentId: string): number => {
		const laneMatch = /^lane-(\d+)$/i.exec(agentId);
		if (!laneMatch) {
			return Number.POSITIVE_INFINITY;
		}
		return Number.parseInt(laneMatch[1], 10);
	};

	return Array.from(latestWorkingByAgentId.values()).sort((leftExecution, rightExecution) => {
		const leftLaneIndex = toLaneIndex(leftExecution.agentId);
		const rightLaneIndex = toLaneIndex(rightExecution.agentId);
		if (leftLaneIndex !== rightLaneIndex) {
			return leftLaneIndex - rightLaneIndex;
		}

		return leftExecution.agentName.localeCompare(rightExecution.agentName);
	});
}

export const ExecutionGridView = memo(function ExecutionGridView({
	taskExecutions,
	onAddTask,
	showGeneratingEmptyState = false,
}: Readonly<ExecutionGridViewProps>) {
	const [inputValue, setInputValue] = useState("");
	const { actualTheme } = useTheme();
	const visibleExecutions = useMemo(
		() => getVisibleExecutions(taskExecutions),
		[taskExecutions],
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

	const handleSubmit = useCallback(
		(message: { text: string }) => {
			const trimmed = message.text.trim();
			if (!trimmed || !onAddTask) return;
			onAddTask(trimmed);
			setInputValue("");
		},
		[onAddTask],
	);

	const handleSpeechTranscription = useCallback((text: string) => {
		const trimmed = text.trim();
		if (!trimmed) return;
		setInputValue((prev) => {
			const trimmedPrev = prev.trimEnd();
			return trimmedPrev ? `${trimmedPrev} ${trimmed}` : trimmed;
		});
	}, []);

	return (
		<div className="relative flex h-full min-h-0 min-w-0 flex-col">
			<div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden">
				<div
					className={cn(
						"grid h-full min-h-0 grid-cols-1 auto-rows-[minmax(280px,1fr)] gap-px bg-border transition-all duration-300 ease-in-out md:[grid-template-columns:repeat(var(--execution-grid-columns),minmax(0,1fr))] md:[grid-template-rows:repeat(var(--execution-grid-rows),minmax(280px,1fr))]"
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
								className={cn(
									"animate-in fade-in duration-300",
									getSpanClass(
										getLastRowSpan(index, visibleExecutions.length, columnCount)
									)
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

			{onAddTask ? (
				<div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 px-4 pb-6">
					<PromptInput
						variant="floating"
						onSubmit={handleSubmit}
						allowOverflow
						className="pointer-events-auto mx-auto w-full max-w-[800px]"
					>
						<PromptInputBody className="flex w-full items-center justify-between gap-2">
							<PromptInputTextarea
								value={inputValue}
								onChange={(e) => setInputValue(e.currentTarget.value)}
								placeholder="Ask, @mention, or / for actions"
								aria-label="Add task input"
								rows={1}
								className="min-h-0 flex-1 py-0"
							/>
							<div className="flex shrink-0 items-center gap-1">
								<SpeechInput
									aria-label="Voice"
									onTranscriptionChange={handleSpeechTranscription}
									variant="ghost"
								/>
								<PromptInputSubmit
									disabled={!inputValue.trim()}
									aria-label="Submit"
								>
									<ArrowUpIcon label="" />
								</PromptInputSubmit>
							</div>
						</PromptInputBody>
					</PromptInput>
				</div>
			) : null}
		</div>
	);
});

ExecutionGridView.displayName = "ExecutionGridView";
