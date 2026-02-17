"use client";

import { memo, useState } from "react";
import { cn } from "@/lib/utils";
import ArrowUpIcon from "@atlaskit/icon/core/arrow-up";
import {
	PromptInput,
	PromptInputBody,
	PromptInputFooter,
	PromptInputSubmit,
	PromptInputTextarea,
} from "@/components/ui-ai/prompt-input";
import { SpeechInput } from "@/components/ui-ai/speech-input";
import type { TaskExecution } from "../lib/execution-data";
import { AgentScreen } from "./agent-screen";

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

export const ExecutionGridView = memo(function ExecutionGridView({
	taskExecutions,
	onAddTask,
}: Readonly<ExecutionGridViewProps>) {
	const [inputValue, setInputValue] = useState("");
	const columnCount = getGridColumns(taskExecutions.length);
	const rowCount =
		taskExecutions.length > 0
			? Math.ceil(taskExecutions.length / columnCount)
			: 1;

	const handleSubmit = (message: { text: string }) => {
		const trimmed = message.text.trim();
		if (!trimmed || !onAddTask) {
			return;
		}

		onAddTask(trimmed);
		setInputValue("");
	};
	const handleSpeechTranscription = (text: string) => {
		const trimmedTranscription = text.trim();
		if (!trimmedTranscription) {
			return;
		}

		setInputValue((previous) => {
			const trimmedPrevious = previous.trimEnd();
			return trimmedPrevious
				? `${trimmedPrevious} ${trimmedTranscription}`
				: trimmedTranscription;
		});
	};

	return (
		<div className="relative h-full min-h-0 overflow-y-auto">
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
				{taskExecutions.map((execution, index) => (
					<div
						key={execution.taskId}
						className={getSpanClass(
							getLastRowSpan(index, taskExecutions.length, columnCount)
						)}
					>
						<AgentScreen
							execution={execution}
							className="h-full"
						/>
					</div>
				))}

				{taskExecutions.length === 0 ? (
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

			{onAddTask ? (
				<div className="absolute inset-x-0 bottom-0 z-20 flex justify-center px-4 pb-4">
					<PromptInput
						allowOverflow
						onSubmit={handleSubmit}
						className="w-full max-w-[800px] rounded-xl border border-border bg-surface p-4"
						style={{
							boxShadow: "0px -2px 50px 0px rgba(30,31,33,0.08)",
						}}
					>
						<PromptInputBody>
							<PromptInputTextarea
								value={inputValue}
								onChange={(e) => setInputValue(e.currentTarget.value)}
								placeholder="Ask, @mention, or / for actions"
								rows={1}
							/>
						</PromptInputBody>
						<PromptInputFooter className="mt-1 justify-end px-0 pb-0">
							<SpeechInput
								aria-label="Voice"
								onTranscriptionChange={handleSpeechTranscription}
								size="icon"
							/>
							<PromptInputSubmit
								disabled={!inputValue.trim()}
								size="icon-sm"
								aria-label="Submit"
							>
								<ArrowUpIcon label="" />
							</PromptInputSubmit>
						</PromptInputFooter>
					</PromptInput>
				</div>
			) : null}
		</div>
	);
});

ExecutionGridView.displayName = "ExecutionGridView";
