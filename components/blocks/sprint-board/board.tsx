"use client";

import { useState, useCallback, useMemo } from "react";
import {
	DndContext,
	DragOverlay,
	closestCorners,
	KeyboardSensor,
	PointerSensor,
	useSensor,
	useSensors,
	type DragStartEvent,
	type DragOverEvent,
	type DragEndEvent,
} from "@dnd-kit/core";
import { sortableKeyboardCoordinates, arrayMove } from "@dnd-kit/sortable";
import type {
	Task,
	Column as ColumnType,
	ColumnId,
} from "@/lib/sprint-board-types";
import { Column } from "./column";
import { TaskCard } from "./task-card";

interface BoardProps {
	columns: ColumnType[];
	tasks: Record<string, Task>;
	onColumnsChange: (columnUpdates: Record<string, string[]>) => void;
	onTaskClick?: (task: Task) => void;
	onAddToColumn?: (columnId: ColumnId) => void;
}

export function Board({ columns, tasks, onColumnsChange, onTaskClick, onAddToColumn }: BoardProps) {
	const [activeTask, setActiveTask] = useState<Task | null>(null);
	const [overColumnId, setOverColumnId] = useState<ColumnId | null>(null);

	const sensors = useSensors(
		useSensor(PointerSensor, {
			activationConstraint: {
				distance: 8,
			},
		}),
		useSensor(KeyboardSensor, {
			coordinateGetter: sortableKeyboardCoordinates,
		}),
	);

	// Get ordered tasks for a column
	const getColumnTasks = useCallback(
		(column: ColumnType): Task[] => {
			return column.taskIds.map((id) => tasks[id]).filter(Boolean);
		},
		[tasks],
	);

	// Find which column contains a given task ID
	const findColumnByTaskId = useCallback(
		(taskId: string): ColumnType | undefined => {
			return columns.find((col) => col.taskIds.includes(taskId));
		},
		[columns],
	);

	const handleDragStart = useCallback(
		(event: DragStartEvent) => {
			const { active } = event;
			const task = tasks[active.id as string];
			if (task) {
				setActiveTask(task);
			}
		},
		[tasks],
	);

	const handleDragOver = useCallback(
		(event: DragOverEvent) => {
			const { active, over } = event;
			if (!over) {
				setOverColumnId(null);
				return;
			}

			const activeId = active.id as string;
			const overId = over.id as string;

			// Find source column
			const sourceColumn = findColumnByTaskId(activeId);
			if (!sourceColumn) return;

			// Determine destination — could be over a column or over a task
			let destColumn: ColumnType | undefined;

			// Check if hovering over a column directly
			const directColumn = columns.find((col) => col.id === overId);
			if (directColumn) {
				destColumn = directColumn;
			} else {
				// Hovering over a task — find its column
				destColumn = findColumnByTaskId(overId);
			}

			if (!destColumn) return;

			setOverColumnId(destColumn.id);

			// If dragging to a different column, move the task
			if (sourceColumn.id !== destColumn.id) {
				const sourceTaskIds = [...sourceColumn.taskIds];
				const destTaskIds = [...destColumn.taskIds];

				// Remove from source
				const activeIndex = sourceTaskIds.indexOf(activeId);
				if (activeIndex === -1) return;
				sourceTaskIds.splice(activeIndex, 1);

				// Find insertion index
				const overIndex = destTaskIds.indexOf(overId);
				const insertIndex = overIndex === -1 ? destTaskIds.length : overIndex;

				// Insert into destination
				destTaskIds.splice(insertIndex, 0, activeId);

				onColumnsChange({
					[sourceColumn.id]: sourceTaskIds,
					[destColumn.id]: destTaskIds,
				});
			}
		},
		[columns, findColumnByTaskId, onColumnsChange],
	);

	const handleDragEnd = useCallback(
		(event: DragEndEvent) => {
			const { active, over } = event;

			setActiveTask(null);
			setOverColumnId(null);

			if (!over) return;

			const activeId = active.id as string;
			const overId = over.id as string;

			if (activeId === overId) return;

			// Handle reordering within the same column
			const sourceColumn = findColumnByTaskId(activeId);
			if (!sourceColumn) return;

			if (sourceColumn.taskIds.includes(overId)) {
				const oldIndex = sourceColumn.taskIds.indexOf(activeId);
				const newIndex = sourceColumn.taskIds.indexOf(overId);

				const newTaskIds = arrayMove(sourceColumn.taskIds, oldIndex, newIndex);

				onColumnsChange({
					[sourceColumn.id]: newTaskIds,
				});
			}
		},
		[findColumnByTaskId, onColumnsChange],
	);

	// Memoize columns with their tasks
	const columnsWithTasks = useMemo(
		() =>
			columns.map((column) => ({
				column,
				tasks: getColumnTasks(column),
			})),
		[columns, getColumnTasks],
	);

	return (
		<DndContext
			id="sprint-board-dnd"
			sensors={sensors}
			collisionDetection={closestCorners}
			onDragStart={handleDragStart}
			onDragOver={handleDragOver}
			onDragEnd={handleDragEnd}
		>
			<div className="grid auto-cols-fr grid-flow-col gap-4">
				{columnsWithTasks.map(({ column, tasks: columnTasks }) => (
					<Column
						key={column.id}
						column={column}
						tasks={columnTasks}
						isOver={overColumnId === column.id}
						onTaskClick={onTaskClick}
						onAddToColumn={onAddToColumn}
					/>
				))}
			</div>

			{/* Drag Overlay — ghost card follows cursor during drag */}
			<DragOverlay>
				{activeTask ? (
					<div className="rotate-3 scale-105">
						<TaskCard task={activeTask} isDragOverlay />
					</div>
				) : null}
			</DragOverlay>
		</DndContext>
	);
}
