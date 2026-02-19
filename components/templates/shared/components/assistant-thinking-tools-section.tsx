import type { ToolPart } from "@/components/ui-ai/tool";
import {
	Tool,
	ToolContent,
	ToolHeader,
	ToolInput,
	ToolOutput,
} from "@/components/ui-ai/tool";
import type { ThinkingToolCallSummary } from "@/lib/rovo-ui-messages";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";

type AssistantThinkingToolsSectionDefaultOpenMode = "details" | "running";

interface AssistantThinkingToolsSectionProps {
	thinkingToolCalls: ThinkingToolCallSummary[];
	idPrefix: string;
	defaultOpenMode?: AssistantThinkingToolsSectionDefaultOpenMode;
	className?: string;
}

type ToolOpenState = Record<string, boolean>;

function hasToolDetails(toolCall: ThinkingToolCallSummary): boolean {
	return (
		toolCall.input !== undefined ||
		toolCall.output !== undefined ||
		Boolean(toolCall.errorText)
	);
}

function isToolRunning(toolCall: ThinkingToolCallSummary): boolean {
	return toolCall.state === "running";
}

function toToolUiState(
	state: ThinkingToolCallSummary["state"]
): ToolPart["state"] {
	if (state === "running") {
		return "input-available";
	}
	if (state === "error") {
		return "output-error";
	}
	return "output-available";
}

export function AssistantThinkingToolsSection({
	thinkingToolCalls,
	idPrefix,
	defaultOpenMode = "details",
	className,
}: Readonly<AssistantThinkingToolsSectionProps>): React.ReactElement {
	const [openByToolKey, setOpenByToolKey] = useState<ToolOpenState>({});

	useEffect(() => {
		setOpenByToolKey((previousOpenByToolKey) => {
			const nextOpenByToolKey: ToolOpenState = {};
			let hasChanges = false;

			for (const [index, toolCall] of thinkingToolCalls.entries()) {
				const toolKey = `${idPrefix}-thinking-tool-${toolCall.id}-${index}`;
				const shouldDefaultOpen =
					defaultOpenMode === "running"
						? isToolRunning(toolCall)
						: hasToolDetails(toolCall);
				const previousOpen = previousOpenByToolKey[toolKey];

				if (previousOpen === undefined) {
					nextOpenByToolKey[toolKey] = shouldDefaultOpen;
					hasChanges = true;
					continue;
				}

				nextOpenByToolKey[toolKey] = previousOpen;
			}

			if (
				!hasChanges &&
				Object.keys(previousOpenByToolKey).length ===
					Object.keys(nextOpenByToolKey).length
			) {
				return previousOpenByToolKey;
			}

			return nextOpenByToolKey;
		});
	}, [defaultOpenMode, idPrefix, thinkingToolCalls]);

	return (
		<div className={cn("space-y-2", className)}>
			{thinkingToolCalls.map((toolCall, index) => {
				const shouldDefaultOpen =
					defaultOpenMode === "running"
						? isToolRunning(toolCall)
						: hasToolDetails(toolCall);
				const toolKey = `${idPrefix}-thinking-tool-${toolCall.id}-${index}`;
				const isOpen = openByToolKey[toolKey] ?? shouldDefaultOpen;

				return (
					<Tool
						key={toolKey}
						open={isOpen}
						onOpenChange={(nextOpen) => {
							setOpenByToolKey((previousOpenByToolKey) => {
								if (previousOpenByToolKey[toolKey] === nextOpen) {
									return previousOpenByToolKey;
								}
								return {
									...previousOpenByToolKey,
									[toolKey]: nextOpen,
								};
							});
						}}
					>
						<ToolHeader
							title={toolCall.toolName}
							state={toToolUiState(toolCall.state)}
							type="dynamic-tool"
							toolName={toolCall.toolName}
						/>
						<ToolContent>
							{toolCall.input !== undefined ? (
								<ToolInput input={toolCall.input} />
							) : null}
							<ToolOutput
								errorText={toolCall.errorText}
								output={toolCall.output}
							/>
						</ToolContent>
					</Tool>
				);
			})}
		</div>
	);
}
