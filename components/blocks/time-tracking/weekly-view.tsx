"use client";

import { useState } from "react";
import { format, parseISO } from "date-fns";
import ChevronDownIcon from "@atlaskit/icon/core/chevron-down";
import ChevronRightIcon from "@atlaskit/icon/core/chevron-right";
import { cn } from "@/lib/utils";
import type {
	TimeEntry,
	Project,
	Task,
	ProjectGroup,
} from "@/lib/time-tracking-types";
import {
	getWeekDays,
	getTaskHoursForDate,
	getTaskWeeklyTotal,
	getDailyTotal,
	getWeeklyTotal,
	buildProjectGroups,
} from "@/lib/time-tracking-data";

interface WeeklyViewProps {
	anchorDate: string;
	entries: TimeEntry[];
	projects: Project[];
	tasks: Task[];
	expandedProjects: Record<string, boolean>;
	onToggleProject: (projectId: string) => void;
	onHoursChange: (taskId: string, projectId: string, date: string, hours: number) => void;
}

export function WeeklyView({
	anchorDate,
	entries,
	projects,
	tasks,
	expandedProjects,
	onToggleProject,
	onHoursChange,
}: WeeklyViewProps) {
	const weekDays = getWeekDays(anchorDate);
	const weeklyTotal = getWeeklyTotal(entries, anchorDate);
	const projectGroups = buildProjectGroups(projects, tasks, expandedProjects);

	return (
		<div className="flex flex-col rounded-lg border border-border-subtle bg-surface">
			{/* Table header */}
			<div className="flex items-center border-b border-border-subtle bg-surface-raised">
				{/* Task name column */}
				<div className="min-w-[200px] flex-1 px-4 py-2 text-xs font-medium uppercase text-text-subtlest">
					Project / Task
				</div>

				{/* Day columns */}
				{weekDays.map((day) => {
					const dateObj = parseISO(day);
					const isToday = format(new Date(), "yyyy-MM-dd") === day;

					return (
						<div
							key={day}
							className={cn(
								"w-20 px-1 py-2 text-center",
								isToday && "bg-bg-selected-subtle",
							)}
						>
							<div className="text-[10px] font-medium uppercase text-text-subtlest">
								{format(dateObj, "EEE")}
							</div>
							<div
								className={cn(
									"text-xs font-semibold",
									isToday ? "text-text-selected" : "text-text",
								)}
							>
								{format(dateObj, "d")}
							</div>
						</div>
					);
				})}

				{/* Row total column */}
				<div className="w-20 px-2 py-2 text-center text-xs font-medium uppercase text-text-subtlest">
					Total
				</div>
			</div>

			{/* Project groups */}
			{projectGroups.map((group) => (
				<WeeklyProjectGroup
					key={group.project.id}
					group={group}
					weekDays={weekDays}
					entries={entries}
					anchorDate={anchorDate}
					onToggle={() => onToggleProject(group.project.id)}
					onHoursChange={onHoursChange}
				/>
			))}

			{/* Daily totals footer row */}
			<div className="flex items-center border-t-2 border-border bg-surface-raised">
				<div className="min-w-[200px] flex-1 px-4 py-2.5 text-sm font-semibold text-text">
					Total
				</div>
				{weekDays.map((day) => {
					const dayTotal = getDailyTotal(entries, day);
					const isToday = format(new Date(), "yyyy-MM-dd") === day;

					return (
						<div
							key={day}
							className={cn(
								"w-20 px-1 py-2.5 text-center text-sm font-semibold text-text",
								isToday && "bg-bg-selected-subtle",
							)}
						>
							{dayTotal > 0 ? `${dayTotal}h` : "—"}
						</div>
					);
				})}
				<div className="w-20 px-2 py-2.5 text-center text-sm font-bold text-text">
					{weeklyTotal > 0 ? `${weeklyTotal}h` : "—"}
				</div>
			</div>
		</div>
	);
}

// ── Weekly project group ─────────────────────────────────────────────────

