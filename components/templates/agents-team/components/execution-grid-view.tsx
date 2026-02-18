"use client";

import { memo, useCallback, useState } from "react";
import ArrowUpIcon from "@atlaskit/icon/core/arrow-up";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { useTheme } from "@/components/utils/theme-wrapper";
import { AdsReasoningTrigger, Reasoning } from "@/components/ui-ai/reasoning";
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
	onAddTask,
	showGeneratingEmptyState = false,
}: Readonly<ExecutionGridViewProps>) {
	const [inputValue, setInputValue] = useState("");
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
												label="Generating results"
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
