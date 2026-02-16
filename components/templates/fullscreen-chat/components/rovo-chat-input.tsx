"use client";

import { token } from "@/lib/tokens";
import { cn } from "@/lib/utils";
import type { QueuedPromptItem } from "@/app/contexts";
import {
	PromptInput,
	PromptInputBody,
	PromptInputFooter,
	PromptInputHeader,
	PromptInputTextarea,
} from "@/components/ui-ai/prompt-input";
import { ChatPromptQueue } from "@/components/templates/shared/components/chat-prompt-queue";
import InputContextBar from "./input-context-bar";
import InputFooterTools from "./input-footer-tools";
import type { Product } from "../types";

interface RovoChatInputProps {
	prompt: string;
	interimText: string;
	isListening: boolean;
	isStreaming: boolean;
	onPromptChange: (prompt: string) => void;
	onSubmit: () => void;
	onToggleDictation: () => void;
	onStopStreaming: () => void;
	contextEnabled: boolean;
	onContextToggle: (enabled: boolean) => void;
	product: Product;
	selectedReasoning: string;
	onReasoningChange: (reasoning: string) => void;
	webResultsEnabled: boolean;
	onWebResultsChange: (enabled: boolean) => void;
	companyKnowledgeEnabled: boolean;
	onCompanyKnowledgeChange: (enabled: boolean) => void;
	queuedPrompts: ReadonlyArray<QueuedPromptItem>;
	onRemoveQueuedPrompt: (id: string) => void;
	customHeight?: string;
	hideUsesAI?: boolean;
	placeholder?: string;
}

export default function RovoChatInput({
	prompt,
	interimText,
	isListening,
	isStreaming,
	onPromptChange,
	onSubmit,
	onToggleDictation,
	onStopStreaming,
	contextEnabled,
	onContextToggle,
	product,
	selectedReasoning,
	onReasoningChange,
	webResultsEnabled,
	onWebResultsChange,
	companyKnowledgeEnabled,
	onCompanyKnowledgeChange,
	queuedPrompts,
	onRemoveQueuedPrompt,
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
					className={cn(
						"relative z-10 w-full",
						customHeight ? "flex h-full flex-col" : undefined
					)}
				>
					{queuedPrompts.length > 0 ? (
						<PromptInputHeader className="px-0 pb-2 pt-0">
							<ChatPromptQueue
								queuedPrompts={queuedPrompts}
								onRemoveQueuedPrompt={onRemoveQueuedPrompt}
							/>
						</PromptInputHeader>
					) : null}
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
							isStreaming={isStreaming}
							onToggleDictation={onToggleDictation}
							onStopStreaming={onStopStreaming}
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
