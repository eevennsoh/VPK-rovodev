import {
	getToolPartName,
	type RovoToolPart,
} from "@/lib/rovo-ui-messages";
import {
	Tool,
	ToolContent,
	ToolHeader,
	ToolInput,
	ToolOutput,
} from "@/components/ui-ai/tool";

type AssistantToolsSectionDefaultOpenMode = "details" | "running";

interface AssistantToolsSectionProps {
	messageId: string;
	toolParts: RovoToolPart[];
	defaultOpenMode?: AssistantToolsSectionDefaultOpenMode;
}

function hasToolDetails(toolPart: RovoToolPart): boolean {
	if (toolPart.input !== undefined) {
		return true;
	}

	if (toolPart.output !== undefined) {
		return true;
	}

	return Boolean(toolPart.errorText);
}

function isToolRunning(toolPart: RovoToolPart): boolean {
	return (
		toolPart.state === "approval-requested" ||
		toolPart.state === "input-streaming" ||
		toolPart.state === "input-available"
	);
}

export function AssistantToolsSection({
	messageId,
	toolParts,
	defaultOpenMode = "details",
}: Readonly<AssistantToolsSectionProps>): React.ReactElement {
	return (
		<div className="space-y-2 px-6 pt-2">
			{toolParts.map((toolPart, index) => {
				const shouldDefaultOpen =
					defaultOpenMode === "running"
						? isToolRunning(toolPart)
						: hasToolDetails(toolPart);

				return (
					<Tool
						key={`${messageId}-tool-${toolPart.toolCallId}-${index}`}
						defaultOpen={shouldDefaultOpen}
					>
					{toolPart.type === "dynamic-tool" ? (
						<ToolHeader
							title={getToolPartName(toolPart)}
							state={toolPart.state}
							toolName={toolPart.toolName}
							type={toolPart.type}
						/>
					) : (
						<ToolHeader
							title={getToolPartName(toolPart)}
							state={toolPart.state}
							type={toolPart.type}
						/>
					)}
					<ToolContent>
						<ToolInput input={toolPart.input} />
						<ToolOutput
							errorText={toolPart.errorText}
							output={toolPart.output}
						/>
					</ToolContent>
					</Tool>
				);
			})}
		</div>
	);

}
