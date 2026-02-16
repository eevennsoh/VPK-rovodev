"use client";

import { useState } from "react";
import type { QueuedPromptItem } from "@/app/contexts";
import {
	PromptInput,
	PromptInputActionMenu,
	PromptInputActionMenuContent,
	PromptInputActionMenuItem,
	PromptInputActionMenuTrigger,
	PromptInputBody,
	PromptInputFooter,
	PromptInputMicrophone,
	PromptInputSubmit,
	PromptInputTextarea,
	PromptInputTools,
} from "@/components/ui-ai/prompt-input";
import { Queue } from "@/components/ui-ai/queue";
import {
	composerUpwardShadow,
	composerPromptInputClassName,
	composerTextareaClassName,
	textareaCSS,
} from "@/components/blocks/shared-ui/composer-styles";
import { ChatPromptQueue } from "@/components/templates/shared/components/chat-prompt-queue";
import AddIcon from "@atlaskit/icon/core/add";
import ArrowUpIcon from "@atlaskit/icon/core/arrow-up";
import MicrophoneIcon from "@atlaskit/icon/core/microphone";
import LinkIcon from "@atlaskit/icon/core/link";
import MentionIcon from "@atlaskit/icon/core/mention";
import PageIcon from "@atlaskit/icon/core/page";
import UploadIcon from "@atlaskit/icon/core/upload";

interface AgentsTeamComposerProps {
	prompt: string;
	placeholder: string;
	isStreaming: boolean;
	queuedPrompts: ReadonlyArray<QueuedPromptItem>;
	onPromptChange: (value: string) => void;
	onSubmit: () => Promise<void> | void;
	onStop: () => void;
	onRemoveQueuedPrompt: (id: string) => void;
}

export default function AgentsTeamComposer({
	prompt,
	placeholder,
	isStreaming,
	queuedPrompts,
	onPromptChange,
	onSubmit,
	onStop,
	onRemoveQueuedPrompt,
}: Readonly<AgentsTeamComposerProps>) {
	const [isAddMenuOpen, setIsAddMenuOpen] = useState(false);
	const hasQueuedPrompts = queuedPrompts.length > 0;

	return (
		<div className="relative">
			{hasQueuedPrompts ? (
				<div className="pointer-events-none absolute bottom-full left-4 right-4 z-0">
					<Queue className="pointer-events-auto rounded-b-none border-border border-b-0 bg-surface-raised px-2 pt-2 pb-2 shadow-none">
						<ChatPromptQueue
							queuedPrompts={queuedPrompts}
							onRemoveQueuedPrompt={onRemoveQueuedPrompt}
						/>
					</Queue>
				</div>
			) : null}
			<div
				className="relative z-10 rounded-xl border border-border bg-surface px-4 pb-4 pt-4"
				style={{ boxShadow: composerUpwardShadow }}
			>
				<PromptInput
					onSubmit={onSubmit}
					className={`${composerPromptInputClassName} relative z-10`}
				>
					<PromptInputBody>
						<PromptInputTextarea
							value={prompt}
							onChange={(event) => onPromptChange(event.currentTarget.value)}
							placeholder={placeholder}
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
						</PromptInputTools>

						<div className="flex items-center gap-1">
							<PromptInputMicrophone>
								<MicrophoneIcon label="" />
							</PromptInputMicrophone>
							<PromptInputSubmit
								aria-label="Submit"
								disabled={!isStreaming && !prompt.trim()}
								onStop={onStop}
								size="icon-sm"
								status={isStreaming ? "streaming" : "ready"}
							>
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
