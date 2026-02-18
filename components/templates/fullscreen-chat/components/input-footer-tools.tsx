"use client";

import { useState } from "react";
import { token } from "@/lib/tokens";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
	PromptInputActionMenu,
	PromptInputActionMenuContent,
	PromptInputActionMenuTrigger,
	PromptInputButton,
	PromptInputMicrophone,
	PromptInputSubmit,
	PromptInputTools,
} from "@/components/ui-ai/prompt-input";
import CustomizeMenu from "./customize-menu";
import InputAddMenu from "./input-add-menu";
import AddIcon from "@atlaskit/icon/core/add";
import ArrowUpIcon from "@atlaskit/icon/core/arrow-up";
import CrossIcon from "@atlaskit/icon/core/cross";
import CustomizeIcon from "@atlaskit/icon/core/customize";
import MicrophoneIcon from "@atlaskit/icon/core/microphone";

interface InputFooterToolsProps {
	isListening: boolean;
	isStreaming: boolean;
	onToggleDictation: () => void;
	onStopStreaming: () => void;
	prompt: string;
	selectedReasoning: string;
	onReasoningChange: (reasoning: string) => void;
	webResultsEnabled: boolean;
	onWebResultsChange: (enabled: boolean) => void;
	companyKnowledgeEnabled: boolean;
	onCompanyKnowledgeChange: (enabled: boolean) => void;
}

export default function InputFooterTools({
	isListening,
	isStreaming,
	onToggleDictation,
	onStopStreaming,
	prompt,
	selectedReasoning,
	onReasoningChange,
	webResultsEnabled,
	onWebResultsChange,
	companyKnowledgeEnabled,
	onCompanyKnowledgeChange,
}: Readonly<InputFooterToolsProps>) {
	const [isAddMenuOpen, setIsAddMenuOpen] = useState(false);
	const [isCustomizeMenuOpen, setIsCustomizeMenuOpen] = useState(false);

	return (
		<>
			<PromptInputTools>
				<PromptInputActionMenu open={isAddMenuOpen} onOpenChange={setIsAddMenuOpen}>
					<PromptInputActionMenuTrigger aria-label="Add" size="icon-sm" variant="ghost">
						<AddIcon label="" />
					</PromptInputActionMenuTrigger>
					<PromptInputActionMenuContent side="top" align="start" sideOffset={8}>
						<InputAddMenu onClose={() => setIsAddMenuOpen(false)} />
					</PromptInputActionMenuContent>
				</PromptInputActionMenu>

				<Popover open={isCustomizeMenuOpen} onOpenChange={setIsCustomizeMenuOpen}>
					<PopoverTrigger
						render={
							<PromptInputButton
								aria-label="Customize"
								size="icon-sm"
								variant="ghost"
							/>
						}
					>
						<CustomizeIcon label="" />
					</PopoverTrigger>
					<PopoverContent side="top" align="start" sideOffset={8} className="w-[330px] p-2">
						<CustomizeMenu
							selectedReasoning={selectedReasoning}
							onReasoningChange={onReasoningChange}
							webResultsEnabled={webResultsEnabled}
							onWebResultsChange={onWebResultsChange}
							companyKnowledgeEnabled={companyKnowledgeEnabled}
							onCompanyKnowledgeChange={onCompanyKnowledgeChange}
							onClose={() => setIsCustomizeMenuOpen(false)}
						/>
					</PopoverContent>
				</Popover>
			</PromptInputTools>

			<div style={{ display: "flex", alignItems: "center", gap: token("space.050") }}>
				<PromptInputMicrophone
					aria-label={isListening ? "Stop listening" : "Voice"}
					onClick={onToggleDictation}
				>
					{isListening ? <CrossIcon label="" /> : <MicrophoneIcon label="" />}
				</PromptInputMicrophone>
				<PromptInputSubmit
					aria-label="Submit"
					size="icon-sm"
					disabled={!isStreaming && !prompt.trim()}
					onStop={onStopStreaming}
					status={isStreaming ? "streaming" : "ready"}
				>
					<ArrowUpIcon label="" />
				</PromptInputSubmit>
			</div>
		</>
	);
}
