"use client";

import { useState, useEffect } from "react";
import ChevronDownIcon from "@atlaskit/icon/core/chevron-down";
import ChevronRightIcon from "@atlaskit/icon/core/chevron-right";
import CrossIcon from "@atlaskit/icon/core/cross";
import PlayIcon from "@atlaskit/icon/core/video-play";
import StopIcon from "@atlaskit/icon/core/video-stop";
import LinkExternalIcon from "@atlaskit/icon/core/link-external";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Lozenge } from "@/components/ui/lozenge";
import type {
	TimeEntry,
	Project,
	Task,
	ProjectGroup,
	ActiveTimer,
} from "@/lib/time-tracking-types";
import {
	getTaskHoursForDate,
	getDailyTotal,
	buildProjectGroups,
} from "@/lib/time-tracking-data";

// ── Props ────────────────────────────────────────────────────────────────

interface DailyViewProps {
	date: string;
	entries: TimeEntry[];
	projects: Project[];
	tasks: Task[];
	expandedProjects: Record<string, boolean>;
	onToggleProject: (projectId: string) => void;
	onHoursChange: (taskId: string, projectId: string, date: string, hours: number) => void;
	onDeleteTask: (taskId: string) => void;
	/** Currently running timer (if any). */
	activeTimer: ActiveTimer | null;
	/** Start a timer for a given task. */
	onStartTimer: (taskId: string, projectId: string) => void;
	/** Stop the running timer and log the elapsed time. */
	onStopTimer: () => void;
}

// ── Helpers ──────────────────────────────────────────────────────────────

function formatHoursInput(value: number): string {
	return value > 0 ? String(value) : "";
}

function formatElapsed(seconds: number): string {
	const h = Math.floor(seconds / 3600);
	const m = Math.floor((seconds % 3600) / 60);
	const s = seconds % 60;
	const pad = (n: number) => String(n).padStart(2, "0");
	return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}

// ── DailyView ────────────────────────────────────────────────────────────

export function DailyView({
	date,
	entries,
	projects,
	tasks,
	expandedProjects,
	onToggleProject,
	onHoursChange,
	onDeleteTask,
	activeTimer,
	onStartTimer,
	onStopTimer,
}: DailyViewProps) {
	const dateObj = new Date(date + "T00:00:00");
	const dayLabel = new Intl.DateTimeFormat(undefined, {
		weekday: "long",
		month: "long",
		day: "numeric",
	}).format(dateObj);

	const isToday =
		new Date().toISOString().slice(0, 10) === date;

	const projectGroups = buildProjectGroups(projects, tasks, expandedProjects);
	const dailyTotal = getDailyTotal(entries, date);

	return (
		<div className="flex flex-col rounded-lg border border-border-subtle bg-surface">
			{/* Day header */}
			<div className="flex items-center gap-2 border-b border-border-subtle px-4 py-3">
				<h3 className="text-sm font-semibold text-text">{dayLabel}</h3>
				{isToday ? (
					<Lozenge variant="information" className="text-[10px]">
						Today
					</Lozenge>
				) : null}
			</div>

			{/* Table */}
			<div className="w-full">
				{/* Table header */}
				<div className="flex items-center border-b border-border-subtle bg-surface-raised px-4 py-2">
					<div className="min-w-0 flex-1 text-xs font-medium uppercase text-text-subtlest">
						Project / Task
					</div>
					<div className="w-16 text-center text-xs font-medium uppercase text-text-subtlest">
						Timer
					</div>
					<div className="w-24 text-center text-xs font-medium uppercase text-text-subtlest">
						Hours
					</div>
				</div>

				{/* Project groups */}
				{projectGroups.map((group) => (
					<ProjectGroupRows
						key={group.project.id}
						group={group}
						date={date}
						entries={entries}
						activeTimer={activeTimer}
						onToggle={() => onToggleProject(group.project.id)}
						onHoursChange={onHoursChange}
						onDeleteTask={onDeleteTask}
						onStartTimer={onStartTimer}
						onStopTimer={onStopTimer}
					/>
				))}

				{/* Daily total row */}
				<div className="flex items-center border-t-2 border-border bg-surface-raised px-4 py-2.5">
					<div className="flex-1 text-sm font-semibold text-text">
						Total
					</div>
					<div className="w-16" />
					<div className="w-24 text-center text-sm font-semibold text-text">
						{dailyTotal > 0 ? `${dailyTotal}h` : "—"}
					</div>
				</div>
			</div>
		</div>
	);
}

