"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import ChevronDownIcon from "@atlaskit/icon/core/chevron-down";
import AddIcon from "@atlaskit/icon/core/add";
import { SprintMetrics } from "./components/sprint-metrics";
import { StatusColumn } from "./components/status-column";
import { type StatusType, type Task } from "./types";
import { MOCK_TASKS } from "./data/mock-tasks";

export function SprintKanbanBoard() {
	const [tasks, setTasks] = useState<Task[]>(MOCK_TASKS);
	const [draggedTask, setDraggedTask] = useState<Task | null>(null);

	const statuses: StatusType[] = ["backlog", "todo", "in-progress", "review", "done"];

	const handleTaskMove = (task: Task, newStatus: StatusType) => {
		setTasks(tasks.map(t => (t.id === task.id ? { ...t, status: newStatus } : t)));
	};

	const handleDragStart = (task: Task) => {
		setDraggedTask(task);
	};

	const handleDrop = (status: StatusType) => {
		if (draggedTask) {
			handleTaskMove(draggedTask, status);
			setDraggedTask(null);
		}
	};

	const tasksByStatus = {
		backlog: tasks.filter(t => t.status === "backlog"),
		todo: tasks.filter(t => t.status === "todo"),
		"in-progress": tasks.filter(t => t.status === "in-progress"),
		review: tasks.filter(t => t.status === "review"),
		done: tasks.filter(t => t.status === "done"),
	};

	return (
		<div className="min-h-screen bg-bg-neutral">
			{/* Header */}
			<div className="border-b border-border-neutral bg-surface px-6 py-4">
				<div className="flex items-center justify-between">
					<div>
						<h1 className="text-2xl font-bold text-text">Sprint Planning Board</h1>
						<p className="text-sm text-text-subtle">Sprint 24 • Feb 19 - Mar 4</p>
					</div>
					<div className="flex gap-3">
						<Button variant="secondary" size="sm">
							Filters
						</Button>
						<Button variant="secondary" size="sm">
							<ChevronDownIcon label="" size="small" />
							View
						</Button>
						<Button size="sm">
							<AddIcon label="" size="small" />
							New Task
						</Button>
					</div>
				</div>
			</div>

			{/* Sprint Metrics */}
			<div className="border-b border-border-neutral bg-surface px-6 py-4">
				<SprintMetrics tasks={tasks} />
			</div>

			{/* Kanban Board */}
			<div className="overflow-x-auto p-6">
				<div className="flex gap-6 min-w-max">
					{statuses.map(status => (
						<StatusColumn
							key={status}
							status={status}
							tasks={tasksByStatus[status]}
							onTaskMove={handleTaskMove}
							onDragStart={handleDragStart}
							onDrop={() => handleDrop(status)}
							draggedTask={draggedTask}
						/>
					))}
				</div>
			</div>
		</div>
	);
}
