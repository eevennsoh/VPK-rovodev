"use client";

import { useEffect, useMemo, useState } from "react";
import { token } from "@/lib/tokens";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import ChevronDownIcon from "@atlaskit/icon/core/chevron-down";
import ChevronRightIcon from "@atlaskit/icon/core/chevron-right";
import CheckCircleIcon from "@atlaskit/icon/core/check-circle";
import NodeIcon from "@atlaskit/icon/core/node";
import VideoStopOverlayIcon from "@atlaskit/icon/core/video-stop-overlay";
import SyncIcon from "@atlaskit/icon-lab/core/sync";
import { MOCK_TASKS, type ProgressStatusGroups, type ProgressTask } from "./data/mock-tasks";

const DOT_COLORS = ["#1868db", "#bf63f3", "#fca700"] as const;

type RunStatus = "running" | "completed" | "failed";

type IconStatus = "done" | "in-progress" | "todo";

interface StatusGroup {
	key: string;
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
	const completedTime = runCompletedAt ? Date.parse(runCompletedAt) : NaN;
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
	return <NodeIcon label="" size="small" color={token("color.icon.subtlest")} />;
}

function TaskItem({ task }: Readonly<{ task: ProgressTask }>) {
	return (
		<div className="flex flex-col px-1">
			<span className="truncate text-xs leading-4 text-text">{task.description}</span>
			<span className="flex items-center text-xs leading-4 text-text-subtlest">
				{task.label}
				{task.agentName ? (
					<>
						<span className="mx-1">•</span>
						<Avatar size="xs" shape="hexagon" className="!size-3 shrink-0">
							<AvatarImage src={task.agentAvatarSrc ?? "/avatar-agent/dev-agents/basic-coding-agent-template.svg"} alt={task.agentName} />
							<AvatarFallback>AI</AvatarFallback>
						</Avatar>
						<span className="ml-1">{task.agentName}</span>
					</>
				) : null}
			</span>
		</div>
	);
}

interface TaskGroupRowProps {
	label: string;
	count: number;
	tasks: ProgressTask[];
	defaultExpanded?: boolean;
}

function TaskGroupRow({ label, count, tasks, defaultExpanded = false }: Readonly<TaskGroupRowProps>) {
	const [expanded, setExpanded] = useState(defaultExpanded);

	return (
		<div className="flex flex-1 flex-col">
			<button
				type="button"
				onClick={(e) => {
					e.stopPropagation();
					setExpanded((prev) => !prev);
				}}
				className="flex h-8 w-full items-center justify-between rounded-md px-1 py-1 text-left hover:bg-bg-neutral-subtle-hovered"
			>
				<span className="text-sm font-medium leading-5 text-text-subtle">{label}</span>
				<div className="flex items-center gap-1">
					<span className="inline-flex h-4 min-w-6 items-center justify-center rounded-[2px] bg-bg-neutral px-1 text-xs text-text">{count}</span>
					{expanded ? <ChevronDownIcon label="" size="small" /> : <ChevronRightIcon label="" size="small" />}
				</div>
			</button>
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
			defaultExpanded: false,
		},
		{
			key: "todo",
			label: "Tasks",
			tasks: groups.todo,
			iconStatus: "todo",
			defaultExpanded: false,
		},
	];
}

interface AgentsProgressProps {
	planTitle?: string;
	planEmoji?: string;
	taskStatusGroups?: ProgressStatusGroups;
	runStatus?: RunStatus;
	runCreatedAt?: string | null;
	runCompletedAt?: string | null;
	runCount?: number;
	agentCount?: number;
	defaultCollapsed?: boolean;
}

export default function AgentsProgress({
	planTitle = "Flexible Friday Plan",
	planEmoji = "🔥",
	taskStatusGroups = MOCK_TASKS,
	runStatus = "running",
	runCreatedAt = new Date(Date.now() - 651_000).toISOString(),
	runCompletedAt = null,
	runCount = 1,
	agentCount = 10,
	defaultCollapsed = false,
}: Readonly<AgentsProgressProps>) {
	const [collapsed, setCollapsed] = useState(defaultCollapsed);
	const [nowMs, setNowMs] = useState(() => Date.now());

	useEffect(() => {
		if (runStatus !== "running" || !runCreatedAt) return;
		const intervalId = setInterval(() => setNowMs(Date.now()), 1000);
		return () => clearInterval(intervalId);
	}, [runCreatedAt, runStatus]);

	const elapsedSeconds = useMemo(() => getElapsedSeconds(runCreatedAt ?? null, runCompletedAt ?? null, nowMs), [nowMs, runCompletedAt, runCreatedAt]);

	const statusGroups = useMemo(() => buildStatusGroups(taskStatusGroups), [taskStatusGroups]);
	const runStatusLabel = getRunStatusLabel(runStatus);
	const runStatusToneClass = getRunStatusToneClass(runStatus);
	const statusText = runStatus === "running" ? `${agentCount} agents cooking` : runStatusLabel;

	return (
		<div
			className="w-full max-w-sm cursor-pointer overflow-hidden rounded-2xl bg-surface shadow-sm transition-shadow duration-200 hover:shadow-xl"
			onClick={() => setCollapsed((prev) => !prev)}
			onKeyDown={(e: React.KeyboardEvent) => {
				if (e.key === "Enter" || e.key === " ") {
					e.preventDefault();
					setCollapsed((prev) => !prev);
				}
			}}
			role="button"
			tabIndex={0}
		>
			<div className="flex flex-col gap-3 px-4 py-3">
				<div className="flex items-center justify-between">
					<div className="flex min-w-0 items-center gap-3">
						<div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-bg-neutral">
							<span className="text-base leading-5 text-text-subtle">{planEmoji}</span>
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
								<style dangerouslySetInnerHTML={{ __html: `@keyframes dot-reveal { 0%, 20% { opacity: 0; } 40%, 100% { opacity: 1; } }` }} />
								<span className="inline-flex items-baseline text-xs leading-4 text-text-subtlest">
									{statusText}
									<span className="inline-flex items-baseline" aria-hidden="true">
										{DOT_COLORS.map((color, i) => (
											<span
												key={i}
												className="text-xs leading-none"
												style={{
													color,
													animation: "dot-reveal 1.2s ease-in-out infinite",
													animationDelay: `${i * 0.2}s`,
												}}
											>
												.
											</span>
										))}
									</span>
								</span>
								</>
							) : (
								<>
									<SyncIcon label="" size="small" color={token("color.icon.subtle")} />
									<span className={cn("text-xs leading-4", runStatusToneClass)}>{runStatusLabel}</span>
								</>
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
							return (
								<div key={group.key} className="flex gap-1">
									<div className="flex w-5 shrink-0 flex-col items-center">
										<div className="flex h-8 shrink-0 items-center justify-center">
											<TaskStatusIcon status={group.iconStatus} />
										</div>
										{!isLast ? <div className="min-h-2 w-px flex-1 bg-border" /> : null}
									</div>
									<TaskGroupRow label={group.label} count={group.tasks.length} tasks={group.tasks} defaultExpanded={group.defaultExpanded} />
								</div>
							);
						})}
					</div>
				</div>
			) : null}
		</div>
	);
}