// ── Project group rows ───────────────────────────────────────────────────

function ProjectGroupRows({
	group,
	date,
	entries,
	activeTimer,
	onToggle,
	onHoursChange,
	onDeleteTask,
	onStartTimer,
	onStopTimer,
}: {
	group: ProjectGroup;
	date: string;
	entries: TimeEntry[];
	activeTimer: ActiveTimer | null;
	onToggle: () => void;
	onHoursChange: (taskId: string, projectId: string, date: string, hours: number) => void;
	onDeleteTask: (taskId: string) => void;
	onStartTimer: (taskId: string, projectId: string) => void;
	onStopTimer: () => void;
}) {
	const { project, tasks: groupTasks, expanded } = group;

	// Project total for the day
	const projectDayTotal = groupTasks.reduce(
		(sum, task) => sum + getTaskHoursForDate(entries, task.id, date),
		0,
	);

	const hasRunningTimer = groupTasks.some(
		(task) => activeTimer?.taskId === task.id,
	);

	return (
		<div>
			{/* Project header row */}
			<button
				type="button"
				onClick={onToggle}
				className="flex w-full items-center border-b border-border-subtle px-4 py-2 transition-colors hover:bg-bg-neutral-subtle-hovered"
			>
				<div className="flex min-w-0 flex-1 items-center gap-2">
					{expanded ? (
						<ChevronDownIcon label="" size="small" />
					) : (
						<ChevronRightIcon label="" size="small" />
					)}
					<span
						className={cn("size-2.5 rounded-full", project.color)}
					/>
					<span className="text-sm font-medium text-text">
						{project.name}
					</span>
					<span className="text-xs text-text-subtlest">
						({groupTasks.length} {groupTasks.length === 1 ? "task" : "tasks"})
					</span>
					{hasRunningTimer ? (
						<span className="relative ml-1 flex size-2">
							<span className="absolute inline-flex size-full animate-ping rounded-full bg-bg-success-bold opacity-75" />
							<span className="relative inline-flex size-2 rounded-full bg-bg-success-bold" />
						</span>
					) : null}
				</div>
				<div className="w-16" />
				<div className="w-24 text-center text-sm font-medium text-text-subtle">
					{projectDayTotal > 0 ? `${projectDayTotal}h` : "—"}
				</div>
			</button>

			{/* Task rows */}
			{expanded
				? groupTasks.map((task) => (
						<TaskRow
							key={task.id}
							task={task}
							projectId={project.id}
							date={date}
							entries={entries}
							activeTimer={activeTimer}
							onHoursChange={onHoursChange}
							onDeleteTask={onDeleteTask}
							onStartTimer={onStartTimer}
							onStopTimer={onStopTimer}
						/>
					))
				: null}
		</div>
	);
}

// ── Individual task row ──────────────────────────────────────────────────

