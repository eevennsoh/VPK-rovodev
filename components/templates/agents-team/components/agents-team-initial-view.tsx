"use client";

import { useState } from "react";
import type { QueuedPromptItem } from "@/app/contexts";
import Image from "next/image";
import PromptGallery from "@/components/blocks/prompt-gallery/page";
import { token } from "@/lib/tokens";
import { useTheme } from "@/components/utils/theme-wrapper";
import FooterDisclaimer from "@/components/blocks/shared-ui/footer-disclaimer";
import AgentsTeamComposer from "./agents-team-composer";

const DEFAULT_AGENTS_TEAM_PLACEHOLDER = "Let a team of AI minions solve your problem";

interface AgentsTeamInitialViewProps {
	prompt: string;
	isStreaming: boolean;
	queuedPrompts: ReadonlyArray<QueuedPromptItem>;
	onPromptChange: (value: string) => void;
	onSubmit: () => Promise<void> | void;
	onStop: () => void;
	onRemoveQueuedPrompt: (id: string) => void;
}

export default function AgentsTeamInitialView({
	prompt,
	isStreaming,
	queuedPrompts,
	onPromptChange,
	onSubmit,
	onStop,
	onRemoveQueuedPrompt,
}: Readonly<AgentsTeamInitialViewProps>) {
	const [previewPrompt, setPreviewPrompt] = useState<string | null>(null);
	const { actualTheme } = useTheme();
	const illustrationSrc = actualTheme === "dark"
		? "/illustration-ai/write/dark.svg"
		: "/illustration-ai/write/light.svg";

	return (
		<div className="relative flex flex-1 flex-col items-center justify-center px-4">
			<div className="flex w-full max-w-[800px] flex-col items-center gap-2">
				<div className="flex flex-col items-center gap-6 px-4 py-6">
					<Image
						src={illustrationSrc}
						alt="Rovo AI"
						width={80}
						height={80}
					/>

					<h2 style={{ font: token("font.heading.xxlarge") }} className="text-text text-center">Yo, tell me your problem</h2>
				</div>

				<div className="w-full px-1">
					<AgentsTeamComposer
						prompt={prompt}
						placeholder={previewPrompt ?? DEFAULT_AGENTS_TEAM_PLACEHOLDER}
						isStreaming={isStreaming}
						queuedPrompts={queuedPrompts}
						onPromptChange={onPromptChange}
						onSubmit={onSubmit}
						onStop={onStop}
						onRemoveQueuedPrompt={onRemoveQueuedPrompt}
					/>
					<FooterDisclaimer />
				</div>

				<div className="mt-3 w-full">
					<PromptGallery
						onSelect={(selectedPrompt) => onPromptChange(selectedPrompt)}
						onPreviewStart={setPreviewPrompt}
						onPreviewEnd={() => setPreviewPrompt(null)}
					/>
				</div>
			</div>
		</div>
	);
}
