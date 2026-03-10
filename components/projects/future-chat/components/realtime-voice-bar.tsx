"use client";

import { useEffect, useRef } from "react";
import { AnimatePresence, motion } from "motion/react";
import type { AgentState, BarVisualizerProps } from "@/components/ui-audio/bar-visualizer";
import { BarVisualizer } from "@/components/ui-audio/bar-visualizer";
import { MessageResponse } from "@/components/ui-ai/message";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { LoaderCircleIcon, MicIcon, SparklesIcon, SquareIcon, Volume2Icon } from "lucide-react";

type RealtimeVoiceState = "idle" | "connecting" | "listening" | "speaking";
type RealtimeGenerationState = "idle" | "delegating" | "generating" | "steering" | "complete";

interface RealtimeVoiceBarProps {
	annotationCount?: number;
	annotationPreview?: string[];
	className?: string;
	currentTranscript?: string;
	generationState?: RealtimeGenerationState;
	micStream?: MediaStream | null;
	modelTranscript?: string;
	onDisconnect: () => void;
	voiceState: RealtimeVoiceState;
}

const EMPTY_ANNOTATION_PREVIEW: string[] = [];

const STATE_LABELS: Record<Exclude<RealtimeVoiceState, "idle">, string> = {
	connecting: "Connecting...",
	listening: "Listening...",
	speaking: "Speaking...",
};

export function RealtimeVoiceBar({
	annotationCount = 0,
	annotationPreview = EMPTY_ANNOTATION_PREVIEW,
	className,
	currentTranscript,
	generationState,
	micStream,
	modelTranscript,
	onDisconnect,
	voiceState,
}: Readonly<RealtimeVoiceBarProps>) {
	const stateLabel = voiceState !== "idle" ? STATE_LABELS[voiceState] : "";
	const scrollRef = useRef<HTMLDivElement>(null);

	// Auto-scroll transcript container when content changes
	useEffect(() => {
		if (scrollRef.current) {
			scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
		}
	}, [currentTranscript, modelTranscript]);

	// Map realtime voice state to BarVisualizer AgentState
	const visualizerState: AgentState | undefined =
		voiceState === "connecting" ? "connecting" : voiceState === "idle" ? undefined : voiceState;

	// Use real mic stream when available, fall back to demo mode
	const useDemoMode = !micStream;
	const visualizerProps: Partial<BarVisualizerProps> = useDemoMode
		? { demo: true }
		: { mediaStream: micStream };

	return (
		<div
			className={cn(
				"flex flex-col gap-2 rounded-[20px] border border-border bg-surface-raised/95 p-3 shadow-sm backdrop-blur",
				className,
			)}
		>
			<div className="flex items-center gap-3">
				<div className="flex size-8 shrink-0 items-center justify-center rounded-full border border-border bg-background text-text">
					{voiceState === "connecting" ? (
						<LoaderCircleIcon className="size-4 animate-spin" />
					) : voiceState === "speaking" ? (
						<Volume2Icon className="size-4" />
					) : (
						<MicIcon className="size-4" />
					)}
				</div>

				<div className="min-w-0 flex-1">
					{voiceState === "listening" || voiceState === "speaking" ? (
						<BarVisualizer
							barCount={24}
							centerAlign
							className="h-8 rounded-md border-0 bg-transparent p-0"
							maxHeight={100}
							minHeight={15}
							state={visualizerState}
							{...visualizerProps}
						/>
					) : (
						<div className="flex h-8 items-center">
							<span className="text-sm text-text-subtle">{stateLabel}</span>
						</div>
					)}
				</div>

				<span className="shrink-0 text-xs text-text-subtle">{stateLabel}</span>

				<Button
					aria-label="End voice conversation"
					className="size-8 shrink-0 rounded-full bg-bg-danger-bold text-text-inverse hover:bg-bg-danger-bold-hovered"
					onClick={onDisconnect}
					size="icon"
					type="button"
					variant="destructive"
				>
					<SquareIcon className="size-3.5" />
				</Button>
			</div>

			{generationState && generationState !== "idle" && generationState !== "complete" ? (
				<div className="flex items-center gap-2 px-1">
					<div className="size-2 animate-pulse rounded-full bg-brand-bold" />
					<span className="text-xs text-text-subtle">
						{generationState === "delegating"
							? "Sending to RovoDev..."
							: generationState === "generating"
								? "RovoDev is working..."
								: "Applying changes..."}
					</span>
				</div>
			) : null}

			{annotationCount > 0 ? (
				<div className="flex items-start gap-2 px-1">
					<Badge variant="information">{annotationCount} annotations</Badge>
					{annotationPreview.length > 0 ? (
						<p className="line-clamp-2 text-text-subtle text-xs">
							{annotationPreview.join(" • ")}
						</p>
					) : null}
				</div>
			) : null}

			<AnimatePresence>
				{currentTranscript || modelTranscript ? (
					<motion.div
						animate={{ opacity: 1, height: "auto" }}
						className="overflow-hidden"
						exit={{ opacity: 0, height: 0 }}
						initial={{ opacity: 0, height: 0 }}
						transition={{ type: "spring", stiffness: 400, damping: 30 }}
					>
						<div
							ref={scrollRef}
							className="flex max-h-[200px] flex-col gap-2 overflow-y-auto"
						>
							{modelTranscript ? (
								<div className="flex items-start gap-2">
									<div className="flex size-6 shrink-0 items-center justify-center rounded-full border border-border bg-surface-raised text-text-subtle">
										<SparklesIcon className="size-3" />
									</div>
									<div className="min-w-0 flex-1 text-sm text-text">
										<MessageResponse isAnimating={voiceState === "speaking"}>
											{modelTranscript}
										</MessageResponse>
									</div>
								</div>
							) : null}

							{currentTranscript ? (
								<div className="flex justify-end">
									<div className="max-w-[85%] rounded-[22px] bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground shadow-sm">
										{currentTranscript}
										{voiceState === "listening" ? (
											<span className="ml-1 inline-block size-1.5 animate-pulse rounded-full bg-primary-foreground/70" />
										) : null}
									</div>
								</div>
							) : null}
						</div>
					</motion.div>
				) : null}
			</AnimatePresence>
		</div>
	);
}