function TaskRow({
	task,
	projectId,
	date,
	entries,
	activeTimer,
	onHoursChange,
	onDeleteTask,
	onStartTimer,
	onStopTimer,
}: {
	task: Task;
	projectId: string;
	date: string;
	entries: TimeEntry[];
	activeTimer: ActiveTimer | null;
	onHoursChange: (taskId: string, projectId: string, date: string, hours: number) => void;
	onDeleteTask: (taskId: string) => void;
	onStartTimer: (taskId: string, projectId: string) => void;
	onStopTimer: () => void;
}) {
	const currentHours = getTaskHoursForDate(entries, task.id, date);
	const [localValue, setLocalValue] = useState(formatHoursInput(currentHours));

	const isTimerRunning = activeTimer?.taskId === task.id;
	const isToday = new Date().toISOString().slice(0, 10) === date;

	const handleBlur = () => {
		const parsed = parseFloat(localValue);
		const newHours = isNaN(parsed) || parsed < 0 ? 0 : Math.round(parsed * 2) / 2; // snap to 0.5
		setLocalValue(formatHoursInput(newHours));
		if (newHours !== currentHours) {
			onHoursChange(task.id, projectId, date, newHours);
		}
	};

	const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
		if (e.key === "Enter") {
			e.currentTarget.blur();
		}
	};

	return (
		<div
			className={cn(
				"group/task flex items-center border-b border-border-subtle px-4 py-1.5 pl-11",
				isTimerRunning && "bg-bg-success-subtle",
			)}
		>
			{/* Task name + issue key */}
			<div className="flex min-w-0 flex-1 items-center gap-2 text-sm text-text">
				<span className="truncate">{task.name}</span>
				{task.issueKey ? (
					<a
						href={task.issueUrl ?? "#"}
						onClick={(e) => e.stopPropagation()}
						className="inline-flex shrink-0 items-center gap-0.5 rounded bg-bg-neutral-subtle px-1.5 py-0.5 text-[11px] font-medium text-text-subtle transition-colors hover:bg-bg-neutral-subtle-hovered hover:text-text-link"
						title={`View ${task.issueKey}`}
					>
						{task.issueKey}
						<LinkExternalIcon label="" size="small" />
					</a>
				) : null}
				<Button
					variant="ghost"
					size="icon"
					className="size-6 shrink-0 opacity-0 transition-opacity group-hover/task:opacity-100"
					onClick={() => onDeleteTask(task.id)}
				>
					<CrossIcon label="Delete task" size="small" />
				</Button>
			</div>

			{/* Timer button */}
			<div className="flex w-16 items-center justify-center">
				{isToday ? (
					isTimerRunning ? (
						<TimerDisplay
							startedAt={activeTimer.startedAt}
							onStop={onStopTimer}
						/>
					) : (
						<Button
							variant="ghost"
							size="icon"
							className="size-7 text-icon-subtle transition-colors hover:text-icon-success"
							onClick={() => onStartTimer(task.id, projectId)}
							title="Start timer"
						>
							<PlayIcon label="Start timer" size="small" />
						</Button>
					)
				) : (
					<span className="text-xs text-text-disabled">—</span>
				)}
			</div>

			{/* Manual hours input */}
			<div className="flex w-24 justify-center">
				<input
					type="number"
					min={0}
					max={24}
					step={0.5}
					value={localValue}
					onChange={(e) => setLocalValue(e.target.value)}
					onBlur={handleBlur}
					onKeyDown={handleKeyDown}
					placeholder="0"
					className="h-8 w-16 rounded-md border border-border-subtle bg-surface px-2 text-center text-sm text-text placeholder:text-text-subtlest focus:border-border-focused focus:outline-none focus:ring-1 focus:ring-border-focused"
				/>
			</div>
		</div>
	);
}

// ── Timer display with live elapsed time ─────────────────────────────────

function computeElapsed(startedAt: string): number {
	return Math.max(0, Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000));
}

function TimerDisplay({
	startedAt,
	onStop,
}: {
	startedAt: string;
	onStop: () => void;
}) {
	const [elapsed, setElapsed] = useState(() => computeElapsed(startedAt));

	useEffect(() => {
		const id = setInterval(() => {
			setElapsed(computeElapsed(startedAt));
		}, 1000);
		return () => clearInterval(id);
	}, [startedAt]);

	return (
		<div className="flex items-center gap-1">
			<span className="text-[11px] font-mono font-medium tabular-nums text-text-success">
				{formatElapsed(elapsed)}
			</span>
			<Button
				variant="ghost"
				size="icon"
				className="size-6 text-icon-danger transition-colors hover:bg-bg-danger-subtle-hovered"
				onClick={onStop}
				title="Stop timer"
			>
				<StopIcon label="Stop timer" size="small" />
			</Button>
		</div>
	);
}
