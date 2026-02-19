"use client";

import { ProgressBar } from "@/components/ui/progress-bar";
import { type Task } from "../types";

interface SprintMetricsProps {
	tasks: Task[];
}

export function SprintMetrics({ tasks }: SprintMetricsProps) {
	const totalTasks = tasks.length;
	const completedTasks = tasks.filter(t => t.status === "done").length;
	const inProgressTasks = tasks.filter(t => t.status === "in-progress").length;

	const totalPoints = tasks.reduce((sum, t) => sum + (t.storyPoints || 0), 0);
	const completedPoints = tasks
		.filter(t => t.status === "done")
		.reduce((sum, t) => sum + (t.storyPoints || 0), 0);

	const completionPercentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
	const pointsPercentage = totalPoints > 0 ? Math.round((completedPoints / totalPoints) * 100) : 0;

	const metrics = [
		{
			label: "Tasks Completed",
			value: completedTasks,
			total: totalTasks,
			percentage: completionPercentage,
		},
		{
			label: "Story Points",
			value: completedPoints,
			total: totalPoints,
			percentage: pointsPercentage,
		},
		{
			label: "In Progress",
			value: inProgressTasks,
			total: totalTasks,
			percentage: Math.round((inProgressTasks / totalTasks) * 100),
		},
		{
			label: "Velocity",
			value: totalPoints > 0 ? (completedPoints / totalTasks).toFixed(1) : "0",
			unit: "pts/task",
		},
	];

	return (
		<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
			{metrics.map((metric, idx) => (
				<div key={idx} className="bg-bg-neutral rounded-lg p-4 border border-border-neutral">
					<div className="flex items-center justify-between mb-2">
						<p className="text-sm font-medium text-text-subtle">{metric.label}</p>
						<span className="text-lg font-bold text-text">
							{metric.value}
							{metric.unit && <span className="text-xs text-text-subtle ml-1">{metric.unit}</span>}
						</span>
					</div>
					{metric.total !== undefined && (
						<>
							<ProgressBar value={metric.percentage} className="mb-2" />
							<p className="text-xs text-text-subtle">
								{metric.percentage}% complete
								{metric.total && ` (${metric.value}/${metric.total})`}
							</p>
						</>
					)}
				</div>
			))}
		</div>
	);
}
