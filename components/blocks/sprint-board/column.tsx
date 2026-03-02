"use client";

import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { cn } from "@/lib/utils";
import type { Column as ColumnType, ColumnId, Task } from "@/lib/sprint-board-types";
import { TaskCard } from "./task-card";

interface ColumnProps {
	column: ColumnType;
	tasks: Task[];
	isOver?: boolean;
}

const columnHeaderColors: Record<ColumnId, string> = {
	todo: "border-t-4 border-t-border-bold",
	"in-progress": "border-t-4 border-t-border-brand",
	done: "border-t-4 border-t-border-success",
};

export function Column({ column, tasks, isOver }: ColumnProps) {
	const { setNodeRef } = useDroppable({
		id: column.id,
		data: { type: "Column", column },
	});

	return (
		<div
			className={cn(
				"flex h-full min-h-[400px] flex-col rounded-lg border border-border-subtle bg-surface-raised",
				columnHeaderColors[column.id],
			)}
		>
			{/* Column Header */}
			<div className="px-4 py-3">
				<div className="flex items-center justify-between">
					<h3 className="text-sm font-semibold text-text">{column.title}</h3>
					<span className="rounded-full bg-bg-neutral px-2 py-0.5 text-xs font-medium text-text-subtle">
						{tasks.length}
					</span>
				</div>
			</div>

			{/* Drop Zone */}
			<div
				ref={setNodeRef}
				className={cn(
					"flex-1 space-y-2 overflow-y-auto p-3 transition-colors duration-200",
					isOver && "rounded-b-lg bg-surface-selected",
				)}
			>
				<SortableContext
					items={column.taskIds}
					strategy={verticalListSortingStrategy}
				>
					{tasks.length > 0 ? (
						tasks.map((task) => (
							<TaskCard
								key={task.id}
								task={task}
							/>
						))
					) : (
						<div className="flex items-center justify-center rounded-lg border-2 border-dashed border-border-subtle py-8 text-center">
							<p className="text-sm text-text-subtlest">
								Drop items here
							</p>
						</div>
					)}
				</SortableContext>
			</div>
		</div>
	);
}
