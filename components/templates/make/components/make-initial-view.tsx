"use client";

import { useCallback, useRef, useState } from "react";
import Image from "next/image";
import DiscoveryGallery from "@/components/blocks/discovery-gallery/page";
import { Footer } from "@/components/ui/footer";
import { token } from "@/lib/tokens";
import { useTheme } from "@/components/utils/theme-wrapper";
import { getPlanModeCopy } from "@/components/templates/make/lib/make-copy";
import {
	useMakeState,
	useMakeActions,
} from "@/app/contexts/context-make";
import MakeComposer from "./make-composer";

export default function MakeInitialView() {
	const {
		prompt,
		isStreaming,
		isSubmitPending,
		queuedPrompts,
	} = useMakeState();

	const {
		setPrompt,
		handleSubmit,
		stopStreaming,
		removeQueuedPrompt,
	} = useMakeActions();

	const [previewPrompt, setPreviewPrompt] = useState<string | null>(null);
	const composerContainerRef = useRef<HTMLDivElement>(null);
	const { actualTheme } = useTheme();
	const modeCopy = getPlanModeCopy();
	const illustrationSrc =
		actualTheme === "dark"
			? modeCopy.illustration.dark
			: modeCopy.illustration.light;

	const handlePromptGallerySelect = useCallback(
		(selectedPrompt: string) => {
			setPrompt(selectedPrompt);
			composerContainerRef.current?.scrollIntoView({
				behavior: "smooth",
				block: "start",
			});
			requestAnimationFrame(() => {
				const textarea =
					composerContainerRef.current?.querySelector<HTMLTextAreaElement>(
						'textarea[aria-label="Chat message input"]',
					);
				if (!textarea) return;
				textarea.focus();
				const cursorPosition = textarea.value.length;
				textarea.setSelectionRange(cursorPosition, cursorPosition);
			});
		},
		[setPrompt],
	);

	const isRequestInFlight = isStreaming || isSubmitPending;

	return (
		<div className="flex h-full min-h-0 flex-1 flex-col items-center overflow-y-auto px-4 pt-8">
			<div className="my-auto flex w-full max-w-[1440px] flex-col items-center gap-2">
				<div className="flex flex-col items-center gap-6 px-4 py-6">
					<Image
						src={illustrationSrc}
						alt={modeCopy.illustrationAlt}
						width={80}
						height={80}
					/>

					<h2
						style={{ font: token("font.heading.xxlarge") }}
						className="text-text text-center"
					>
						{modeCopy.heading}
					</h2>
				</div>

				<div ref={composerContainerRef} className="w-full max-w-[800px] px-1">
					<MakeComposer
						prompt={prompt}
						placeholder={previewPrompt ?? modeCopy.placeholder}
						isStreaming={isRequestInFlight}
						queuedPrompts={queuedPrompts}
						onPromptChange={setPrompt}
						onSubmit={handleSubmit}
						onStop={stopStreaming}
						onRemoveQueuedPrompt={removeQueuedPrompt}
					/>
				</div>

				<div className="mt-4 w-full max-w-[800px] px-1">
					<DiscoveryGallery
						onSelect={handlePromptGallerySelect}
						onPreviewStart={setPreviewPrompt}
						onPreviewEnd={() => setPreviewPrompt(null)}
					/>
				</div>
			</div>

			<Footer className="mt-6" />
		</div>
	);
}
