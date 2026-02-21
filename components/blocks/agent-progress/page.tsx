"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { token } from "@/lib/tokens";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import ChevronDownIcon from "@atlaskit/icon/core/chevron-down";
import ChevronRightIcon from "@atlaskit/icon/core/chevron-right";
import CheckCircleIcon from "@atlaskit/icon/core/check-circle";
import CrossCircleIcon from "@atlaskit/icon/core/cross-circle";
import NodeIcon from "@atlaskit/icon/core/node";
import RetryIcon from "@atlaskit/icon/core/retry";
import VideoStopOverlayIcon from "@atlaskit/icon/core/video-stop-overlay";
import DeleteIcon from "@atlaskit/icon/core/delete";
import { MOCK_TASKS, type ProgressStatusGroups, type ProgressTask } from "./data/mock-tasks";
import { AnimatedDots } from "@/components/ui-ai/animated-dots";

const SUMMARY_RING_SEGMENTED_GRADIENT =
	"conic-gradient(from 220deg, transparent 0deg 252deg, #8d63ff 252deg 266deg, #7fbb44 266deg 280deg, #3b66e0 280deg 294deg, #e5a126 294deg 308deg, transparent 308deg 360deg)";
const SUMMARY_RING_STROKE_PX = 3;
const SUMMARY_RING_DURATION = "calc(var(--duration-slower) * 3)";
const SUMMARY_RING_EASING = "var(--ease-in-out)";
const SUMMARY_RING_MASK =
	`radial-gradient(farthest-side, transparent calc(100% - ${SUMMARY_RING_STROKE_PX}px), #000 calc(100% - ${SUMMARY_RING_STROKE_PX}px))`;
const CARD_ANIMATION_STYLES = `
@keyframes rainbow-ring-spin {
	to { transform: rotate(360deg); }
}
`;

type RunStatus = "running" | "completed" | "failed";
type IconStatus = "done" | "in-progress" | "failed" | "todo";
type StatusGroupKey = "done" | "inReview" | "inProgress" | "failed" | "todo";

export type RetryableStatusGroupKey = "failed" | "todo";

interface StatusGroup {
	key: StatusGroupKey;
	label: string;
	tasks: ProgressTask[];
	iconStatus: IconStatus;
	defaultExpanded: boolean;
}

function getRunStatusLabel(status: RunStatus): string {
	if (status === "completed") return "Completed";
	if (status === "failed") return "Failed";
	return "Running";
}

function getRunStatusToneClass(status: RunStatus): string {
	if (status === "completed") return "text-text";
	if (status === "failed") return "text-text-danger";
	return "text-text-subtle";
}

function formatElapsedTime(totalSeconds: number): string {
	const minutes = Math.floor(totalSeconds / 60);
	const seconds = totalSeconds % 60;
	return `${minutes}m ${seconds.toString().padStart(2, "0")}s`;
}

function getElapsedSeconds(runCreatedAt: string | null, runCompletedAt: string | null, nowMs: number): number {
	if (!runCreatedAt) return 0;
	const startTime = Date.parse(runCreatedAt);
	if (!Number.isFinite(startTime)) return 0;
	const completedTime = runCompletedAt ? Date.parse(runCompletedAt) : Number.NaN;
	const endTime = Number.isFinite(completedTime) ? completedTime : nowMs;
	return Math.max(0, Math.floor((endTime - startTime) / 1000));
}

function TaskStatusIcon({ status }: Readonly<{ status: IconStatus }>) {
	if (status === "done") {
		return <CheckCircleIcon label="" size="small" color={token("color.icon.success")} />;
	}

	if (status === "in-progress") {
		return (
			<div className="flex size-3 items-center justify-center">
				<div className="size-3 animate-spin rounded-full border border-border border-t-text-subtle" />
			</div>
		);
	}

	if (status === "failed") {
		return <CrossCircleIcon label="" size="small" color={token("color.icon.danger")} />;
	}

	return <NodeIcon label="" size="small" color={token("color.icon.subtlest")} />;
}

