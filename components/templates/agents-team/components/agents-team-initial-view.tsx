"use client";

import { useState } from "react";
import type { QueuedPromptItem } from "@/app/contexts";
import Image from "next/image";
import PromptGallery from "@/components/blocks/prompt-gallery/page";
import { token } from "@/lib/tokens";
import { Footer } from "@/components/ui/footer";
import { useTheme } from "@/components/utils/theme-wrapper";
import { getAgentTeamModeCopy } from "@/components/templates/agents-team/lib/agent-team-copy";
import AgentsTeamComposer from "./agents-team-composer";

interface AgentsTeamInitialViewProps {
	prompt: string;
	isStreaming: boolean;
	isAgentTeamMode: boolean;
	queuedPrompts: ReadonlyArray<QueuedPromptItem>;
	onPromptChange: (value: string) => void;
	onSubmit: () => Promise<void> | void;
	onStop: () => void;
	onAgentTeamModeToggle: () => void;
	onRemoveQueuedPrompt: (id: string) => void;
}

export default function AgentsTeamInitialView({
	prompt,
	isStreaming,
	isAgentTeamMode,
	queuedPrompts,
	onPromptChange,
	onSubmit,
	onStop,
	onAgentTeamModeToggle,
	onRemoveQueuedPrompt,
}: Readonly<AgentsTeamInitialViewProps>) {
	const [previewPrompt, setPreviewPrompt] = useState<string | null>(null);
	const [galleryExpanded, setGalleryExpanded] = useState(false);
	const { actualTheme } = useTheme();
	const modeCopy = getAgentTeamModeCopy(isAgentTeamMode);
	const illustrationSrc = actualTheme === "dark"
		? modeCopy.illustration.dark
		: modeCopy.illustration.light;

	return (
		<div className={`relative flex flex-1 flex-col items-center px-4 ${galleryExpanded ? "justify-start pt-16" : "justify-center"}`}>
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

				<div className="w-full px-1">
					<AgentsTeamComposer
						prompt={prompt}
						placeholder={previewPrompt ?? modeCopy.placeholder}
						isStreaming={isStreaming}
						isAgentTeamMode={isAgentTeamMode}
						onAgentTeamModeToggle={onAgentTeamModeToggle}
						queuedPrompts={queuedPrompts}
						onPromptChange={onPromptChange}
						onSubmit={onSubmit}
						onStop={onStop}
						onRemoveQueuedPrompt={onRemoveQueuedPrompt}
						expandedPlaceholder={galleryExpanded || !!previewPrompt}
					/>
					<Footer />
				</div>

				<div className="mt-3 w-full">
					<PromptGallery
						onSelect={(selectedPrompt) => onPromptChange(selectedPrompt)}
						onPreviewStart={setPreviewPrompt}
						onPreviewEnd={() => setPreviewPrompt(null)}
						onExpandChange={setGalleryExpanded}
					/>
				</div>
			</div>
		</div>
	);
}
