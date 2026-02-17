"use client";

import { memo, useCallback, useMemo, useState } from "react";
import ArrowUpIcon from "@atlaskit/icon/core/arrow-up";
import { cn } from "@/lib/utils";
import {
	PromptInput,
	PromptInputBody,
	PromptInputSubmit,
	PromptInputTextarea,
} from "@/components/ui-ai/prompt-input";
import { SpeechInput } from "@/components/ui-ai/speech-input";
import type { TaskExecution } from "../lib/execution-data";
import { AgentScreen } from "./agent-screen";

const MAX_VISIBLE_AGENTS = 4;

interface ExecutionGridViewProps {
	taskExecutions: TaskExecution[];
	onAddTask?: (message: string) => void;
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

function selectVisibleExecutions(
	executions: ReadonlyArray<TaskExecution>,
	maxVisible: number
): TaskExecution[] {
	const working = executions.filter((e) => e.status === "working");
	if (working.length >= maxVisible) {
		return working.slice(0, maxVisible);
	}

	const finished = executions.filter(
		(e) => e.status === "completed" || e.status === "failed"
	);
	const backfillCount = maxVisible - working.length;
	return [...working, ...finished.slice(-backfillCount)];
}

export const ExecutionGridView = memo(function ExecutionGridView({
	taskExecutions,
	onAddTask,
}: Readonly<ExecutionGridViewProps>) {
	const [inputValue, setInputValue] = useState("");
	const visibleExecutions = useMemo(
		() => selectVisibleExecutions(taskExecutions, MAX_VISIBLE_AGENTS),
		[taskExecutions]
	);
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
		<div className="relative h-full min-h-0 min-w-0 overflow-hidden">
			<div className="h-full min-h-0 min-w-0 overflow-y-auto overflow-x-hidden">
				<div
					className={cn(
						"grid h-full min-h-0 grid-cols-1 auto-rows-[minmax(280px,1fr)] pb-24 md:[grid-template-columns:repeat(var(--execution-grid-columns),minmax(0,1fr))] md:[grid-template-rows:repeat(var(--execution-grid-rows),minmax(280px,1fr))]"
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
						<div className="col-span-full flex items-center justify-center">
							<div className="flex flex-col items-center gap-3 text-center">
								<div className="size-10 animate-spin rounded-full border-2 border-border border-t-text-subtle" />
								<span className="text-sm text-text-subtlest">
									Initializing tasks...
								</span>
							</div>
						</div>
					) : null}
				</div>
			</div>

			{onAddTask ? (
				<div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 flex justify-center px-4 pb-4">
					<PromptInput
						onSubmit={handleSubmit}
						variant="floating"
						className="pointer-events-auto max-w-[800px]"
					>
						<PromptInputBody className="flex w-full items-center justify-between gap-2">
							<PromptInputTextarea
								value={inputValue}
								onChange={(e) => setInputValue(e.currentTarget.value)}
								placeholder="Ask, @mention, or / for actions"
								rows={1}
								className="min-h-0 flex-1 py-0"
							/>
							<div className="flex shrink-0 items-center gap-1">
								<SpeechInput
									aria-label="Voice"
									onTranscriptionChange={handleSpeechTranscription}
									size="icon-sm"
									variant="ghost"
								/>
								<PromptInputSubmit
									disabled={!inputValue.trim()}
									size="icon-sm"
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
