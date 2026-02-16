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

interface AssistantToolsSectionProps {
	messageId: string;
	toolParts: RovoToolPart[];
}

export function AssistantToolsSection({
	messageId,
	toolParts,
}: Readonly<AssistantToolsSectionProps>): React.ReactElement {
	return (
		<div className="space-y-2 px-3 pt-2">
			{toolParts.map((toolPart, index) => (
				<Tool
					key={`${messageId}-tool-${toolPart.toolCallId}-${index}`}
					defaultOpen={toolPart.state !== "output-available"}
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
			))}
		</div>
	);
}
