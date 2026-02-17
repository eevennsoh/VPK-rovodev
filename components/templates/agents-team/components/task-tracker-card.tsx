"use client";

import { useEffect, useMemo, useState } from "react";
import { token } from "@/lib/tokens";
import { Button } from "@/components/ui/button";
import ChevronRightIcon from "@atlaskit/icon/core/chevron-right";
import NodeIcon from "@atlaskit/icon/core/node";
import VideoStopOverlayIcon from "@atlaskit/icon/core/video-stop-overlay";
import SyncIcon from "@atlaskit/icon-lab/core/sync";
import type { TaskStatusGroups } from "../lib/execution-data";

function getRunStatusLabel(status: "running" | "completed" | "failed"): string {
	if (status === "completed") return "Completed";
	if (status === "failed") return "Failed";
	return "Running";
}

function getRunStatusToneClass(status: "running" | "completed" | "failed"): string {
	if (status === "completed") return "text-text";
	if (status === "failed") return "text-text-danger";
	return "text-text-subtle";
}

interface TaskTrackerCardProps {
	planTitle: string;
	planEmoji: string;
	taskStatusGroups: TaskStatusGroups;
	runStatus: "running" | "completed" | "failed";
	runCreatedAt: string | null;
	runCompletedAt: string | null;
}

function formatElapsedTime(totalSeconds: number): string {
	const minutes = Math.floor(totalSeconds / 60);
	const seconds = totalSeconds % 60;
	return `${minutes}m ${seconds.toString().padStart(2, "0")}s`;
}

function getElapsedSeconds(
	runCreatedAt: string | null,
	runCompletedAt: string | null,
	nowMs: number
): number {
	if (!runCreatedAt) {
		return 0;
	}

	const startTime = Date.parse(runCreatedAt);
	if (!Number.isFinite(startTime)) {
		return 0;
	}

	const completedTime = runCompletedAt ? Date.parse(runCompletedAt) : NaN;
	const endTime = Number.isFinite(completedTime) ? completedTime : nowMs;
	return Math.max(0, Math.floor((endTime - startTime) / 1000));
}

interface TaskGroupRowProps {
	label: string;
	count: number;
	icon: React.ReactNode;
}

function TaskGroupRow({ label, count, icon }: Readonly<TaskGroupRowProps>) {
	if (count === 0) return null;

	return (
		<button
			type="button"
			className="flex w-full items-center justify-between rounded-md px-2 py-1 text-left hover:bg-bg-neutral-subtle-hovered"
		>
			<div className="flex items-center gap-2">
				{icon}
				<span className="text-sm font-medium leading-5 text-text-subtle">
					{label}
				</span>
			</div>
			<div className="flex items-center gap-1">
				<span className="inline-flex h-4 min-w-6 items-center justify-center rounded-[2px] bg-bg-neutral px-1 text-xs text-text">
					{count}
				</span>
				<ChevronRightIcon label="" size="small" />
			</div>
		</button>
	);
}

function TaskStatusIcon({ status }: Readonly<{ status: "done" | "in-progress" | "todo" }>) {
	if (status === "done") {
		return (
			<NodeIcon label="" size="small" color={token("color.icon.success")} />
		);
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

export function TaskTrackerCard({
	planTitle,
	planEmoji,
	taskStatusGroups,
	runStatus,
	runCreatedAt,
	runCompletedAt,
}: Readonly<TaskTrackerCardProps>) {
	const isExpanded = true;
	const [nowMs, setNowMs] = useState(() => Date.now());

	useEffect(() => {
		if (runStatus !== "running" || !runCreatedAt) {
			return;
		}

		const intervalId = setInterval(() => {
			setNowMs(Date.now());
		}, 1000);

		return () => clearInterval(intervalId);
	}, [runCreatedAt, runStatus]);

	const elapsedSeconds = useMemo(
		() => getElapsedSeconds(runCreatedAt, runCompletedAt, nowMs),
		[nowMs, runCompletedAt, runCreatedAt]
	);

	const totalDone = taskStatusGroups.done.length;
	const totalInReview = taskStatusGroups.inReview.length;
	const totalInProgress = taskStatusGroups.inProgress.length;
	const totalTodo = taskStatusGroups.todo.length;
	const runStatusLabel = getRunStatusLabel(runStatus);
	const runStatusToneClass = getRunStatusToneClass(runStatus);
	const totalRuns = totalDone + totalInReview + totalInProgress;

	return (
		<div className="flex w-full flex-col px-3">
			<div className="px-1.5 py-2">
				<span style={{ font: token("font.heading.xxsmall") }} className="text-text-subtlest">
					{runStatus === "running" ? "Running" : "Execution"}
				</span>
			</div>

			<div className="overflow-hidden rounded-2xl bg-surface shadow-sm">
				<div className="flex flex-col gap-3 px-4 py-3">
					<div className="flex items-center justify-between">
						<div className="flex min-w-0 items-center gap-3">
							<div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-bg-neutral">
								<span className="text-base leading-5 text-text-subtle">
									{planEmoji}
								</span>
							</div>
							<div className="min-w-0">
								<span
									style={{ font: token("font.heading.xsmall") }}
									className="block truncate text-text"
								>
									{planTitle}
								</span>
								<span className="text-xs leading-4 text-text-subtlest">
									Time taken {formatElapsedTime(elapsedSeconds)}
								</span>
							</div>
						</div>
						<Button
							aria-label="Stop execution"
							size="icon-xs"
							variant="ghost"
							className="text-icon-danger"
						>
							<VideoStopOverlayIcon label="" size="small" />
						</Button>
					</div>

					<div className="h-px bg-border" />

					<div className="flex items-center gap-1">
						<span className="text-xs leading-4 text-text-subtlest">
							{totalRuns} runs
						</span>
						<span className="text-xs leading-4 text-text-subtlest">•</span>
						<SyncIcon label="" size="small" color={token("color.icon.subtle")} />
						<span className={`text-xs leading-4 ${runStatusToneClass}`}>
							{runStatusLabel}
						</span>
					</div>
				</div>

				{isExpanded ? (
					<div className="mx-1 mb-1 rounded-b-xl rounded-t-md bg-surface-sunken p-2">
						<div className="flex gap-1">
							<div className="flex w-5 shrink-0 flex-col items-center py-2.5">
								<TaskStatusIcon status={totalDone > 0 ? "done" : "todo"} />
								<div className="h-6 w-px border-l border-dashed border-border" />
								<TaskStatusIcon status={totalInReview > 0 ? "in-progress" : "todo"} />
								<div className="h-6 w-px border-l border-dashed border-border" />
								<TaskStatusIcon status={totalInProgress > 0 ? "in-progress" : "todo"} />
								<div className="h-6 w-px border-l border-dashed border-border" />
								<TaskStatusIcon status="todo" />
							</div>
							<div className="flex flex-1 flex-col gap-1 pl-2">
								<TaskGroupRow
									label="Done"
									count={totalDone}
									icon={null}
								/>
								<TaskGroupRow
									label="In Review"
									count={totalInReview}
									icon={null}
								/>
								<TaskGroupRow
									label="In Progress"
									count={totalInProgress}
									icon={null}
								/>
								<TaskGroupRow
									label="Tasks"
									count={totalTodo}
									icon={null}
								/>
							</div>
						</div>
					</div>
				) : null}
			</div>
		</div>
	);
}
