"use client";

import { useState } from "react";
import type { QueuedPromptItem } from "@/app/contexts";
import { useCreationModeState, useCreationModeActions } from "@/app/contexts/context-creation-mode";
import {
	PromptInput,
	PromptInputActionMenu,
	PromptInputActionMenuContent,
	PromptInputActionMenuItem,
	PromptInputActionMenuTrigger,
	PromptInputBody,
	PromptInputButton,
	PromptInputFooter,
	PromptInputHeader,
	PromptInputSubmit,
	PromptInputTextarea,
	PromptInputTools,
} from "@/components/ui-ai/prompt-input";
import { Queue, QueueItem, QueueItemActions, QueueItemContent, QueueItemIndicator, QueueList } from "@/components/ui-ai/queue";
import { SpeechInput } from "@/components/ui-ai/speech-input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { SkillTag } from "@/components/ui/skill-tag";
import CustomizeMenu from "@/components/blocks/shared-ui/customize-menu";
import SkillIcon from "@atlaskit/icon-lab/core/skill";
import { composerUpwardShadow, composerPromptInputClassName, composerTextareaClassName, textareaCSS } from "@/components/blocks/shared-ui/composer-styles";
import DeleteIcon from "@atlaskit/icon/core/delete";
import AddIcon from "@atlaskit/icon/core/add";
import ArrowUpIcon from "@atlaskit/icon/core/arrow-up";
import LinkIcon from "@atlaskit/icon/core/link";
import MentionIcon from "@atlaskit/icon/core/mention";
import PageIcon from "@atlaskit/icon/core/page";
import UploadIcon from "@atlaskit/icon/core/upload";
import AgentIcon from "@atlaskit/icon/core/ai-agent";
import CustomizeIcon from "@atlaskit/icon/core/customize";

interface MakerComposerProps {
	prompt: string;
	placeholder: string;
	isStreaming: boolean;
	isPlanMode: boolean;
	queuedPrompts: ReadonlyArray<QueuedPromptItem>;
	onPromptChange: (value: string) => void;
	onSubmit: () => Promise<void> | void;
	onStop: () => void;
	onPlanModeToggle: () => void;
	onRemoveQueuedPrompt: (id: string) => void;
	expandedPlaceholder?: boolean;
	autoFocus?: boolean;
}

export default function MakerComposer({
	prompt,
	placeholder,
	isStreaming,
	isPlanMode,
	queuedPrompts,
	onPromptChange,
	onSubmit,
	onStop,
	onPlanModeToggle,
	onRemoveQueuedPrompt,
	expandedPlaceholder = false,
	autoFocus = true,
}: Readonly<MakerComposerProps>) {
	const [isAddMenuOpen, setIsAddMenuOpen] = useState(false);
	const [isCustomizeMenuOpen, setIsCustomizeMenuOpen] = useState(false);
	const [selectedReasoning, setSelectedReasoning] = useState("standard");
	const [webResultsEnabled, setWebResultsEnabled] = useState(true);
	const [companyKnowledgeEnabled, setCompanyKnowledgeEnabled] = useState(true);
	const { mode: creationMode } = useCreationModeState();
	const { clearCreationMode } = useCreationModeActions();
	const hasQueuedPrompts = queuedPrompts.length > 0;
	const handleSpeechTranscription = (text: string) => {
		const trimmedTranscription = text.trim();
		if (!trimmedTranscription) {
			return;
		}

		const trimmedPrompt = prompt.trimEnd();
		onPromptChange(trimmedPrompt ? `${trimmedPrompt} ${trimmedTranscription}` : trimmedTranscription);
	};

	const creationModeLabel = creationMode === "skill" ? "skill-development" : creationMode === "agent" ? "agent-development" : null;
	const creationModeIcon = creationMode === "skill"
		? <SkillIcon label="" size="small" />
		: <AgentIcon label="" size="small" />;
	const creationModeColor = "default" as const;

	return (
		<div className="relative">
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
			<div className="relative z-10 rounded-xl border border-border bg-surface px-4 pb-4 pt-4" style={{ boxShadow: composerUpwardShadow }}>
				<PromptInput allowOverflow onSubmit={onSubmit} className={`${composerPromptInputClassName} relative z-10`}>
					{creationModeLabel ? (
						<PromptInputHeader className="px-0 pt-0">
							<SkillTag
								icon={creationModeIcon}
								color={creationModeColor}
								onRemove={clearCreationMode}
							>
								{creationModeLabel}
							</SkillTag>
						</PromptInputHeader>
					) : null}

					<PromptInputBody>
						<PromptInputTextarea
							value={prompt}
							onChange={(event) => onPromptChange(event.currentTarget.value)}
							placeholder={placeholder}
							aria-label="Chat message input"
							autoFocus={autoFocus}
							rows={expandedPlaceholder ? 2 : 1}
							className={`${composerTextareaClassName} transition-[min-height] duration-150 ease-out ${expandedPlaceholder ? "min-h-12" : ""}`}
						/>
					</PromptInputBody>

					<PromptInputFooter className="mt-3 justify-between px-0 pb-0">
						<PromptInputTools>
							<Button type="button" size="sm" variant="outline" aria-label="Plan mode" aria-pressed={isPlanMode} onClick={onPlanModeToggle}>
								Plan
							</Button>
							<PromptInputActionMenu open={isAddMenuOpen} onOpenChange={setIsAddMenuOpen}>
								<PromptInputActionMenuTrigger aria-label="Add" size="icon-sm" variant="ghost">
									<AddIcon label="" />
								</PromptInputActionMenuTrigger>
								<PromptInputActionMenuContent>
									<PromptInputActionMenuItem
										onSelect={() => setIsAddMenuOpen(false)}
										elemBefore={<UploadIcon label="" />}
									>
										Upload file
									</PromptInputActionMenuItem>
									<PromptInputActionMenuItem
										onSelect={() => setIsAddMenuOpen(false)}
										elemBefore={<LinkIcon label="" />}
									>
										Add a link
									</PromptInputActionMenuItem>
									<PromptInputActionMenuItem
										onSelect={() => setIsAddMenuOpen(false)}
										elemBefore={<MentionIcon label="" />}
									>
										Mention someone
									</PromptInputActionMenuItem>
									<PromptInputActionMenuItem
										onSelect={() => setIsAddMenuOpen(false)}
										elemBefore={<AddIcon label="" />}
									>
										More formatting
									</PromptInputActionMenuItem>
									<PromptInputActionMenuItem
										onSelect={() => setIsAddMenuOpen(false)}
										elemBefore={<PageIcon label="" />}
									>
										Add current page as context
									</PromptInputActionMenuItem>
								</PromptInputActionMenuContent>
							</PromptInputActionMenu>
							<Popover open={isCustomizeMenuOpen} onOpenChange={setIsCustomizeMenuOpen}>
								<PopoverTrigger
									render={
										<PromptInputButton
											aria-label="Configure"
											size="icon-sm"
											variant="ghost"
										/>
									}
								>
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
							<PromptInputSubmit aria-label="Submit" disabled={!isStreaming && !prompt.trim()} onStop={onStop} size="icon-sm" status={isStreaming ? "streaming" : "ready"}>
								<ArrowUpIcon label="" />
							</PromptInputSubmit>
						</div>
					</PromptInputFooter>
				</PromptInput>
			</div>

			<style>{textareaCSS}</style>
		</div>
	);
}
