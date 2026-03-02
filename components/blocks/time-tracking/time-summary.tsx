"use client";

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
}

export function TimeSummary({
	entries,
	projects,
	selectedDate,
	weeklyTargetHours,
}: TimeSummaryProps) {
	const dailyTotal = getDailyTotal(entries, selectedDate);
	const weeklyTotal = getWeeklyTotal(entries, selectedDate);
	const weekEntries = getEntriesForWeek(entries, selectedDate);
	const projectTotals = getProjectTotals(weekEntries, projects);
	const weeklyPercent = Math.min(
		100,
		Math.round((weeklyTotal / weeklyTargetHours) * 100),
	);

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

			{/* Weekly total + progress */}
			<div className="flex flex-col gap-2">
				<div className="flex items-center justify-between">
					<span className="text-sm text-text-subtle">This week</span>
					<span className="text-sm font-semibold text-text">
						{weeklyTotal}h{" "}
						<span className="font-normal text-text-subtlest">
							/ {weeklyTargetHours}h
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
				<div className="flex flex-col gap-2 border-t border-border-subtle pt-3">
					<span className="text-xs font-medium uppercase text-text-subtlest">
						By project
					</span>
					{projectTotals.map(({ project, hours }) => (
						<div
							key={project.id}
							className="flex items-center justify-between"
						>
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
					))}
				</div>
			) : null}
		</div>
	);
}
