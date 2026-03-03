"use client";

import { useState, useCallback } from "react";
import UndoIcon from "@atlaskit/icon/core/undo";
import { Button } from "@/components/ui/button";
import {
	Breadcrumb,
	BreadcrumbItem,
	BreadcrumbLink,
	BreadcrumbList,
	BreadcrumbPage,
	BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { PageHeader } from "@/components/ui/page-header";
import { getInitialBoardState, SAMPLE_ASSIGNEES } from "@/lib/sprint-board-data";
import { Board } from "@/components/blocks/sprint-board/board";
import { CreateTaskDialog } from "@/components/blocks/sprint-board/create-task-dialog";
import { EditTaskDialog } from "@/components/blocks/sprint-board/edit-task-dialog";
import type { Priority, ColumnId, Task, TaskLabel } from "@/lib/sprint-board-types";

export default function SprintBoardPage() {
	const [boardState, setBoardState] = useState(() => getInitialBoardState());

	// Handle column updates from drag-and-drop
	const handleColumnsChange = useCallback(
		(columnUpdates: Record<string, string[]>) => {
			setBoardState((prev) => ({
				...prev,
				columns: prev.columns.map((col) =>
					columnUpdates[col.id]
						? { ...col, taskIds: columnUpdates[col.id] }
						: col,
				),
			}));
		},
		[],
	);

	// Add a new task
	const handleAddTask = useCallback(
		(task: {
			title: string;
			description?: string;
			assigneeId: string;
			priority: Priority;
			storyPoints?: number;
			labels: TaskLabel[];
			columnId: ColumnId;
		}) => {
			setBoardState((prev) => {
				const assignee = SAMPLE_ASSIGNEES.find((a) => a.id === task.assigneeId) ?? SAMPLE_ASSIGNEES[0];
				const column = prev.columns.find((col) => col.id === task.columnId);
				const newId = `task-new-${Date.now()}`;
				const newTask = {
					id: newId,
					title: task.title,
					description: task.description,
					assignee,
					priority: task.priority,
					storyPoints: task.storyPoints,
					labels: task.labels.length > 0 ? task.labels : undefined,
					columnId: task.columnId,
					order: column ? column.taskIds.length : 0,
				};

				return {
					...prev,
					tasks: { ...prev.tasks, [newId]: newTask },
					columns: prev.columns.map((col) =>
						col.id === task.columnId
							? { ...col, taskIds: [...col.taskIds, newId] }
							: col,
					),
				};
			});
		},
		[],
	);

	// Edit task state
	const [editingTask, setEditingTask] = useState<Task | null>(null);
	const [editDialogOpen, setEditDialogOpen] = useState(false);

	const handleTaskClick = useCallback((task: Task) => {
		setEditingTask(task);
		setEditDialogOpen(true);
	}, []);

	const handleEditTask = useCallback(
		(taskId: string, updates: Partial<Pick<Task, "title" | "description" | "priority" | "storyPoints" | "labels"> & { assigneeId: string }>) => {
			setBoardState((prev) => {
				const existingTask = prev.tasks[taskId];
				if (!existingTask) return prev;

				const assignee = updates.assigneeId
					? (SAMPLE_ASSIGNEES.find((a) => a.id === updates.assigneeId) ?? existingTask.assignee)
					: existingTask.assignee;

				const updatedTask: Task = {
					...existingTask,
					title: updates.title ?? existingTask.title,
					description: updates.description,
					assignee,
					priority: updates.priority ?? existingTask.priority,
					storyPoints: updates.storyPoints,
					labels: updates.labels,
				};

				return {
					...prev,
					tasks: { ...prev.tasks, [taskId]: updatedTask },
				};
			});
		},
		[],
	);

	// Add-to-column state (controlled create dialog)
	const [addToColumnId, setAddToColumnId] = useState<ColumnId | null>(null);
	const [createDialogOpen, setCreateDialogOpen] = useState(false);

	const handleAddToColumn = useCallback((columnId: ColumnId) => {
		setAddToColumnId(columnId);
		setCreateDialogOpen(true);
	}, []);

	// Delete a task
	const handleDeleteTask = useCallback((taskId: string) => {
		setBoardState((prev) => {
			// eslint-disable-next-line @typescript-eslint/no-unused-vars
			const { [taskId]: _removed, ...remainingTasks } = prev.tasks;
			return {
				...prev,
				tasks: remainingTasks,
				columns: prev.columns.map((col) => ({
					...col,
					taskIds: col.taskIds.filter((id) => id !== taskId),
				})),
			};
		});
	}, []);

	// Reset board to initial state
	const handleReset = useCallback(() => {
		setBoardState(getInitialBoardState());
	}, []);

	// Compute progress metrics
	const totalTasks = boardState.columns.reduce(
		(sum, col) => sum + col.taskIds.length,
		0,
	);
	const doneTasks =
		boardState.columns.find((col) => col.id === "done")?.taskIds.length ?? 0;
	const progressPercent =
		totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;

	return (
		<div className="flex min-h-screen flex-col bg-bg-neutral">
			{/* Page Header */}
			<PageHeader
				title="ABCD"
				description="Drag tasks between columns to update their status"
				className="border-b border-border-subtle bg-surface px-6 py-5"
				breadcrumbs={
					<Breadcrumb>
						<BreadcrumbList>
							<BreadcrumbItem>
								<BreadcrumbLink href="/">Home</BreadcrumbLink>
							</BreadcrumbItem>
							<BreadcrumbSeparator />
							<BreadcrumbItem>
								<BreadcrumbPage>ABCD</BreadcrumbPage>
							</BreadcrumbItem>
						</BreadcrumbList>
					</Breadcrumb>
				}
			/>

			{/* Controls Bar */}
			<div className="border-b border-border-subtle bg-surface-raised px-6 py-4">
				<div className="mx-auto flex max-w-[1400px] items-center justify-between">
					{/* Progress */}
					<div className="flex items-center gap-3">
						<div className="flex items-center gap-2">
							<div className="h-2 w-24 overflow-hidden rounded-full bg-bg-neutral">
								<div
									className="h-full rounded-full bg-bg-success-bold transition-all duration-500"
									style={{ width: `${progressPercent}%` }}
								/>
							</div>
							<span className="text-xs font-medium text-text-subtle">
								{doneTasks}/{totalTasks} done
							</span>
						</div>
					</div>

					{/* Actions */}
					<div className="flex items-center gap-2">
						<CreateTaskDialog
							assignees={SAMPLE_ASSIGNEES}
							onCreateTask={handleAddTask}
						/>
						<Button
							variant="ghost"
							size="sm"
							onClick={handleReset}
							className="gap-1.5"
						>
							<UndoIcon label="" size="small" />
							Reset
						</Button>
					</div>
				</div>
			</div>

			{/* Board Container */}
			<div className="flex-1 overflow-auto">
				<div className="mx-auto max-w-[1400px] px-6 py-6">
					<Board
						columns={boardState.columns}
						tasks={boardState.tasks}
						onColumnsChange={handleColumnsChange}
						onTaskClick={handleTaskClick}
						onDeleteTask={handleDeleteTask}
						onAddToColumn={handleAddToColumn}
					/>
				</div>
			</div>

			{/* Per-column Create Task Dialog */}
			<CreateTaskDialog
				key={addToColumnId ?? "todo"}
				assignees={SAMPLE_ASSIGNEES}
				defaultColumnId={addToColumnId ?? "todo"}
				open={createDialogOpen}
				onOpenChange={setCreateDialogOpen}
				onCreateTask={handleAddTask}
			/>

			{/* Edit Task Dialog */}
			<EditTaskDialog
				key={editingTask?.id ?? "none"}
				task={editingTask}
				assignees={SAMPLE_ASSIGNEES}
				open={editDialogOpen}
				onOpenChange={setEditDialogOpen}
				onSave={handleEditTask}
			/>
		</div>
	);
}
