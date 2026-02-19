"use client";

import { useCallback, useRef, useState } from "react";
import type { QueuedPromptItem } from "@/app/contexts";
import Image from "next/image";
import PromptGallery from "@/components/blocks/prompt-gallery/page";
import { Footer } from "@/components/ui/footer";
import { token } from "@/lib/tokens";
import { useTheme } from "@/components/utils/theme-wrapper";
import { getPlanModeCopy } from "@/components/templates/agents-team/lib/agent-team-copy";
import AgentsTeamComposer from "./agents-team-composer";

interface AgentsTeamInitialViewProps {
	prompt: string;
	isStreaming: boolean;
	isPlanMode: boolean;
	queuedPrompts: ReadonlyArray<QueuedPromptItem>;
	onPromptChange: (value: string) => void;
	onSubmit: () => Promise<void> | void;
	onStop: () => void;
	onPlanModeToggle: () => void;
	onRemoveQueuedPrompt: (id: string) => void;
}

export default function AgentsTeamInitialView({
	prompt,
	isStreaming,
	isPlanMode,
	queuedPrompts,
	onPromptChange,
	onSubmit,
	onStop,
	onPlanModeToggle,
	onRemoveQueuedPrompt,
}: Readonly<AgentsTeamInitialViewProps>) {
	const [previewPrompt, setPreviewPrompt] = useState<string | null>(null);
	const [galleryExpanded, setGalleryExpanded] = useState(false);
	const composerContainerRef = useRef<HTMLDivElement>(null);
	const { actualTheme } = useTheme();
	const modeCopy = getPlanModeCopy(isPlanMode);
	const illustrationSrc = actualTheme === "dark"
		? modeCopy.illustration.dark
		: modeCopy.illustration.light;
	const handlePromptGallerySelect = useCallback((selectedPrompt: string) => {
		onPromptChange(selectedPrompt);
		composerContainerRef.current?.scrollIntoView({
			behavior: "smooth",
			block: "start",
		});
		requestAnimationFrame(() => {
			const textarea = composerContainerRef.current?.querySelector<HTMLTextAreaElement>(
				'textarea[aria-label="Chat message input"]'
			);
			if (!textarea) {
				return;
			}
			textarea.focus();
			const cursorPosition = textarea.value.length;
			textarea.setSelectionRange(cursorPosition, cursorPosition);
		});
	}, [onPromptChange]);

	return (
		<div className={`relative flex h-full min-h-0 flex-1 flex-col items-center px-4 pb-8 ${galleryExpanded ? "justify-start pt-16" : "justify-center"}`}>
			<div className="flex w-full max-w-[800px] flex-col items-center gap-2">
				<div className="flex flex-col items-center gap-6 px-4 py-6">
					<Image
						src={illustrationSrc}
						alt={modeCopy.illustrationAlt}
						width={80}
						height={80}
					/>

					<h2 style={{ font: token("font.heading.xxlarge") }} className="text-text text-center">{modeCopy.heading}</h2>
				</div>

				<div ref={composerContainerRef} className="w-full px-1">
					<AgentsTeamComposer
						prompt={prompt}
						placeholder={previewPrompt ?? modeCopy.placeholder}
						isStreaming={isStreaming}
						isPlanMode={isPlanMode}
						onPlanModeToggle={onPlanModeToggle}
						queuedPrompts={queuedPrompts}
						onPromptChange={onPromptChange}
						onSubmit={onSubmit}
						onStop={onStop}
						onRemoveQueuedPrompt={onRemoveQueuedPrompt}
						expandedPlaceholder={galleryExpanded || !!previewPrompt}
					/>
				</div>

				<div className="mt-3 w-full">
					<PromptGallery
						onSelect={handlePromptGallerySelect}
						onPreviewStart={setPreviewPrompt}
						onPreviewEnd={() => setPreviewPrompt(null)}
						onExpandChange={setGalleryExpanded}
					/>
				</div>
			</div>

			<div className="absolute inset-x-0 bottom-0 z-10 flex justify-center">
				<Footer />
			</div>
		</div>
	);
}
