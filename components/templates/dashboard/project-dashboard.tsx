"use client";

import { useState } from "react";
import { KanbanBoard } from "@/components/blocks/dashboard/kanban-board";
import { StatusChart } from "@/components/blocks/dashboard/status-chart";
import { TEAM_MEMBERS, SAMPLE_TASKS, type TaskPriority } from "@/app/data/dashboard-sample";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TextField } from "@/components/ui/text-field";

/**
 * ProjectDashboard template component
 *
 * Composes:
 * - Page header with title and description
 * - Status metrics row (Total, To Do, In Progress, Done)
 * - Main grid with kanban board (left) and status chart (right) on desktop
 * - Stacked layout on mobile (kanban above chart)
 */
export function ProjectDashboard() {
	const [selectedAssignee, setSelectedAssignee] = useState<string>("");
	const [selectedPriorities, setSelectedPriorities] = useState<TaskPriority[]>([]);
	const [searchText, setSearchText] = useState<string>("");

	// Build filter function from filter state
	const filterFn = (task: typeof SAMPLE_TASKS[0]) => {
		// Assignee filter
		if (selectedAssignee && task.assigneeId !== selectedAssignee) {
			return false;
		}

		// Priority filter
		if (selectedPriorities.length > 0 && !selectedPriorities.includes(task.priority)) {
			return false;
		}

		// Search filter (case-insensitive on summary and ID)
		if (searchText) {
			const searchLower = searchText.toLowerCase();
			const matches =
				task.summary.toLowerCase().includes(searchLower) ||
				task.id.toLowerCase().includes(searchLower);
			if (!matches) {
				return false;
			}
		}

		return true;
	};

	// Calculate displayed task counts based on filter
	const filteredTasks = SAMPLE_TASKS.filter(filterFn);
	const stats = {
		total: filteredTasks.length,
		todo: filteredTasks.filter((t) => t.status === "todo").length,
		inprogress: filteredTasks.filter((t) => t.status === "inprogress").length,
		done: filteredTasks.filter((t) => t.status === "done").length,
	};

	return (
		<div className="flex flex-col gap-8 px-4 py-8 sm:px-6 lg:px-8">
			{/* Page Header */}
			<div className="flex flex-col gap-2">
				<h1 className="text-2xl font-semibold text-text">Project Dashboard</h1>
				<p className="text-sm text-text-subtle">Track tasks, assignments, and team progress</p>
			</div>

			{/* Filter Controls */}
			<div className="flex flex-col gap-4 rounded-lg border border-border bg-bg-neutral-subtle p-4">
				<div className="flex flex-col gap-1">
					<h2 className="text-sm font-medium text-text">Filter Tasks</h2>
					<p className="text-xs text-text-subtle">Narrow down by assignee, priority, or search</p>
				</div>

				<div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
					{/* Assignee Select */}
					<div className="flex flex-col gap-2">
						<label className="text-xs font-medium text-text-subtle">Assignee</label>
						<Select
							value={selectedAssignee}
							onValueChange={(value) => value !== null && setSelectedAssignee(value)}
						>
							<SelectTrigger>
								<SelectValue placeholder="All team members" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="">All team members</SelectItem>
								{TEAM_MEMBERS.map((member) => (
									<SelectItem key={member.id} value={member.id}>
										{member.name}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>

					{/* Priority Toggles */}
					<div className="flex flex-col gap-2">
						<label className="text-xs font-medium text-text-subtle">Priority</label>
						<div className="flex gap-1">
							{(["Low", "Medium", "High"] as TaskPriority[]).map((priority) => (
								<button
									key={priority}
									type="button"
									onClick={() => {
										setSelectedPriorities((prev) =>
											prev.includes(priority)
												? prev.filter((p) => p !== priority)
												: [...prev, priority],
										);
									}}
									className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
										selectedPriorities.includes(priority)
											? "bg-bg-selected text-text-selected"
											: "bg-bg-neutral-subtle text-text hover:bg-bg-neutral-subtle-hovered"
									}`}
								>
									{priority === "Medium" ? "Med" : priority}
								</button>
							))}
						</div>
					</div>

					{/* Search Input */}
					<div className="flex flex-col gap-2">
						<label className="text-xs font-medium text-text-subtle">Search</label>
						<TextField
							type="text"
							placeholder="Task name or ID..."
							value={searchText}
							onChange={(e) => setSearchText(e.target.value)}
						/>
					</div>
				</div>
			</div>

			{/* Status Metrics Row */}
			<div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
				<MetricCard label="Total Tasks" value={stats.total} />
				<MetricCard label="To Do" value={stats.todo} />
				<MetricCard label="In Progress" value={stats.inprogress} />
				<MetricCard label="Done" value={stats.done} />
			</div>

			{/* Kanban Board + Chart Grid */}
			<div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
				{/* Kanban Board - Takes 2 columns on desktop */}
				<div className="lg:col-span-2">
					<div className="flex flex-col gap-4">
						<div className="flex flex-col gap-1">
							<h2 className="text-lg font-medium text-text">Tasks</h2>
							<p className="text-sm text-text-subtle">
								{filteredTasks.length} item{filteredTasks.length !== 1 ? "s" : ""} shown
							</p>
						</div>
						<KanbanBoard filterFn={filterFn} />
					</div>
				</div>

				{/* Status Chart - Takes 1 column on desktop */}
				<div className="lg:col-span-1">
					<div className="flex flex-col gap-6">
						<StatusChart filterFn={filterFn} />
					</div>
				</div>
			</div>
		</div>
	);
}

/**
 * MetricCard component for displaying a single metric
 */
function MetricCard({ label, value }: { label: string; value: number }) {
	return (
		<div className="flex flex-col gap-2 rounded-lg border border-border bg-bg-neutral-subtle p-4">
			<p className="text-xs font-medium text-text-subtle">{label}</p>
			<p className="text-2xl font-bold text-text">{value}</p>
		</div>
	);
}
