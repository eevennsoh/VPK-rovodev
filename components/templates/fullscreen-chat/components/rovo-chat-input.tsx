"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import type { QueuedPromptItem } from "@/app/contexts";
import CustomizeMenu from "@/components/blocks/shared-ui/customize-menu";
import {
	PromptInput,
	PromptInputActionMenu,
	PromptInputActionMenuContent,
	PromptInputActionMenuItem,
	PromptInputActionMenuTrigger,
	PromptInputBody,
	PromptInputButton,
	PromptInputFooter,
	PromptInputSubmit,
	PromptInputTextarea,
	PromptInputTools,
} from "@/components/ui-ai/prompt-input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { composerUpwardShadow, composerPromptInputClassName, composerTextareaClassName, textareaCSS } from "@/components/blocks/shared-ui/composer-styles";
import { Queue, QueueItem, QueueItemActions, QueueItemContent, QueueItemIndicator, QueueList } from "@/components/ui-ai/queue";
import { SpeechInput } from "@/components/ui-ai/speech-input";
import { Button } from "@/components/ui/button";
import DeleteIcon from "@atlaskit/icon/core/delete";
import { Footer } from "@/components/ui/footer";
import AddIcon from "@atlaskit/icon/core/add";
import ArrowUpIcon from "@atlaskit/icon/core/arrow-up";
import CustomizeIcon from "@atlaskit/icon/core/customize";
import LinkIcon from "@atlaskit/icon/core/link";
import MentionIcon from "@atlaskit/icon/core/mention";
import PageIcon from "@atlaskit/icon/core/page";
import UploadIcon from "@atlaskit/icon/core/upload";
import InputContextBar from "./input-context-bar";
import type { Product } from "../types";

interface RovoChatInputProps {
	prompt: string;
	isStreaming: boolean;
	hasInFlightTurn: boolean;
	onPromptChange: (prompt: string) => void;
	onSubmit: () => void;
	onStop: () => void;
	contextEnabled: boolean;
	onContextToggle: (enabled: boolean) => void;
	product: Product;
	queuedPrompts: ReadonlyArray<QueuedPromptItem>;
	onRemoveQueuedPrompt: (id: string) => void;
	customHeight?: string;
	hideUsesAI?: boolean;
	placeholder?: string;
}

