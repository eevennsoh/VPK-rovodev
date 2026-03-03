"use client";

import { useState } from "react";
import ChevronDownIcon from "@atlaskit/icon/core/chevron-down";
import ChevronRightIcon from "@atlaskit/icon/core/chevron-right";
import CrossIcon from "@atlaskit/icon/core/cross";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import type {
	TimeEntry,
	Project,
	Task,
	ProjectGroup,
} from "@/lib/time-tracking-types";
import {
	getTaskHoursForDate,
	getDailyTotal,
	buildProjectGroups,
} from "@/lib/time-tracking-data";

interface DailyViewProps {
	date: string;
	entries: TimeEntry[];
	projects: Project[];
	tasks: Task[];
	expandedProjects: Record<string, boolean>;
	onToggleProject: (projectId: string) => void;
	onHoursChange: (taskId: string, projectId: string, date: string, hours: number) => void;
	onDeleteTask: (taskId: string) => void;
}

function formatHoursInput(value: number): string {
	return value > 0 ? String(value) : "";
}

export function DailyView({
	date,
	entries,
	projects,
	tasks,
	expandedProjects,
	onToggleProject,
	onHoursChange,
	onDeleteTask,
}: DailyViewProps) {
	const dateObj = new Date(date + "T00:00:00");
	const dayLabel = new Intl.DateTimeFormat(undefined, {
		weekday: "long",
		month: "long",
		day: "numeric",
	}).format(dateObj);

	const projectGroups = buildProjectGroups(projects, tasks, expandedProjects);
	const dailyTotal = getDailyTotal(entries, date);

	return (
		<div className="flex flex-col rounded-lg border border-border-subtle bg-surface">
			{/* Day header */}
			<div className="border-b border-border-subtle px-4 py-3">
				<h3 className="text-sm font-semibold text-text">{dayLabel}</h3>
			</div>

			{/* Table */}
			<div className="w-full">
				{/* Table header */}
				<div className="flex items-center border-b border-border-subtle bg-surface-raised px-4 py-2">
					<div className="flex-1 text-xs font-medium uppercase text-text-subtlest">
						Project / Task
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
						onToggle={() => onToggleProject(group.project.id)}
						onHoursChange={onHoursChange}
						onDeleteTask={onDeleteTask}
					/>
				))}

				{/* Daily total row */}
				<div className="flex items-center border-t-2 border-border bg-surface-raised px-4 py-2.5">
					<div className="flex-1 text-sm font-semibold text-text">
						Total
					</div>
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
	onToggle,
	onHoursChange,
	onDeleteTask,
}: {
	group: ProjectGroup;
	date: string;
	entries: TimeEntry[];
	onToggle: () => void;
	onHoursChange: (taskId: string, projectId: string, date: string, hours: number) => void;
	onDeleteTask: (taskId: string) => void;
}) {
	const { project, tasks: groupTasks, expanded } = group;

	// Project total for the day
	const projectDayTotal = groupTasks.reduce(
		(sum, task) => sum + getTaskHoursForDate(entries, task.id, date),
		0,
	);

	return (
		<div>
			{/* Project header row */}
			<button
				type="button"
				onClick={onToggle}
				className="flex w-full items-center border-b border-border-subtle px-4 py-2 transition-colors hover:bg-bg-neutral-subtle-hovered"
			>
				<div className="flex flex-1 items-center gap-2">
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
				</div>
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
							onHoursChange={onHoursChange}
							onDeleteTask={onDeleteTask}
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
	onHoursChange,
	onDeleteTask,
}: {
	task: Task;
	projectId: string;
	date: string;
	entries: TimeEntry[];
	onHoursChange: (taskId: string, projectId: string, date: string, hours: number) => void;
	onDeleteTask: (taskId: string) => void;
}) {
	const currentHours = getTaskHoursForDate(entries, task.id, date);
	const [localValue, setLocalValue] = useState(formatHoursInput(currentHours));

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
		<div className="group/task flex items-center border-b border-border-subtle px-4 py-1.5 pl-11">
			<div className="flex flex-1 items-center gap-1 text-sm text-text">
				{task.name}
				<Button
					variant="ghost"
					size="icon"
					className="size-6 opacity-0 transition-opacity group-hover/task:opacity-100"
					onClick={() => onDeleteTask(task.id)}
				>
					<CrossIcon label="Delete task" size="small" />
				</Button>
			</div>
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