function WeeklyProjectGroup({
	group,
	weekDays,
	entries,
	anchorDate,
	onToggle,
	onHoursChange,
}: {
	group: ProjectGroup;
	weekDays: string[];
	entries: TimeEntry[];
	anchorDate: string;
	onToggle: () => void;
	onHoursChange: (taskId: string, projectId: string, date: string, hours: number) => void;
}) {
	const { project, tasks: groupTasks, expanded } = group;

	// Project total for the week
	const projectWeekTotal = groupTasks.reduce(
		(sum, task) => sum + getTaskWeeklyTotal(entries, task.id, anchorDate),
		0,
	);

	return (
		<div>
			{/* Project header */}
			<button
				type="button"
				onClick={onToggle}
				className="flex w-full items-center border-b border-border-subtle transition-colors hover:bg-bg-neutral-subtle-hovered"
			>
				<div className="flex min-w-[200px] flex-1 items-center gap-2 px-4 py-2">
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
				</div>

				{/* Empty day cells for project row */}
				{weekDays.map((day) => {
					const isToday = format(new Date(), "yyyy-MM-dd") === day;
					const dayProjectTotal = groupTasks.reduce(
						(sum, task) => sum + getTaskHoursForDate(entries, task.id, day),
						0,
					);

					return (
						<div
							key={day}
							className={cn(
								"w-20 px-1 py-2 text-center text-xs font-medium text-text-subtle",
								isToday && "bg-bg-selected-subtle/50",
							)}
						>
							{dayProjectTotal > 0 ? `${dayProjectTotal}h` : ""}
						</div>
					);
				})}

				<div className="w-20 px-2 py-2 text-center text-sm font-medium text-text-subtle">
					{projectWeekTotal > 0 ? `${projectWeekTotal}h` : "—"}
				</div>
			</button>

			{/* Task rows */}
			{expanded
				? groupTasks.map((task) => (
						<WeeklyTaskRow
							key={task.id}
							task={task}
							projectId={project.id}
							weekDays={weekDays}
							entries={entries}
							anchorDate={anchorDate}
							onHoursChange={onHoursChange}
						/>
					))
				: null}
		</div>
	);
}

// ── Weekly task row ──────────────────────────────────────────────────────

function WeeklyTaskRow({
	task,
	projectId,
	weekDays,
	entries,
	anchorDate,
	onHoursChange,
}: {
	task: Task;
	projectId: string;
	weekDays: string[];
	entries: TimeEntry[];
	anchorDate: string;
	onHoursChange: (taskId: string, projectId: string, date: string, hours: number) => void;
}) {
	const taskWeekTotal = getTaskWeeklyTotal(entries, task.id, anchorDate);

	return (
		<div className="flex items-center border-b border-border-subtle">
			{/* Task name */}
			<div className="min-w-[200px] flex-1 py-1.5 pl-11 pr-4 text-sm text-text">
				{task.name}
			</div>

			{/* Day cells */}
			{weekDays.map((day) => {
				const isToday = format(new Date(), "yyyy-MM-dd") === day;

				return (
					<WeeklyHourCell
						key={day}
						taskId={task.id}
						projectId={projectId}
						date={day}
						entries={entries}
						isToday={isToday}
						onHoursChange={onHoursChange}
					/>
				);
			})}

			{/* Row total */}
			<div className="w-20 px-2 py-1.5 text-center text-sm font-medium text-text-subtle">
				{taskWeekTotal > 0 ? `${taskWeekTotal}h` : "—"}
			</div>
		</div>
	);
}

// ── Single hour input cell ───────────────────────────────────────────────

function WeeklyHourCell({
	taskId,
	projectId,
	date,
	entries,
	isToday,
	onHoursChange,
}: {
	taskId: string;
	projectId: string;
	date: string;
	entries: TimeEntry[];
	isToday: boolean;
	onHoursChange: (taskId: string, projectId: string, date: string, hours: number) => void;
}) {
	const currentHours = getTaskHoursForDate(entries, taskId, date);
	const [localValue, setLocalValue] = useState(
		currentHours > 0 ? String(currentHours) : "",
	);

	const handleBlur = () => {
		const parsed = parseFloat(localValue);
		const newHours =
			isNaN(parsed) || parsed < 0 ? 0 : Math.round(parsed * 2) / 2;
		setLocalValue(newHours > 0 ? String(newHours) : "");
		if (newHours !== currentHours) {
			onHoursChange(taskId, projectId, date, newHours);
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
				"flex w-20 justify-center px-1 py-1",
				isToday && "bg-bg-selected-subtle/50",
			)}
		>
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
				className="h-7 w-14 rounded-md border border-border-subtle bg-surface px-1 text-center text-xs text-text placeholder:text-text-subtlest focus:border-border-focused focus:outline-none focus:ring-1 focus:ring-border-focused"
			/>
		</div>
	);
}