function TaskItem({ task }: Readonly<{ task: ProgressTask }>) {
	return (
		<div className="flex flex-col px-1">
			<span className="whitespace-normal break-words text-xs leading-4 text-text">
				{task.label}
			</span>
			{task.description.trim().length > 0 ? (
				<span className="text-xs leading-4 text-text-subtlest">{task.description}</span>
			) : null}
		</div>
	);
}

interface TaskGroupRowProps {
	label: string;
	count: number;
	tasks: ProgressTask[];
	defaultExpanded?: boolean;
	onRetry?: () => Promise<void> | void;
	retryLabel?: string;
	isRetrying?: boolean;
}

function TaskGroupRow({
	label,
	count,
	tasks,
	defaultExpanded = false,
	onRetry,
	retryLabel = "Retry failed tasks",
	isRetrying = false,
}: Readonly<TaskGroupRowProps>) {
	const [expanded, setExpanded] = useState(defaultExpanded);

	return (
		<div className="flex flex-1 flex-col">
			<div className="flex h-8 items-center justify-between rounded-md px-1 py-1 hover:bg-bg-neutral-subtle-hovered">
				<div className="flex min-w-0 items-center gap-1">
					<span className="text-sm font-medium leading-5 text-text-subtle">{label}</span>
					{onRetry ? (
						<Button
							variant="ghost"
							size="icon-xs"
							className="size-6 rounded-sm text-icon-subtle hover:text-icon"
							disabled={isRetrying}
							aria-label={retryLabel}
							onClick={(e) => {
								e.stopPropagation();
								void onRetry();
							}}
						>
							<RetryIcon label="" size="small" />
						</Button>
					) : null}
				</div>
				<button
					type="button"
					onClick={(e) => {
						e.stopPropagation();
						setExpanded((prev) => !prev);
					}}
					className="inline-flex items-center gap-1 rounded-sm px-1 hover:bg-bg-neutral-subtle-hovered"
				>
					<span className="inline-flex h-4 min-w-6 items-center justify-center rounded-[2px] bg-bg-neutral px-1 text-xs text-text">{count}</span>
					{expanded ? <ChevronDownIcon label="" size="small" /> : <ChevronRightIcon label="" size="small" />}
				</button>
			</div>
			{expanded ? (
				<div className="flex flex-col gap-1">
					{tasks.map((task) => (
						<TaskItem key={task.id} task={task} />
					))}
				</div>
			) : null}
		</div>
	);
}

function buildStatusGroups(groups: ProgressStatusGroups): StatusGroup[] {
	return [
		{
			key: "done",
			label: "Done",
			tasks: groups.done,
			iconStatus: groups.done.length > 0 ? "done" : "todo",
			defaultExpanded: false,
		},
		{
			key: "inReview",
			label: "In Review",
			tasks: groups.inReview,
			iconStatus: groups.inReview.length > 0 ? "in-progress" : "todo",
			defaultExpanded: true,
		},
		{
			key: "inProgress",
			label: "In Progress",
			tasks: groups.inProgress,
			iconStatus: groups.inProgress.length > 0 ? "in-progress" : "todo",
			defaultExpanded: groups.inProgress.length > 0,
		},
		{
			key: "failed",
			label: "Failed",
			tasks: groups.failed,
			iconStatus: groups.failed.length > 0 ? "failed" : "todo",
			defaultExpanded: groups.failed.length > 0,
		},
		{
			key: "todo",
			label: "Pending",
			tasks: groups.todo,
			iconStatus: "todo",
			defaultExpanded: false,
		},
	];
}

function isRetryableStatusGroupKey(
	groupKey: StatusGroupKey
): groupKey is RetryableStatusGroupKey {
	return groupKey === "failed" || groupKey === "todo";
}

