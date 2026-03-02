"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
const BASE_COMPOSER_HEIGHT = 106;
const EXPANDED_GALLERY_COMPOSER_HEIGHT = 130;
const COMPOSER_CHROME_HEIGHT = 82;

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
	const [previewPromptHeight, setPreviewPromptHeight] = useState(0);
	const previewMeasureRef = useRef<HTMLTextAreaElement | null>(null);
	const textareaElementRef = useRef<HTMLTextAreaElement | null>(null);
	const isPreviewPlaceholderActive = !!previewPrompt && prompt.trim().length === 0;

	const measurePreviewPromptHeight = useCallback((previewText: string | null) => {
		const textareaElement = textareaElementRef.current;
		const previewMeasureElement = previewMeasureRef.current;
		if (!previewText || !textareaElement || !previewMeasureElement || prompt.trim().length > 0) {
			setPreviewPromptHeight(0);
			return;
		}

		const nextTextareaWidth = textareaElement.clientWidth;
		const computedStyle = window.getComputedStyle(textareaElement);
		previewMeasureElement.style.width = `${nextTextareaWidth}px`;
		previewMeasureElement.style.font = computedStyle.font;
		previewMeasureElement.style.fontSize = computedStyle.fontSize;
		previewMeasureElement.style.fontWeight = computedStyle.fontWeight;
		previewMeasureElement.style.letterSpacing = computedStyle.letterSpacing;
		previewMeasureElement.style.lineHeight = computedStyle.lineHeight;
		previewMeasureElement.style.padding = "0";
		previewMeasureElement.style.border = "0";
		previewMeasureElement.value = previewText;
		setPreviewPromptHeight(previewMeasureElement.scrollHeight);
	}, [prompt]);

	useEffect(() => {
		const textareaElement = textareaElementRef.current;
		if (!textareaElement) {
			return;
		}

		const resizeObserver = new ResizeObserver(() => {
			if (!previewPrompt) {
				return;
			}
			measurePreviewPromptHeight(previewPrompt);
		});
		resizeObserver.observe(textareaElement);

		return () => {
			resizeObserver.disconnect();
		};
	}, [measurePreviewPromptHeight, previewPrompt]);

	const handlePreviewStart = useCallback((previewText: string) => {
		setPreviewPrompt(previewText);
		measurePreviewPromptHeight(previewText);
	}, [measurePreviewPromptHeight]);

	const handlePreviewEnd = useCallback(() => {
		setPreviewPrompt(null);
		setPreviewPromptHeight(0);
	}, []);

	const handlePromptChange = useCallback((value: string) => {
		onPromptChange(value);
		if (value.trim().length > 0) {
			setPreviewPromptHeight(0);
			return;
		}
		if (previewPrompt) {
			measurePreviewPromptHeight(previewPrompt);
		}
	}, [measurePreviewPromptHeight, onPromptChange, previewPrompt]);

	const handleTextareaReady = useCallback((textareaElement: HTMLTextAreaElement | null) => {
		textareaElementRef.current = textareaElement;
		if (textareaElement) {
			measurePreviewPromptHeight(previewPrompt);
		}
	}, [measurePreviewPromptHeight, previewPrompt]);

	const customHeight = useMemo(() => {
		const baseHeight = galleryExpanded
			? EXPANDED_GALLERY_COMPOSER_HEIGHT
			: BASE_COMPOSER_HEIGHT;

		if (!isPreviewPlaceholderActive) {
			return `${baseHeight}px`;
		}

		const measuredHeight = Math.ceil(COMPOSER_CHROME_HEIGHT + previewPromptHeight);
		return `${Math.max(baseHeight, measuredHeight)}px`;
	}, [galleryExpanded, isPreviewPlaceholderActive, previewPromptHeight]);

	return (
		<>
			<div className="flex-1 shrink min-h-[40px]" />
			<div style={{ width: "800px", maxWidth: "100%", display: "flex", flexDirection: "column", alignItems: "center", gap: token("space.100"), flexShrink: 0 }}>
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
						onPromptChange={handlePromptChange}
						onSubmit={onSubmit}
						onStop={onStop}
						contextEnabled={contextEnabled}
						onContextToggle={onContextToggle}
						product="rovo"
						queuedPrompts={queuedPrompts}
						onRemoveQueuedPrompt={onRemoveQueuedPrompt}
						customHeight={customHeight}
						hideUsesAI={true}
						placeholder={previewPrompt ?? DEFAULT_ROVO_PLACEHOLDER}
						isPreviewPlaceholderActive={isPreviewPlaceholderActive}
						onTextareaReady={handleTextareaReady}
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
						onPreviewStart={handlePreviewStart}
						onPreviewEnd={handlePreviewEnd}
						onExpandChange={setGalleryExpanded}
					/>
				</div>

				<textarea
					ref={previewMeasureRef}
					aria-hidden
					readOnly
					tabIndex={-1}
					className="pointer-events-none absolute -z-10 m-0 h-0 w-0 overflow-hidden opacity-0"
					style={{
						whiteSpace: "pre-wrap",
						overflowWrap: "break-word",
						wordBreak: "break-word",
					}}
				/>
			</div>
			<div className="flex-1 shrink" />

			<div className="shrink-0 flex w-full justify-center">
				<Footer />
			</div>
		</>
	);
}