export default function RovoChatInput({
	prompt,
	isStreaming,
	hasInFlightTurn,
	onPromptChange,
	onSubmit,
	onStop,
	contextEnabled,
	onContextToggle,
	product,
	queuedPrompts,
	onRemoveQueuedPrompt,
	customHeight,
	hideUsesAI = false,
	placeholder,
}: Readonly<RovoChatInputProps>) {
	void onContextToggle;

	const [selectedReasoning, setSelectedReasoning] = useState("deep-research");
	const [webResultsEnabled, setWebResultsEnabled] = useState(false);
	const [companyKnowledgeEnabled, setCompanyKnowledgeEnabled] = useState(true);
	const [isAddMenuOpen, setIsAddMenuOpen] = useState(false);
	const [isCustomizeMenuOpen, setIsCustomizeMenuOpen] = useState(false);
	const hasQueuedPrompts = queuedPrompts.length > 0;
	const submitStatus = isStreaming
		? "streaming"
		: hasInFlightTurn
			? "submitted"
			: "ready";

	const handleSpeechTranscription = (text: string) => {
		const trimmedTranscription = text.trim();
		if (!trimmedTranscription) return;
		const trimmedPrompt = prompt.trimEnd();
		onPromptChange(trimmedPrompt ? `${trimmedPrompt} ${trimmedTranscription}` : trimmedTranscription);
	};

	return (
		<div className="relative px-3">
			{contextEnabled && (product === "confluence" || product === "jira") ? <InputContextBar product={product} /> : null}

			{hasQueuedPrompts ? (
				<div className="pointer-events-none absolute bottom-full left-4 right-4 z-0">
					<Queue className="pointer-events-auto rounded-b-none border-border border-b-0 bg-surface-raised px-2 pt-2 pb-2 shadow-none">
						<QueueList className="mt-0 mb-0 w-full [&_[data-slot=scroll-area-viewport]>div]:max-h-28 [&_[data-slot=scroll-area-viewport]>div]:pr-0 [&_ul]:w-full">
							{queuedPrompts.map((queuedPrompt) => (
								<QueueItem key={queuedPrompt.id} className="w-full bg-surface py-2 hover:bg-surface-hovered">
									<div className="flex items-center gap-2">
										<QueueItemIndicator />
										<QueueItemContent className="text-text-subtle">{queuedPrompt.text}</QueueItemContent>
										<QueueItemActions>
											<Button
												aria-label="Remove queued message"
												onClick={() => onRemoveQueuedPrompt(queuedPrompt.id)}
												size="icon-sm"
												variant="ghost"
												className="size-7 cursor-pointer rounded-full text-icon-subtle opacity-0 transition-opacity group-hover:opacity-100"
											>
												<DeleteIcon label="" size="small" />
											</Button>
										</QueueItemActions>
									</div>
								</QueueItem>
							))}
						</QueueList>
					</Queue>
				</div>
			) : null}

			<div
				className={cn(
					"relative z-10 rounded-xl border border-border bg-surface px-4 pb-3 pt-4",
					customHeight ? "flex flex-col" : undefined,
				)}
				style={{
					boxShadow: composerUpwardShadow,
					...(customHeight ? { height: customHeight, transition: "height var(--duration-normal) var(--ease-out)" } : {}),
				}}
			>
				<PromptInput
					allowOverflow
					onSubmit={onSubmit}
					className={cn(composerPromptInputClassName, "relative z-10", customHeight ? "flex h-full flex-col [&>[data-slot=input-group]]:h-full" : undefined)}
				>
					<PromptInputBody className={cn(customHeight ? "flex-1" : undefined)}>
						<PromptInputTextarea
							value={prompt}
							onChange={(e) => onPromptChange(e.currentTarget.value)}
							placeholder={placeholder ?? "Ask, @mention, or / for skills"}
							aria-label="Chat message input"
							rows={1}
							className={cn(composerTextareaClassName, customHeight ? "h-full max-h-none min-h-0" : undefined)}
						/>
					</PromptInputBody>

					<PromptInputFooter className="mt-3 justify-between px-0 pb-0">
						<PromptInputTools>
							<PromptInputActionMenu open={isAddMenuOpen} onOpenChange={setIsAddMenuOpen}>
								<PromptInputActionMenuTrigger aria-label="Add" size="icon-sm" variant="ghost">
									<AddIcon label="" />
								</PromptInputActionMenuTrigger>
								<PromptInputActionMenuContent>
									<PromptInputActionMenuItem onSelect={() => setIsAddMenuOpen(false)} elemBefore={<UploadIcon label="" />}>
										Upload file
									</PromptInputActionMenuItem>
									<PromptInputActionMenuItem onSelect={() => setIsAddMenuOpen(false)} elemBefore={<LinkIcon label="" />}>
										Add a link
									</PromptInputActionMenuItem>
									<PromptInputActionMenuItem onSelect={() => setIsAddMenuOpen(false)} elemBefore={<MentionIcon label="" />}>
										Mention someone
									</PromptInputActionMenuItem>
									<PromptInputActionMenuItem onSelect={() => setIsAddMenuOpen(false)} elemBefore={<AddIcon label="" />}>
										More formatting
									</PromptInputActionMenuItem>
									<PromptInputActionMenuItem onSelect={() => setIsAddMenuOpen(false)} elemBefore={<PageIcon label="" />}>
										Add current page as context
									</PromptInputActionMenuItem>
								</PromptInputActionMenuContent>
							</PromptInputActionMenu>

							<Popover open={isCustomizeMenuOpen} onOpenChange={setIsCustomizeMenuOpen}>
								<PopoverTrigger render={<PromptInputButton aria-label="Customize" size="icon-sm" variant="ghost" />}>
									<CustomizeIcon label="" />
								</PopoverTrigger>
								<PopoverContent side="top" align="start" sideOffset={8} className="w-auto p-2">
									<CustomizeMenu
										selectedReasoning={selectedReasoning}
										onReasoningChange={setSelectedReasoning}
										webResultsEnabled={webResultsEnabled}
										onWebResultsChange={setWebResultsEnabled}
										companyKnowledgeEnabled={companyKnowledgeEnabled}
										onCompanyKnowledgeChange={setCompanyKnowledgeEnabled}
										onClose={() => setIsCustomizeMenuOpen(false)}
									/>
								</PopoverContent>
							</Popover>
						</PromptInputTools>

						<div className="flex items-center gap-1">
							<SpeechInput aria-label="Voice" onTranscriptionChange={handleSpeechTranscription} size="icon" />
							<PromptInputSubmit aria-label="Submit" disabled={!hasInFlightTurn && !prompt.trim()} onStop={onStop} size="icon-sm" status={submitStatus}>
								<ArrowUpIcon label="" />
							</PromptInputSubmit>
						</div>
					</PromptInputFooter>
				</PromptInput>
			</div>

			<style>{textareaCSS}</style>

			{!hideUsesAI ? <Footer /> : null}
		</div>
	);
}
