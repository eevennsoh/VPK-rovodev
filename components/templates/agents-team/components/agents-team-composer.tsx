"use client";

import { useState } from "react";
import {
	PromptInput,
	PromptInputActionMenu,
	PromptInputActionMenuContent,
	PromptInputActionMenuItem,
	PromptInputActionMenuTrigger,
	PromptInputBody,
	PromptInputFooter,
	PromptInputMicrophone,
	PromptInputTextarea,
	PromptInputTools,
} from "@/components/ui-ai/prompt-input";
import {
	composerUpwardShadow,
	composerPromptInputClassName,
	composerTextareaClassName,
	textareaCSS,
} from "@/components/blocks/shared-ui/composer-styles";
import AddIcon from "@atlaskit/icon/core/add";
import MicrophoneIcon from "@atlaskit/icon/core/microphone";
import { Button } from "@/components/ui/button";
import LinkIcon from "@atlaskit/icon/core/link";
import MentionIcon from "@atlaskit/icon/core/mention";
import PageIcon from "@atlaskit/icon/core/page";
import UploadIcon from "@atlaskit/icon/core/upload";

interface AgentsTeamComposerProps {
	prompt: string;
	placeholder: string;
	onPromptChange: (value: string) => void;
	onSubmit: () => Promise<void> | void;
}

export default function AgentsTeamComposer({
	prompt,
	placeholder,
	onPromptChange,
	onSubmit,
}: Readonly<AgentsTeamComposerProps>) {
	const [isAddMenuOpen, setIsAddMenuOpen] = useState(false);

	return (
		<div
			className="rounded-xl border border-border bg-surface px-4 pb-4 pt-4"
			style={{ boxShadow: composerUpwardShadow }}
		>
			<PromptInput onSubmit={onSubmit} className={composerPromptInputClassName}>
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
						<Button
							type="submit"
							variant="warning"
							size="default"
							disabled={!prompt.trim()}
						>
							Yolo
						</Button>
					</div>
				</PromptInputFooter>
			</PromptInput>

			<style>{textareaCSS}</style>
		</div>
	);
}
