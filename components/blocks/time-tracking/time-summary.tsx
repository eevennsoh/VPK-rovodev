"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import type { TimeEntry, Project } from "@/lib/time-tracking-types";
import {
	getDailyTotal,
	getWeeklyTotal,
	getEntriesForWeek,
	getProjectTotals,
} from "@/lib/time-tracking-data";

interface TimeSummaryProps {
	entries: TimeEntry[];
	projects: Project[];
	selectedDate: string;
	weeklyTargetHours: number;
	onTargetHoursChange?: (hours: number) => void;
}

export function TimeSummary({
	entries,
	projects,
	selectedDate,
	weeklyTargetHours,
	onTargetHoursChange,
}: TimeSummaryProps) {
	const dailyTotal = getDailyTotal(entries, selectedDate);
	const weeklyTotal = getWeeklyTotal(entries, selectedDate);
	const weekEntries = getEntriesForWeek(entries, selectedDate);
	const projectTotals = getProjectTotals(weekEntries, projects);
	const weeklyPercent = weeklyTargetHours > 0
		? Math.min(100, Math.round((weeklyTotal / weeklyTargetHours) * 100))
		: 0;

	// Count unique days with logged entries this week
	const loggedDays = new Set(weekEntries.map((e) => e.date)).size;
	const dailyAverage = loggedDays > 0 ? Math.round((weeklyTotal / loggedDays) * 10) / 10 : 0;
	const topProjectHours = projectTotals.length > 0 ? projectTotals[0].hours : 0;

	return (
		<div className="flex flex-col gap-4 rounded-lg border border-border-subtle bg-surface p-4">
			<h3 className="text-sm font-semibold text-text">Summary</h3>

			{/* Daily total */}
			<div className="flex items-center justify-between">
				<span className="text-sm text-text-subtle">Today</span>
				<span className="text-sm font-semibold text-text">
					{dailyTotal}h
				</span>
			</div>

			{/* Daily average + logged days */}
			<div className="flex items-center justify-between">
				<span className="text-sm text-text-subtle">Daily avg</span>
				<span className="text-sm font-semibold text-text">
					{dailyAverage}h
					<span className="font-normal text-text-subtlest">
						{" "}({loggedDays} {loggedDays === 1 ? "day" : "days"})
					</span>
				</span>
			</div>

			{/* Weekly total + progress */}
			<div className="flex flex-col gap-2">
				<div className="flex items-center justify-between">
					<span className="text-sm text-text-subtle">This week</span>
					<span className="text-sm font-semibold text-text">
						{weeklyTotal}h{" "}
						<span className="font-normal text-text-subtlest">
							/ <TargetHoursInput value={weeklyTargetHours} onChange={onTargetHoursChange} />
						</span>
					</span>
				</div>
				<div className="h-2 w-full overflow-hidden rounded-full bg-bg-neutral">
					<div
						className={cn(
							"h-full rounded-full transition-all duration-500",
							weeklyPercent >= 100
								? "bg-bg-success-bold"
								: weeklyPercent >= 75
									? "bg-bg-brand-bold"
									: "bg-bg-warning-bold",
						)}
						style={{ width: `${weeklyPercent}%` }}
					/>
				</div>
				<span className="text-[11px] text-text-subtlest">
					{weeklyPercent}% of weekly target
				</span>
			</div>

			{/* Project breakdown */}
			{projectTotals.length > 0 ? (
				<div className="flex flex-col gap-3 border-t border-border-subtle pt-3">
					<span className="text-xs font-medium uppercase text-text-subtlest">
						By project
					</span>
					{projectTotals.map(({ project, hours }) => {
						const percent = topProjectHours > 0
							? Math.round((hours / topProjectHours) * 100)
							: 0;
						return (
							<div key={project.id} className="flex flex-col gap-1">
								<div className="flex items-center justify-between">
									<div className="flex items-center gap-2">
										<span
											className={cn(
												"size-2.5 rounded-full",
												project.color,
											)}
										/>
										<span className="text-sm text-text">
											{project.name}
										</span>
									</div>
									<span className="text-sm font-medium text-text-subtle">
										{hours}h
									</span>
								</div>
								<div className="h-1.5 w-full overflow-hidden rounded-full bg-bg-neutral">
									<div
										className={cn(
											"h-full rounded-full transition-all duration-500",
											project.color,
										)}
										style={{ width: `${percent}%` }}
									/>
								</div>
							</div>
						);
					})}
				</div>
			) : null}
		</div>
	);
}

// ── Inline editable target hours ─────────────────────────────────────────

function TargetHoursInput({
	value,
	onChange,
}: {
	value: number;
	onChange?: (hours: number) => void;
}) {
	const [isEditing, setIsEditing] = useState(false);
	const [localValue, setLocalValue] = useState(String(value));

	const handleBlur = () => {
		setIsEditing(false);
		const parsed = parseFloat(localValue);
		const newHours = isNaN(parsed) || parsed < 1 ? 1 : Math.round(parsed * 2) / 2;
		setLocalValue(String(newHours));
		if (newHours !== value) {
			onChange?.(newHours);
		}
	};

	const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
		if (e.key === "Enter") {
			e.currentTarget.blur();
		} else if (e.key === "Escape") {
			setLocalValue(String(value));
			setIsEditing(false);
		}
	};

	if (!isEditing) {
		return (
			<button
				type="button"
				onClick={() => {
					setLocalValue(String(value));
					setIsEditing(true);
				}}
				className="cursor-pointer border-b border-dashed border-border-subtle text-text-subtlest transition-colors hover:border-border hover:text-text-subtle"
				title="Click to edit weekly target"
			>
				{value}h
			</button>
		);
	}

	return (
		<input
			type="number"
			min={1}
			max={168}
			step={0.5}
			value={localValue}
			onChange={(e) => setLocalValue(e.target.value)}
			onBlur={handleBlur}
			onKeyDown={handleKeyDown}
			autoFocus
			className="inline-block h-5 w-10 rounded border border-border-focused bg-surface px-0.5 text-center text-sm text-text focus:outline-none focus:ring-1 focus:ring-border-focused"
		/>
	);
}
