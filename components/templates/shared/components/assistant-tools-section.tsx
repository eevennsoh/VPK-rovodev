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
import { useEffect, useState } from "react";

type AssistantToolsSectionDefaultOpenMode = "details" | "running";

interface AssistantToolsSectionProps {
	messageId: string;
	toolParts: RovoToolPart[];
	defaultOpenMode?: AssistantToolsSectionDefaultOpenMode;
}

type ToolOpenState = Record<string, boolean>;

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
	const [openByToolKey, setOpenByToolKey] = useState<ToolOpenState>({});

	useEffect(() => {
		setOpenByToolKey((previousOpenByToolKey) => {
			const nextOpenByToolKey: ToolOpenState = {};
			let hasChanges = false;

			for (const [index, toolPart] of toolParts.entries()) {
				const toolKey = `${messageId}-tool-${toolPart.toolCallId}-${index}`;
				const shouldDefaultOpen =
					defaultOpenMode === "running"
						? isToolRunning(toolPart)
						: hasToolDetails(toolPart);
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
	}, [defaultOpenMode, messageId, toolParts]);

	return (
		<div className="space-y-2 px-6 pt-2">
			{toolParts.map((toolPart, index) => {
				const shouldDefaultOpen =
					defaultOpenMode === "running"
						? isToolRunning(toolPart)
						: hasToolDetails(toolPart);
				const toolKey = `${messageId}-tool-${toolPart.toolCallId}-${index}`;
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
