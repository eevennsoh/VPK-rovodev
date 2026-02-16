"use client";

import { token } from "@/lib/tokens";
import { cn } from "@/lib/utils";
import {
	PromptInput,
	PromptInputBody,
	PromptInputFooter,
	PromptInputTextarea,
} from "@/components/ui-ai/prompt-input";
import InputContextBar from "./input-context-bar";
import InputFooterTools from "./input-footer-tools";
import type { Product } from "../types";

interface RovoChatInputProps {
	prompt: string;
	interimText: string;
	isListening: boolean;
	onPromptChange: (prompt: string) => void;
	onSubmit: () => void;
	onToggleDictation: () => void;
	contextEnabled: boolean;
	onContextToggle: (enabled: boolean) => void;
	product: Product;
	selectedReasoning: string;
	onReasoningChange: (reasoning: string) => void;
	webResultsEnabled: boolean;
	onWebResultsChange: (enabled: boolean) => void;
	companyKnowledgeEnabled: boolean;
	onCompanyKnowledgeChange: (enabled: boolean) => void;
	customHeight?: string;
	hideUsesAI?: boolean;
	placeholder?: string;
}

export default function RovoChatInput({
	prompt,
	interimText,
	isListening,
	onPromptChange,
	onSubmit,
	onToggleDictation,
	contextEnabled,
	onContextToggle,
	product,
	selectedReasoning,
	onReasoningChange,
	webResultsEnabled,
	onWebResultsChange,
	companyKnowledgeEnabled,
	onCompanyKnowledgeChange,
	customHeight,
	hideUsesAI = false,
	placeholder,
}: Readonly<RovoChatInputProps>) {
	void onContextToggle;

	return (
		<div style={{ padding: "0 12px" }}>
			{contextEnabled && (product === "confluence" || product === "jira") ? (
				<InputContextBar product={product} />
			) : null}

			<div
				style={{
					backgroundColor: token("elevation.surface"),
					border: `1px solid ${token("color.border")}`,
					borderRadius: token("radius.xlarge"),
					padding: "16px 16px 12px",
					boxShadow: `0 -2px 50px 8px ${token("color.background.neutral.subtle")}`,
					display: customHeight ? "flex" : "block",
					flexDirection: customHeight ? "column" : undefined,
					...(customHeight ? { height: customHeight } : {}),
				}}
			>
				<PromptInput
					onSubmit={onSubmit}
					className={cn("w-full", customHeight ? "flex h-full flex-col" : undefined)}
				>
					<PromptInputBody className={cn(customHeight ? "flex-1" : undefined)}>
						<PromptInputTextarea
							value={prompt + interimText}
							onChange={(e) => {
								const newValue = e.currentTarget.value;
								if (!isListening || newValue.length < prompt.length) {
									onPromptChange(newValue);
								}
							}}
							placeholder={isListening ? "Listening..." : (placeholder ?? "Write a prompt, @someone, or use / for actions")}
							rows={1}
							aria-label="Chat message input"
							className={cn(
								"max-h-[120px] min-h-[24px] resize-none border-0 px-0 py-0 shadow-none focus-visible:ring-0",
								customHeight ? "h-full max-h-none min-h-0" : undefined
							)}
						/>
					</PromptInputBody>

					<PromptInputFooter className="mt-2 justify-between px-0 pb-0">
						<InputFooterTools
							isListening={isListening}
							onToggleDictation={onToggleDictation}
							prompt={prompt}
							selectedReasoning={selectedReasoning}
							onReasoningChange={onReasoningChange}
							webResultsEnabled={webResultsEnabled}
							onWebResultsChange={onWebResultsChange}
							companyKnowledgeEnabled={companyKnowledgeEnabled}
							onCompanyKnowledgeChange={onCompanyKnowledgeChange}
						/>
					</PromptInputFooter>
				</PromptInput>
			</div>

			{!hideUsesAI ? (
				<div className="flex items-center justify-center py-2">
					<span style={{ font: token("font.body.small"), color: token("color.text.subtlest") }}>
						Uses AI. Verify results.
					</span>
				</div>
			) : null}
		</div>
	);
}