interface AgentsProgressProps {
	planTitle?: string;
	planEmoji?: string;
	taskStatusGroups?: ProgressStatusGroups;
	runStatus?: RunStatus;
	runCreatedAt?: string | null;
	runCompletedAt?: string | null;
	showSummaryRainbow?: boolean;
	runCount?: number;
	agentCount?: number;
	defaultCollapsed?: boolean;
	isCollapsible?: boolean;
	onCardClick?: () => void;
	onDelete?: () => void;
	onRetryGroup?: (
		groupKey: RetryableStatusGroupKey,
		taskIds: string[]
	) => Promise<void> | void;
	className?: string;
}

export default function AgentsProgress({
	planTitle = "Untitled task run",
	planEmoji = "📋",
	taskStatusGroups = MOCK_TASKS,
	runStatus = "running",
	runCreatedAt = new Date(Date.now() - 651_000).toISOString(),
	runCompletedAt = null,
	showSummaryRainbow = false,
	runCount = 1,
	agentCount = 10,
	defaultCollapsed = false,
	isCollapsible = true,
	onCardClick,
	onDelete,
	onRetryGroup,
	className,
}: Readonly<AgentsProgressProps>) {
	const [collapsed, setCollapsed] = useState(defaultCollapsed);
	const [nowMs, setNowMs] = useState(() => Date.now());
	const [retryingGroupKey, setRetryingGroupKey] =
		useState<RetryableStatusGroupKey | null>(null);
	const isInteractive = isCollapsible || typeof onCardClick === "function";

	useEffect(() => {
		if (runStatus !== "running" || !runCreatedAt) return;
		const intervalId = setInterval(() => setNowMs(Date.now()), 1000);
		return () => clearInterval(intervalId);
	}, [runCreatedAt, runStatus]);

	const elapsedSeconds = useMemo(
		() => getElapsedSeconds(runCreatedAt ?? null, runCompletedAt ?? null, nowMs),
		[nowMs, runCompletedAt, runCreatedAt]
	);

	const statusGroups = useMemo(() => buildStatusGroups(taskStatusGroups), [taskStatusGroups]);
	const runStatusLabel = getRunStatusLabel(runStatus);
	const runStatusToneClass = getRunStatusToneClass(runStatus);
	const statusText = runStatus === "running" ? `${agentCount} agents cooking` : runStatusLabel;
	const handleCardActivate = () => {
		if (isCollapsible) {
			setCollapsed((prev) => !prev);
		}
		onCardClick?.();
	};

	const handleRetryGroup = useCallback(
		async (group: StatusGroup) => {
			if (!onRetryGroup || !isRetryableStatusGroupKey(group.key)) {
				return;
			}
			if (retryingGroupKey) {
				return;
			}

			setRetryingGroupKey(group.key);
			try {
				await onRetryGroup(
					group.key,
					group.tasks.map((task) => task.id)
				);
			} finally {
				setRetryingGroupKey(null);
			}
		},
		[onRetryGroup, retryingGroupKey]
	);

	return (
		<div
			className={cn(
				"group/card w-full max-w-sm overflow-hidden rounded-2xl bg-surface-raised shadow-sm transition-shadow duration-200 hover:shadow-xl",
				isInteractive ? "cursor-pointer" : "cursor-default",
				className
			)}
			onClick={isInteractive ? handleCardActivate : undefined}
			onKeyDown={isInteractive ? (e: React.KeyboardEvent) => {
				if (e.key === "Enter" || e.key === " ") {
					e.preventDefault();
					handleCardActivate();
				}
			} : undefined}
			role={isInteractive ? "button" : undefined}
			tabIndex={isInteractive ? 0 : undefined}
		>
			<style dangerouslySetInnerHTML={{ __html: CARD_ANIMATION_STYLES }} />
			<div className="flex flex-col gap-3 px-4 py-3">
				<div className="flex items-center justify-between">
					<div className="flex min-w-0 items-center gap-3">
						<div className="relative flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-bg-neutral">
							{showSummaryRainbow ? (
								<span
									aria-hidden="true"
									className="pointer-events-none absolute inset-0 rounded-full motion-reduce:hidden"
									style={{
										background: SUMMARY_RING_SEGMENTED_GRADIENT,
										mask: SUMMARY_RING_MASK,
										WebkitMask: SUMMARY_RING_MASK,
										animation: `rainbow-ring-spin ${SUMMARY_RING_DURATION} ${SUMMARY_RING_EASING} infinite`,
										willChange: "transform",
									}}
								/>
							) : null}
							<span className="relative z-10 text-base leading-5 text-text-subtle">{planEmoji}</span>
						</div>
						<div className="min-w-0">
							<span style={{ font: token("font.heading.xsmall") }} className="block truncate text-text">
								{planTitle}
							</span>
							<span className="text-xs leading-4 text-text-subtlest">Time taken {formatElapsedTime(elapsedSeconds)}</span>
						</div>
					</div>
					{runStatus === "running" && !collapsed ? (
						<Button aria-label="Stop execution" size="icon" variant="outline" className="rounded-full text-icon-danger" onClick={(e) => e.stopPropagation()}>
							<VideoStopOverlayIcon label="" size="small" />
						</Button>
					) : onDelete ? (
						<span className="hidden group-hover/card:block" onClick={(e) => e.stopPropagation()} role="presentation">
							<Button
								aria-label="Delete run"
								variant="ghost"
								size="icon"
								className="cursor-pointer rounded-full text-icon-subtle hover:text-icon"
								onClick={onDelete}
							>
								<DeleteIcon size="small" label="" />
							</Button>
						</span>
					) : null}
				</div>

				{!collapsed ? (
					<>
						<div className="h-px bg-border" />

						<div className="flex items-center gap-1">
							<span className="text-xs leading-4 text-text-subtlest">
								{runCount} {runCount === 1 ? "run" : "runs"}
							</span>
							<span className="text-xs leading-4 text-text-subtlest">•</span>
							{runStatus === "running" ? (
								<>
									<span className="inline-flex items-baseline text-xs leading-4 text-text-subtlest">
										{statusText}
										<AnimatedDots className="[&>span]:text-xs" />
									</span>
								</>
							) : (
								<span className={cn("text-xs leading-4", runStatusToneClass)}>{runStatusLabel}</span>
							)}
						</div>
					</>
				) : null}
			</div>

			{!collapsed ? (
				<div className="mx-1 mb-1 rounded-b-xl rounded-t-md bg-surface-sunken p-2">
					<div className="flex flex-col">
						{statusGroups
							.filter((group) => group.tasks.length > 0)
							.map((group, index, visible) => {
								const isLast = index === visible.length - 1;
								const canRetry = Boolean(
									onRetryGroup &&
									isRetryableStatusGroupKey(group.key) &&
									group.key === "failed"
								);
								return (
									<div key={group.key} className="flex gap-1">
										<div className="flex w-5 shrink-0 flex-col items-center">
											<div className="flex h-8 shrink-0 items-center justify-center">
												<TaskStatusIcon status={group.iconStatus} />
											</div>
											{!isLast ? <div className="min-h-2 w-px flex-1 bg-border" /> : null}
										</div>
										<TaskGroupRow
											label={group.label}
											count={group.tasks.length}
											tasks={group.tasks}
											defaultExpanded={group.defaultExpanded}
											onRetry={canRetry ? () => handleRetryGroup(group) : undefined}
											retryLabel={
												group.key === "failed" ? "Retry failed tasks" : "Retry tasks"
											}
											isRetrying={
												group.key === retryingGroupKey
											}
										/>
									</div>
								);
							})}
					</div>
				</div>
			) : null}
		</div>
	);
}
