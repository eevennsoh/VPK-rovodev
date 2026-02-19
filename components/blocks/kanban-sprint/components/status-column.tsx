"use client";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import AddIcon from "@atlaskit/icon/core/add";
import { TaskCard } from "./task-card";
import { type StatusType, type Task } from "../types";

interface StatusColumnProps {
	status: StatusType;
	tasks: Task[];
	onDragStart: (task: Task) => void;
	onDrop: () => void;
	draggedTask: Task | null;
}

const statusConfig: Record<StatusType, { label: string; color: string; bgColor: string }> = {
	backlog: { label: "Backlog", color: "bg-surface", bgColor: "bg-surface" },
	todo: { label: "To Do", color: "bg-bg-warning-bold", bgColor: "bg-bg-warning" },
	"in-progress": { label: "In Progress", color: "bg-bg-information-bold", bgColor: "bg-bg-information" },
	review: { label: "Review", color: "bg-bg-selected-bold", bgColor: "bg-bg-selected" },
	done: { label: "Done", color: "bg-bg-success-bold", bgColor: "bg-bg-success" },
};

export function StatusColumn({
	status,
	tasks,
	onDragStart,
	onDrop,
	draggedTask,
}: StatusColumnProps) {
	const config = statusConfig[status];

	const handleDragOver = (e: React.DragEvent) => {
		e.preventDefault();
		e.currentTarget.classList.add("ring-2", "ring-offset-2", "ring-border-bold");
	};

	const handleDragLeave = (e: React.DragEvent) => {
		e.currentTarget.classList.remove("ring-2", "ring-offset-2", "ring-border-bold");
	};

	const handleDrop = (e: React.DragEvent) => {
		e.preventDefault();
		e.currentTarget.classList.remove("ring-2", "ring-offset-2", "ring-border-bold");
		onDrop();
	};

	return (
		<div
			className="flex flex-col gap-4 rounded-lg bg-bg-neutral p-4 w-80 min-h-96"
			onDragOver={handleDragOver}
			onDragLeave={handleDragLeave}
			onDrop={handleDrop}
		>
			{/* Column Header */}
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-2">
					<div className={cn("w-3 h-3 rounded-full", config.color)} />
					<h3 className="font-semibold text-text">{config.label}</h3>
					<Badge variant="secondary">{tasks.length}</Badge>
				</div>
			</div>

			{/* Tasks Container */}
			<div className="flex flex-col gap-3 flex-1 overflow-y-auto">
				{tasks.map(task => (
					<TaskCard
						key={task.id}
						task={task}
						onDragStart={() => onDragStart(task)}
						isDragging={draggedTask?.id === task.id}
					/>
				))}

				{tasks.length === 0 && (
					<div className="flex items-center justify-center h-24 text-text-subtle text-sm">
						No tasks
					</div>
				)}
			</div>

			{/* Add Task Button */}
			<Button variant="secondary" size="sm" className="w-full justify-start">
				<AddIcon label="" size="small" />
				Add task
			</Button>
		</div>
	);
}
