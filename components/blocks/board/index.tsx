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
import type { BoardColumnId, BoardTask, BoardState } from "./board-data";
import { BOARD_COLUMNS } from "./board-data";
import { BoardColumn } from "./board-column";
import { BoardCard } from "./board-card";

interface SprintBoardProps {
	state: BoardState;
	onStateChange: (state: BoardState) => void;
}

export function SprintBoard({ state, onStateChange }: SprintBoardProps) {
	const [activeTask, setActiveTask] = useState<BoardTask | null>(null);
	const [overColumnId, setOverColumnId] = useState<BoardColumnId | null>(null);

	const sensors = useSensors(
		useSensor(PointerSensor, {
			activationConstraint: { distance: 8 },
		}),
		useSensor(KeyboardSensor, {
			coordinateGetter: sortableKeyboardCoordinates,
		}),
	);

	// Find which column contains a given task ID
	const findColumnByTaskId = useCallback(
		(taskId: string): BoardColumnId | undefined => {
			for (const colDef of BOARD_COLUMNS) {
				if (state.columns[colDef.id].includes(taskId)) {
					return colDef.id;
				}
			}
			return undefined;
		},
		[state.columns],
	);

	const handleDragStart = useCallback(
		(event: DragStartEvent) => {
			const task = state.tasks[event.active.id as string];
			if (task) {
				setActiveTask(task);
			}
		},
		[state.tasks],
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

			const sourceColId = findColumnByTaskId(activeId);
			if (!sourceColId) return;

			// Determine destination — could be over a column or over a task
			let destColId: BoardColumnId | undefined;

			// Check if hovering over a column directly
			if (BOARD_COLUMNS.some((c) => c.id === overId)) {
				destColId = overId as BoardColumnId;
			} else {
				// Hovering over a task — find its column
				destColId = findColumnByTaskId(overId);
			}

			if (!destColId) return;

			setOverColumnId(destColId);

			// If dragging to a different column, move the task
			if (sourceColId !== destColId) {
				const sourceTaskIds = [...state.columns[sourceColId]];
				const destTaskIds = [...state.columns[destColId]];

				// Remove from source
				const activeIndex = sourceTaskIds.indexOf(activeId);
				if (activeIndex === -1) return;
				sourceTaskIds.splice(activeIndex, 1);

				// Find insertion index
				const overIndex = destTaskIds.indexOf(overId);
				const insertIndex =
					overIndex === -1 ? destTaskIds.length : overIndex;

				// Insert into destination
				destTaskIds.splice(insertIndex, 0, activeId);

				onStateChange({
					...state,
					columns: {
						...state.columns,
						[sourceColId]: sourceTaskIds,
						[destColId]: destTaskIds,
					},
				});
			}
		},
		[state, findColumnByTaskId, onStateChange],
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
			const sourceColId = findColumnByTaskId(activeId);
			if (!sourceColId) return;

			const taskIds = state.columns[sourceColId];
			if (taskIds.includes(overId)) {
				const oldIndex = taskIds.indexOf(activeId);
				const newIndex = taskIds.indexOf(overId);

				onStateChange({
					...state,
					columns: {
						...state.columns,
						[sourceColId]: arrayMove(taskIds, oldIndex, newIndex),
					},
				});
			}
		},
		[state, findColumnByTaskId, onStateChange],
	);

	// Memoize resolved tasks per column
	const columnsWithTasks = useMemo(
		() =>
			BOARD_COLUMNS.map((col) => ({
				...col,
				taskIds: state.columns[col.id],
				tasks: state.columns[col.id]
					.map((id) => state.tasks[id])
					.filter(Boolean),
			})),
		[state],
	);

	return (
		<DndContext
			sensors={sensors}
			collisionDetection={closestCorners}
			onDragStart={handleDragStart}
			onDragOver={handleDragOver}
			onDragEnd={handleDragEnd}
		>
			<div className="grid auto-cols-fr grid-flow-col gap-4">
				{columnsWithTasks.map((col) => (
					<BoardColumn
						key={col.id}
						id={col.id}
						title={col.title}
						taskIds={col.taskIds}
						tasks={col.tasks}
						isOver={overColumnId === col.id}
					/>
				))}
			</div>

			{/* Drag Overlay — ghost card follows cursor during drag */}
			<DragOverlay>
				{activeTask ? (
					<div className="rotate-3 scale-105">
						<BoardCard task={activeTask} isDragOverlay />
					</div>
				) : null}
			</DragOverlay>
		</DndContext>
	);
}
