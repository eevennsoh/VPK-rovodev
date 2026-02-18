"use client";

import { useState } from "react";
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
	PromptInputHeader,
	PromptInputMicrophone,
	PromptInputSubmit,
	PromptInputTextarea,
	PromptInputTools,
} from "@/components/ui-ai/prompt-input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { composerUpwardShadow, composerPromptInputClassName, composerTextareaClassName, textareaCSS } from "@/components/blocks/shared-ui/composer-styles";
import { QueueItem, QueueItemActions, QueueItemContent, QueueItemIndicator, QueueList } from "@/components/ui-ai/queue";
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

interface ChatComposerProps {
	prompt: string;
	isStreaming: boolean;
	queuedPrompts: ReadonlyArray<QueuedPromptItem>;
	onPromptChange: (value: string) => void;
	onSubmit: () => void;
	onStop: () => void;
	onRemoveQueuedPrompt: (id: string) => void;
}

export default function ChatComposer({ prompt, isStreaming, queuedPrompts, onPromptChange, onSubmit, onStop, onRemoveQueuedPrompt }: Readonly<ChatComposerProps>): React.ReactElement {
	const [selectedReasoning, setSelectedReasoning] = useState("deep-research");
	const [webResultsEnabled, setWebResultsEnabled] = useState(false);
	const [companyKnowledgeEnabled, setCompanyKnowledgeEnabled] = useState(true);
	const [isAddMenuOpen, setIsAddMenuOpen] = useState(false);
	const [isCustomizeMenuOpen, setIsCustomizeMenuOpen] = useState(false);

	return (
		<div className="px-1">
			<div className="rounded-xl border border-border bg-surface px-4 pb-3 pt-4" style={{ boxShadow: composerUpwardShadow }}>
				<PromptInput onSubmit={onSubmit} className={`${composerPromptInputClassName} relative z-10`}>
					{queuedPrompts.length > 0 ? (
						<PromptInputHeader className="px-0 pb-2 pt-0">
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
						</PromptInputHeader>
					) : null}
					<PromptInputBody>
						<PromptInputTextarea
							value={prompt}
							onChange={(event) => onPromptChange(event.currentTarget.value)}
							placeholder="Ask, @mention, or / for skills"
							aria-label="Chat message input"
							rows={1}
							className={composerTextareaClassName}
						/>
					</PromptInputBody>

					<PromptInputFooter className="mt-3 justify-between px-0 pb-0">
						<PromptInputTools>
							<PromptInputActionMenu open={isAddMenuOpen} onOpenChange={setIsAddMenuOpen}>
								<PromptInputActionMenuTrigger aria-label="Add" size="icon-sm" variant="ghost">
									<AddIcon label="" />
								</PromptInputActionMenuTrigger>
								<PromptInputActionMenuContent className="w-auto min-w-[200px] p-1">
									<PromptInputActionMenuItem onSelect={() => setIsAddMenuOpen(false)}>
										<UploadIcon label="Upload file" />
										<span>Upload file</span>
									</PromptInputActionMenuItem>
									<PromptInputActionMenuItem onSelect={() => setIsAddMenuOpen(false)}>
										<LinkIcon label="Add link" />
										<span>Add a link</span>
									</PromptInputActionMenuItem>
									<PromptInputActionMenuItem onSelect={() => setIsAddMenuOpen(false)}>
										<MentionIcon label="Mention someone" />
										<span>Mention someone</span>
									</PromptInputActionMenuItem>
									<PromptInputActionMenuItem onSelect={() => setIsAddMenuOpen(false)}>
										<AddIcon label="More formatting" />
										<span>More formatting</span>
									</PromptInputActionMenuItem>
									<PromptInputActionMenuItem onSelect={() => setIsAddMenuOpen(false)}>
										<PageIcon label="Add current page as context" />
										<span>Add current page as context</span>
									</PromptInputActionMenuItem>
								</PromptInputActionMenuContent>
							</PromptInputActionMenu>

							<Popover open={isCustomizeMenuOpen} onOpenChange={setIsCustomizeMenuOpen}>
								<PopoverTrigger render={<PromptInputButton aria-label="Customize" size="icon-sm" variant="ghost" />}>
									<CustomizeIcon label="" />
								</PopoverTrigger>
								<PopoverContent side="top" align="start" sideOffset={8} className="w-[330px] p-2">
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

						<div className="flex items-center gap-0.5">
							<PromptInputMicrophone />
							<PromptInputSubmit aria-label="Submit" disabled={!isStreaming && !prompt.trim()} onStop={onStop} size="icon-sm" status={isStreaming ? "streaming" : "ready"}>
								<ArrowUpIcon label="" />
							</PromptInputSubmit>
						</div>
					</PromptInputFooter>
				</PromptInput>

				<style>{textareaCSS}</style>
			</div>

			<Footer />
		</div>
	);
}
