"use client";

import { useState } from "react";
import PromptGallery from "@/components/blocks/prompt-gallery/page";
import {
	PromptInput,
	PromptInputBody,
	PromptInputDisclaimer,
	PromptInputFooter,
	PromptInputSubmit,
	PromptInputTextarea,
} from "@/components/ui-ai/prompt-input";
import {
	composerPromptInputClassName,
	composerTextareaClassName,
	textareaCSS,
} from "@/components/blocks/shared-ui/composer-styles";
import { token } from "@/lib/tokens";
import ArrowUpIcon from "@atlaskit/icon/core/arrow-up";
import InformationCircleIcon from "@atlaskit/icon/core/information-circle";

const DEFAULT_PLACEHOLDER = "Write a prompt, @someone, or use / for actions";

export default function PromptGalleryDemo() {
	const [prompt, setPrompt] = useState("");
	const [previewPrompt, setPreviewPrompt] = useState<string | null>(null);

	return (
		<div className="flex w-full flex-col items-center px-4 py-10">
			<div className="flex w-full max-w-[800px] flex-col items-center gap-3">
				<div className="w-full px-1">
					<div
						className="rounded-xl border border-border bg-surface px-4 pb-3 pt-4 shadow-[0px_-2px_50px_8px_rgba(30,31,33,0.08)]"
					>
						<PromptInput
							onSubmit={() => {
								setPrompt("");
							}}
							className={composerPromptInputClassName}
						>
							<PromptInputBody>
								<PromptInputTextarea
									value={prompt}
									onChange={(event) => setPrompt(event.currentTarget.value)}
									placeholder={previewPrompt ?? DEFAULT_PLACEHOLDER}
									aria-label="Prompt input"
									rows={1}
									className={composerTextareaClassName}
								/>
							</PromptInputBody>
							<PromptInputFooter className="mt-3 justify-end px-0 pb-0">
								<PromptInputSubmit aria-label="Submit" disabled={!prompt.trim()} size="icon-sm">
									<ArrowUpIcon label="" />
								</PromptInputSubmit>
							</PromptInputFooter>
						</PromptInput>
						<style>{textareaCSS}</style>
					</div>
				</div>

				<div className="w-full">
					<PromptGallery
						onSelect={(selectedPrompt) => setPrompt(selectedPrompt)}
						onPreviewStart={setPreviewPrompt}
						onPreviewEnd={() => setPreviewPrompt(null)}
					/>
				</div>

				<PromptInputDisclaimer>
					<InformationCircleIcon label="Information" color={token("color.icon.subtlest")} size="small" />
					<span>Uses AI. Verify results.</span>
				</PromptInputDisclaimer>
			</div>
		</div>
	);
}
