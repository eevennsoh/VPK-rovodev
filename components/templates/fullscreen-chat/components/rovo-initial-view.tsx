"use client";

import { useState } from "react";
import type { QueuedPromptItem } from "@/app/contexts";
import { token } from "@/lib/tokens";
import Image from "next/image";
import Heading from "@/components/blocks/shared-ui/heading";
import PromptGallery from "@/components/blocks/prompt-gallery/page";
import { DEFAULT_PROMPT_GALLERY_SUGGESTIONS } from "@/components/blocks/prompt-gallery/data/suggestions";
import { Footer } from "@/components/ui/footer";
import RovoChatInput from "./rovo-chat-input";

const HOME_SUGGESTIONS = DEFAULT_PROMPT_GALLERY_SUGGESTIONS.slice(0, 3);

const DEFAULT_ROVO_PLACEHOLDER = "Ask, @mention, or / for skills";

interface RovoInitialViewProps {
	userName: string | null;
	prompt: string;
	isStreaming: boolean;
	hasInFlightTurn: boolean;
	onPromptChange: (value: string) => void;
	onSubmit: () => void;
	onStop: () => void;
	contextEnabled: boolean;
	onContextToggle: (enabled: boolean) => void;
	queuedPrompts: ReadonlyArray<QueuedPromptItem>;
	onRemoveQueuedPrompt: (id: string) => void;
}

export default function RovoInitialView({
	userName,
	prompt,
	isStreaming,
	hasInFlightTurn,
	onPromptChange,
	onSubmit,
	onStop,
	contextEnabled,
	onContextToggle,
	queuedPrompts,
	onRemoveQueuedPrompt,
}: Readonly<RovoInitialViewProps>) {
	const [previewPrompt, setPreviewPrompt] = useState<string | null>(null);
	const [galleryExpanded, setGalleryExpanded] = useState(false);

	return (
		<>
			<div style={{ width: "800px", maxWidth: "100%", display: "flex", flexDirection: "column", alignItems: "center", gap: token("space.100") }}>
				<div>
					<Image src="/illustration-ai/chat/light.svg" alt="Rovo Chat" width={74} height={67} />
				</div>

				<div style={{ marginBottom: token("space.400") }}>
					<Heading size="xlarge">
						{userName ? `How can I help, ${userName}?` : "How can I help?"}
					</Heading>
				</div>

				<div style={{ width: "100%", padding: `0 ${token("space.200")}` }}>
					<RovoChatInput
						prompt={prompt}
						isStreaming={isStreaming}
						hasInFlightTurn={hasInFlightTurn}
						onPromptChange={onPromptChange}
						onSubmit={onSubmit}
						onStop={onStop}
						contextEnabled={contextEnabled}
						onContextToggle={onContextToggle}
						product="rovo"
						queuedPrompts={queuedPrompts}
						onRemoveQueuedPrompt={onRemoveQueuedPrompt}
						customHeight={galleryExpanded || previewPrompt ? "130px" : "106px"}
						hideUsesAI={true}
						placeholder={previewPrompt ?? DEFAULT_ROVO_PLACEHOLDER}
					/>
				</div>

				<div
					style={{
						width: "100%",
						padding: `0 ${token("space.300")}`,
						marginTop: token("space.300"),
					}}
				>
					<PromptGallery
						items={HOME_SUGGESTIONS}
						onSelect={(selectedPrompt) => onPromptChange(selectedPrompt)}
						onPreviewStart={setPreviewPrompt}
						onPreviewEnd={() => setPreviewPrompt(null)}
						onExpandChange={setGalleryExpanded}
					/>
				</div>
			</div>

			<div className="absolute inset-x-0 bottom-0 z-10 flex justify-center">
				<Footer />
			</div>
		</>
	);
}
