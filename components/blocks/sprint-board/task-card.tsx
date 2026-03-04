"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { cn } from "@/lib/utils";
import type { Task } from "@/lib/sprint-board-types";

export interface TaskCardProps {
	task: Task;
	isDragOverlay?: boolean;
}

/**
 * TaskCard Component
 * 
 * Draggable task card component using dnd-kit's useSortable hook.
 * Displays minimal task information (title and assignee name) as specified in requirements.
 */
export function TaskCard({ task, isDragOverlay = false }: TaskCardProps) {
	const {
		attributes,
		listeners,
		setNodeRef,
		transform,
		transition,
		isDragging,
	} = useSortable({
		id: task.id,
		data: {
			type: "task",
			task,
		},
		disabled: isDragOverlay,
	});

	const style = isDragOverlay
		? undefined
		: {
				transform: CSS.Transform.toString(transform),
				transition,
			};

	return (
		<div
			ref={isDragOverlay ? undefined : setNodeRef}
			style={style}
			{...(isDragOverlay ? {} : attributes)}
			{...(isDragOverlay ? {} : listeners)}
			className={cn(
				"rounded border border-border bg-surface p-3 shadow-sm",
				"cursor-grab active:cursor-grabbing",
				"transition-shadow hover:shadow-md",
				isDragging && "opacity-50 shadow-lg",
				isDragOverlay && "cursor-grabbing shadow-xl ring-2 ring-border-brand",
			)}
		>
			{/* Task title */}
			<p className="text-sm font-medium text-text">{task.title}</p>
			
			{/* Assignee name */}
			<p className="mt-1 text-xs text-text-subtle">{task.assignee.name}</p>
		</div>
	);
}
