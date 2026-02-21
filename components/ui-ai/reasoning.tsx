"use client";

import type { ComponentProps, ReactNode } from "react";

import { useControllableState } from "@/hooks/use-controllable-state";
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { token } from "@/lib/tokens";
import { cn } from "@/lib/utils";
import { cjk } from "@streamdown/cjk";
import { code } from "@streamdown/code";
import { math } from "@streamdown/math";
import { mermaid } from "@streamdown/mermaid";
import RovoIconGlyph from "@atlaskit/icon-lab/core/rovo";
import { ChevronDownIcon } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import Image from "next/image";
import {
	createContext,
	memo,
	useCallback,
	use,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import { Streamdown } from "streamdown";

import { Shimmer } from "./shimmer";

interface ReasoningContextValue {
	isStreaming: boolean;
	isOpen: boolean;
	setIsOpen: (open: boolean) => void;
	duration: number | undefined;
	maxVisibleTimelineItems: number;
	setTimelineEntryCount: (count: number) => void;
}

const ReasoningContext = createContext<ReasoningContextValue | null>(null);

export const useReasoning = () => {
	const context = use(ReasoningContext);
	if (!context) {
		throw new Error("Reasoning components must be used within Reasoning");
	}
	return context;
};

export type ReasoningProps = ComponentProps<typeof Collapsible> & {
	isStreaming?: boolean;
	open?: boolean;
	defaultOpen?: boolean;
	onOpenChange?: (open: boolean) => void;
	duration?: number;
	autoCollapseAtCount?: number;
	collapseDelayMs?: number;
	maxVisibleTimelineItems?: number;
};

const AUTO_CLOSE_DELAY = 1000;
const MS_IN_S = 1000;
const DEFAULT_MAX_VISIBLE_TIMELINE_ITEMS = 5;
const TIMELINE_STATUS_LINE_REGEX =
	/^(?:used|using|invoking|completed|running|calling|tool call failed|failed)\b/i;

interface TimelineEntry {
	id: string;
	label: string;
}

function parseTimelineEntries(value: string): TimelineEntry[] {
	const lines = value
		.split(/\r?\n/)
		.map((line) => line.trim())
		.filter((line) => line.length > 0);
	if (lines.length === 0) {
		return [];
	}

	const areAllStatusLines = lines.every((line) =>
		TIMELINE_STATUS_LINE_REGEX.test(line)
	);
	if (!areAllStatusLines) {
		return [];
	}

	return lines.map((line, index) => ({
		id: `${index}-${line.toLowerCase().replace(/\s+/g, " ")}`,
		label: line,
	}));
}

function ReasoningStatusIcon({
	isCompleted = false,
}: Readonly<{ isCompleted?: boolean }>): ReactNode {
	return (
		<span className="inline-flex size-5 items-center justify-center">
			<RovoIconGlyph
				color={isCompleted ? token("color.icon.subtle") : token("color.icon")}
				label=""
				size="small"
			/>
		</span>
	);
}

export const Reasoning = memo(
	({
		className,
		isStreaming = false,
		open,
		defaultOpen,
		onOpenChange,
		duration: durationProp,
		autoCollapseAtCount = DEFAULT_MAX_VISIBLE_TIMELINE_ITEMS,
		collapseDelayMs = AUTO_CLOSE_DELAY,
		maxVisibleTimelineItems = DEFAULT_MAX_VISIBLE_TIMELINE_ITEMS,
		children,
		...props
	}: Readonly<ReasoningProps>) => {
		const resolvedDefaultOpen = defaultOpen ?? isStreaming;
		const isExplicitlyClosed = defaultOpen === false;

		const [isOpen, setIsOpen] = useControllableState<boolean>({
			defaultProp: resolvedDefaultOpen,
			onChange: onOpenChange,
			prop: open,
		});
		const [duration, setDuration] = useControllableState<number | undefined>({
			defaultProp: undefined,
			prop: durationProp,
		});
		const [timelineEntryCount, setTimelineEntryCount] = useState(0);

		const hasEverStreamedRef = useRef(isStreaming);
		const startTimeRef = useRef<number | null>(null);
		const hasUserClosedRef = useRef(false);
		const hasAutoCollapsedAtCountRef = useRef(false);
		const hasAutoCollapsedOnCompletionRef = useRef(false);
		const prevStreamingRef = useRef(isStreaming);

		useEffect(() => {
			const isStartingStream = isStreaming && !prevStreamingRef.current;
			if (isStartingStream) {
				hasUserClosedRef.current = false;
				hasAutoCollapsedAtCountRef.current = false;
				hasAutoCollapsedOnCompletionRef.current = false;
			}

			if (isStreaming) {
				hasEverStreamedRef.current = true;
				if (startTimeRef.current === null) {
					startTimeRef.current = Date.now();
				}
			} else if (startTimeRef.current !== null) {
				setDuration(Math.ceil((Date.now() - startTimeRef.current) / MS_IN_S));
				startTimeRef.current = null;
			}

			prevStreamingRef.current = isStreaming;
		}, [isStreaming, setDuration]);

		useEffect(() => {
			if (
				isStreaming &&
				!isOpen &&
				!isExplicitlyClosed &&
				!hasUserClosedRef.current
			) {
				setIsOpen(true);
			}
		}, [isExplicitlyClosed, isOpen, isStreaming, setIsOpen]);

		useEffect(() => {
			if (!isStreaming || !isOpen || hasAutoCollapsedAtCountRef.current) {
				return;
			}
			if (timelineEntryCount < autoCollapseAtCount) {
				return;
			}

			const timer = setTimeout(() => {
				setIsOpen(false);
				hasAutoCollapsedAtCountRef.current = true;
				hasUserClosedRef.current = true;
			}, collapseDelayMs);

			return () => clearTimeout(timer);
		}, [
			autoCollapseAtCount,
			collapseDelayMs,
			isOpen,
			isStreaming,
			setIsOpen,
			timelineEntryCount,
		]);

		useEffect(() => {
			if (
				!hasEverStreamedRef.current ||
				isStreaming ||
				!isOpen ||
				hasAutoCollapsedOnCompletionRef.current
			) {
				return;
			}

			const timer = setTimeout(() => {
				setIsOpen(false);
				hasAutoCollapsedOnCompletionRef.current = true;
			}, collapseDelayMs);

			return () => clearTimeout(timer);
		}, [collapseDelayMs, isOpen, isStreaming, setIsOpen]);

		const handleOpenChange = useCallback(
			(newOpen: boolean) => {
				if (!newOpen && isStreaming) {
					hasUserClosedRef.current = true;
				}
				setIsOpen(newOpen);
			},
			[setIsOpen, isStreaming]
		);

		const handleTimelineEntryCountChange = useCallback((count: number) => {
			setTimelineEntryCount((previous) =>
				previous === count ? previous : count
			);
		}, []);

		const contextValue = useMemo(
			() => ({
				duration,
				isOpen,
				isStreaming,
				maxVisibleTimelineItems,
				setIsOpen,
				setTimelineEntryCount: handleTimelineEntryCountChange,
			}),
			[
				duration,
				handleTimelineEntryCountChange,
				isOpen,
				isStreaming,
				maxVisibleTimelineItems,
				setIsOpen,
			]
		);

		return (
			<ReasoningContext value={contextValue}>
				<Collapsible
					className={cn("not-prose mb-4", className)}
					onOpenChange={handleOpenChange}
					open={isOpen}
					{...props}
				>
					{children}
				</Collapsible>
			</ReasoningContext>
		);
	}
);

const DOT_COLORS = ["#1868db", "#bf63f3", "#fca700"] as const;
const COMPLETED_STATUS_PREFIXES = ["used", "completed"] as const;

/** Strip trailing dots/ellipsis from a label since animated dots are appended separately. */
const stripTrailingDots = (label: string) => label.replace(/\.+$/, "");

const isCompletedStatusLabel = (label: ReactNode) => {
	if (typeof label !== "string") {
		return false;
	}
	const normalizedLabel = label.trim().toLowerCase();
	return COMPLETED_STATUS_PREFIXES.some((prefix) =>
		normalizedLabel === prefix || normalizedLabel.startsWith(`${prefix} `)
	);
};

export type ReasoningTriggerProps = ComponentProps<
	typeof CollapsibleTrigger
> & {
	label?: string;
	completedLabel?: (duration?: number) => ReactNode;
};

const defaultReasoningCompletedLabel = (duration?: number) => {
	if (duration === undefined) {
		return "Thought for a few seconds";
	}
	return `Thought for ${duration} ${duration === 1 ? "second" : "seconds"}`;
};

export const ReasoningTrigger = memo(
	({
		className,
		children,
		label = "Thinking",
		completedLabel = defaultReasoningCompletedLabel,
		...props
	}: Readonly<ReasoningTriggerProps>) => {
		const { isStreaming, isOpen, duration } = useReasoning();
		const isComplete = !isStreaming && duration !== undefined && duration > 0;
		const hasCompletedStatusLabel = isCompletedStatusLabel(label);
		const shouldShowCompletedState = isComplete || hasCompletedStatusLabel;
		const completedStateLabel = hasCompletedStatusLabel
			? label
			: completedLabel(duration);

		return (
			<CollapsibleTrigger
				className={cn(
					"flex w-full items-center gap-2 text-muted-foreground text-sm transition-colors hover:text-foreground",
					className
				)}
				{...props}
			>
				{children ?? (
					<>
						{shouldShowCompletedState ? (
							<>
								<ReasoningStatusIcon isCompleted />
								<span className="min-w-0 truncate">{completedStateLabel}</span>
							</>
						) : (
							<>
								<style
									dangerouslySetInnerHTML={{
										__html: `
											@keyframes dot-reveal {
												0%, 20% { opacity: 0; }
												40%, 100% { opacity: 1; }
											}
										`,
									}}
								/>
								<Image
									alt=""
									height={20}
									src="/loading/rovo-logo.gif"
									unoptimized
									width={20}
								/>
								<span className="flex min-w-0 items-baseline">
									<Shimmer duration={1} as="span" className="min-w-0 truncate">
										{stripTrailingDots(label)}
									</Shimmer>
									<span className="shrink-0 inline-flex items-baseline" aria-hidden="true">
										{DOT_COLORS.map((color, i) => (
											<span
												key={i}
												className="text-sm leading-none"
												style={{
													animation: "dot-reveal 1.2s ease-in-out infinite",
													animationDelay: `${i * 0.2}s`,
													color,
												}}
											>
												.
											</span>
										))}
									</span>
								</span>
							</>
						)}
						<ChevronDownIcon
							className={cn(
								"size-4 shrink-0 transition-transform",
								isOpen ? "rotate-180" : "rotate-0"
							)}
						/>
					</>
				)}
			</CollapsibleTrigger>
		);
	}
);

export type ReasoningContentProps = ComponentProps<
	typeof CollapsibleContent
> & {
	/**
	 * When a string is provided, ReasoningContent can auto-detect and render a timeline.
	 * For richer UIs (tools, tasks, etc.), pass React children.
	 */
	children: ReactNode;
	timelineMode?: "auto" | "always" | "never";
	maxVisibleTimelineItems?: number;
};

const streamdownPlugins = { cjk, code, math, mermaid };

export type ReasoningTextProps = {
	text: string;
	timelineMode: "auto" | "always" | "never";
	maxVisibleTimelineItems: number;
};

export function ReasoningText({
	text,
	timelineMode,
	maxVisibleTimelineItems,
}: Readonly<ReasoningTextProps>): ReactNode {
	const { setTimelineEntryCount } = useReasoning();
	const shouldReduceMotion = useReducedMotion();

	const timelineEntries = useMemo(() => parseTimelineEntries(text), [text]);
	const shouldRenderTimeline =
		timelineMode === "always" ||
		(timelineMode === "auto" && timelineEntries.length > 0);
	const visibleTimelineEntries = shouldRenderTimeline
		? timelineEntries.slice(-maxVisibleTimelineItems)
		: [];

	useEffect(() => {
		setTimelineEntryCount(shouldRenderTimeline ? timelineEntries.length : 0);

		return () => {
			setTimelineEntryCount(0);
		};
	}, [setTimelineEntryCount, shouldRenderTimeline, timelineEntries.length]);

	if (shouldRenderTimeline) {
		return (
			<div className="relative pl-6">
				<div
					aria-hidden
					className="absolute bottom-0 left-2.5 top-0 w-px bg-border"
				/>
				<div className="space-y-1">
					<AnimatePresence initial={false}>
						{visibleTimelineEntries.map((entry) => (
							<motion.p
								key={entry.id}
								animate={
									shouldReduceMotion ? undefined : { opacity: 1, y: 0 }
								}
								className="m-0 truncate text-left text-sm leading-7 text-text-subtle"
								exit={
									shouldReduceMotion ? undefined : { opacity: 0, y: 6 }
								}
								initial={
									shouldReduceMotion ? false : { opacity: 0, y: -6 }
								}
								layout={!shouldReduceMotion}
								transition={{ duration: 0.2, ease: "easeOut" }}
							>
								{entry.label}
							</motion.p>
						))}
					</AnimatePresence>
				</div>
			</div>
		);
	}

	return <Streamdown plugins={streamdownPlugins}>{text}</Streamdown>;
}

export const ReasoningContent = memo(
	({
		className,
		children,
		timelineMode = "auto",
		maxVisibleTimelineItems,
		...props
	}: Readonly<ReasoningContentProps>) => {
		const { maxVisibleTimelineItems: contextMaxVisibleTimelineItems } =
			useReasoning();

		const textChildren = typeof children === "string" ? children : null;
		const resolvedMaxVisibleTimelineItems =
			maxVisibleTimelineItems ?? contextMaxVisibleTimelineItems;

		return (
			<CollapsibleContent
				className={cn(
					"mt-4 text-sm",
					"data-[state=closed]:fade-out-0 data-[state=closed]:slide-out-to-top-2 data-[state=open]:slide-in-from-top-2 text-muted-foreground outline-none data-[state=closed]:animate-out data-[state=open]:animate-in",
					className
				)}
				{...props}
			>
				{textChildren ? (
					<ReasoningText
						maxVisibleTimelineItems={resolvedMaxVisibleTimelineItems}
						text={textChildren}
						timelineMode={timelineMode}
					/>
				) : (
					<>{children}</>
				)}
			</CollapsibleContent>
		);
	}
);

export type AdsReasoningTriggerProps = ComponentProps<
	typeof CollapsibleTrigger
> & {
	label?: string;
	completedLabel?: (duration?: number) => ReactNode;
	showChevron?: boolean;
};

const defaultCompletedLabel = (duration?: number) => {
	if (duration === undefined) {
		return "Thought for a few seconds";
	}
	return `Thought for ${duration} ${duration === 1 ? "second" : "seconds"}`;
};

export type ReasoningSectionProps = ComponentProps<"div"> & {
	title?: ReactNode;
};

export const ReasoningSection = memo(
	({ className, title, children, ...props }: Readonly<ReasoningSectionProps>) => (
		<div className={cn("space-y-2", className)} {...props}>
			{title ? (
				<h4 className="font-medium text-muted-foreground text-[12px]">
					{title}
				</h4>
			) : null}
			{children}
		</div>
	)
);

export const AdsReasoningTrigger = memo(
	({
		className,
		label = "Thinking",
		completedLabel = defaultCompletedLabel,
		showChevron = true,
		...props
	}: Readonly<AdsReasoningTriggerProps>) => {
		const { isStreaming, isOpen, duration } = useReasoning();
		const isComplete = !isStreaming && duration !== undefined && duration > 0;
		const hasCompletedStatusLabel = isCompletedStatusLabel(label);
		const shouldShowCompletedState = isComplete || hasCompletedStatusLabel;
		const completedStateLabel = hasCompletedStatusLabel
			? label
			: completedLabel(duration);

		return (
			<CollapsibleTrigger
				className={cn(
					"flex w-full items-center gap-2 text-muted-foreground text-sm transition-colors hover:text-foreground",
					className
				)}
				{...props}
			>
				{shouldShowCompletedState ? (
					<>
						<ReasoningStatusIcon isCompleted />
						<span className="min-w-0 truncate">{completedStateLabel}</span>
					</>
				) : (
					<>
						<style
							dangerouslySetInnerHTML={{
								__html: `
									@keyframes dot-reveal {
										0%, 20% { opacity: 0; }
										40%, 100% { opacity: 1; }
									}
								`,
							}}
						/>
						<Image
							alt=""
							height={20}
							src="/loading/rovo-logo.gif"
							unoptimized
							width={20}
						/>
						<span className="flex min-w-0 items-baseline">
							<Shimmer duration={1} as="span" className="min-w-0 truncate">
								{stripTrailingDots(label)}
							</Shimmer>
							<span className="shrink-0 inline-flex items-baseline" aria-hidden="true">
								{DOT_COLORS.map((color, i) => (
									<span
										key={i}
										className="text-sm leading-none"
										style={{
											animation: "dot-reveal 1.2s ease-in-out infinite",
											animationDelay: `${i * 0.2}s`,
											color,
										}}
									>
										.
									</span>
								))}
							</span>
						</span>
					</>
				)}
				{showChevron ? (
					<ChevronDownIcon
						className={cn(
							"size-4 shrink-0 transition-transform",
							isOpen ? "rotate-180" : "rotate-0"
						)}
					/>
				) : null}
			</CollapsibleTrigger>
		);
	}
);

Reasoning.displayName = "Reasoning";
ReasoningTrigger.displayName = "ReasoningTrigger";
ReasoningContent.displayName = "ReasoningContent";
ReasoningSection.displayName = "ReasoningSection";
AdsReasoningTrigger.displayName = "AdsReasoningTrigger";
