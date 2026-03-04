"use client";

import { useCallback, useRef, useState } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { token } from "@/lib/tokens";
import { useTheme } from "@/components/utils/theme-wrapper";
import { Footer } from "@/components/ui/footer";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import DiscoveryGallery from "@/components/blocks/discovery-gallery/page";
import {
	PromptInput,
	PromptInputBody,
	PromptInputFooter,
	PromptInputTextarea,
	PromptInputTools,
	PromptInputSubmit,
} from "@/components/ui-ai/prompt-input";
import { SpeechInput } from "@/components/ui-ai/speech-input";
import {
	composerUpwardShadow,
	composerPromptInputClassName,
	composerTextareaClassName,
	textareaCSS,
} from "@/components/blocks/shared-ui/composer-styles";
import ArrowUpIcon from "@atlaskit/icon/core/arrow-up";
import ChevronDownIcon from "@atlaskit/icon/core/chevron-down";

const ITERATION_OPTIONS = [
	{ value: "1", label: "1x" },
	{ value: "2", label: "2x" },
	{ value: "3", label: "3x" },
	{ value: "4", label: "4x" },
] as const;

export default function MakeGallery() {
	const [prompt, setPrompt] = useState("");
	const [isPlanMode, setIsPlanMode] = useState(false);
	const [isIterationsOpen, setIsIterationsOpen] = useState(false);
	const [selectedIterations, setSelectedIterations] = useState("1");
	const [previewPrompt, setPreviewPrompt] = useState<string | null>(null);
	const composerContainerRef = useRef<HTMLDivElement>(null);
	const { actualTheme } = useTheme();

	const illustrationSrc = actualTheme === "dark"
		? "/illustration-ai/chat/dark.svg"
		: "/illustration-ai/chat/light.svg";

	const handlePromptGallerySelect = useCallback(
		(selectedPrompt: string) => {
			setPrompt(selectedPrompt);
			composerContainerRef.current?.scrollIntoView({
				behavior: "smooth",
				block: "start",
			});
			requestAnimationFrame(() => {
				const textarea = composerContainerRef.current?.querySelector<HTMLTextAreaElement>(
					'textarea[aria-label="Chat message input"]',
				);
				if (!textarea) return;
				textarea.focus();
				const cursorPosition = textarea.value.length;
				textarea.setSelectionRange(cursorPosition, cursorPosition);
			});
		},
		[],
	);

	const handleSpeechTranscription = (text: string) => {
		const trimmed = text.trim();
		if (!trimmed) return;
		const current = prompt.trimEnd();
		setPrompt(current ? `${current} ${trimmed}` : trimmed);
	};

	const handleSubmit = () => {
		setPrompt("");
	};

	return (
		<div
			className={cn(
				"relative flex h-full min-h-0 flex-1 flex-col items-center overflow-y-auto px-4 pb-8",
				"pt-8",
			)}
		>
			<div className="my-auto flex w-full max-w-[1440px] flex-col items-center gap-2">
				<div className="flex flex-col items-center gap-6 px-4 py-6">
					<Image
						src={illustrationSrc}
						alt="Chat illustration"
						width={74}
						height={67}
					/>
					<h2
						style={{ font: token("font.heading.xxlarge") }}
						className="text-center text-text"
					>
						How can I help?
					</h2>
				</div>

				<div ref={composerContainerRef} className="w-full max-w-[800px]">
					<div className="relative z-10 rounded-xl border border-border bg-surface px-4 pb-4 pt-4" style={{ boxShadow: composerUpwardShadow }}>
						<PromptInput allowOverflow onSubmit={handleSubmit} className={`${composerPromptInputClassName} relative z-10`}>
							<PromptInputBody>
								<PromptInputTextarea
									value={prompt}
									onChange={(event) => setPrompt(event.currentTarget.value)}
									placeholder={previewPrompt ?? "Ask anything, or describe what you want to build"}
									aria-label="Chat message input"
									autoFocus
									rows={1}
									className={`${composerTextareaClassName} transition-[min-height] duration-150 ease-out`}
								/>
							</PromptInputBody>

							<PromptInputFooter className="mt-3 justify-between px-0 pb-0">
								<PromptInputTools>
									<Button
										type="button"
										size="sm"
										variant="outline"
										aria-label="Plan mode"
										aria-pressed={isPlanMode}
										onClick={() => setIsPlanMode((prev) => !prev)}
									>
										Plan
									</Button>
									<Popover open={isIterationsOpen} onOpenChange={setIsIterationsOpen}>
										<PopoverTrigger
											render={
												<Button
													type="button"
													size="sm"
													variant="outline"
													className="gap-1"
													aria-label={`Iterations: ${selectedIterations}x`}
												/>
											}
										>
											<ChevronDownIcon label="" size="small" />
											{selectedIterations}x
										</PopoverTrigger>
										<PopoverContent side="top" align="start" sideOffset={8} className="w-auto p-1">
											<div className="flex flex-col" role="menu" aria-label="Iteration count">
												{ITERATION_OPTIONS.map((option) => (
													<button
														key={option.value}
														type="button"
														role="menuitem"
														aria-current={selectedIterations === option.value ? "true" : undefined}
														className={cn(
															"rounded-md px-3 py-1.5 text-left text-sm transition-colors hover:bg-bg-neutral",
															selectedIterations === option.value ? "bg-bg-selected text-text-selected" : "text-text",
														)}
														onClick={() => {
															setSelectedIterations(option.value);
															setIsIterationsOpen(false);
														}}
													>
														{option.label}
													</button>
												))}
											</div>
										</PopoverContent>
									</Popover>
								</PromptInputTools>

								<div className="flex items-center gap-1">
									<SpeechInput aria-label="Voice" onTranscriptionChange={handleSpeechTranscription} size="icon" />
									<PromptInputSubmit aria-label="Submit" disabled={!prompt.trim()} size="icon-sm" status="ready">
										<ArrowUpIcon label="" />
									</PromptInputSubmit>
								</div>
							</PromptInputFooter>
						</PromptInput>
					</div>

					<style>{textareaCSS}</style>
				</div>

				<div className="mt-8 md:mt-12 w-full max-w-[800px]">
					<DiscoveryGallery
						onSelect={handlePromptGallerySelect}
						onPreviewStart={setPreviewPrompt}
						onPreviewEnd={() => setPreviewPrompt(null)}
					/>
				</div>
			</div>

			<div className="mt-auto flex w-full shrink-0 justify-center pt-8">
				<Footer />
			</div>
		</div>
	);
}
