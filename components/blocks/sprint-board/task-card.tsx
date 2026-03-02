"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Lozenge } from "@/components/ui/lozenge";
import { cn } from "@/lib/utils";
import type { Task, Priority } from "@/lib/sprint-board-types";

interface TaskCardProps {
	task: Task;
	isDragOverlay?: boolean;
}

const priorityConfig: Record<
	Priority,
	{ label: string; variant: "neutral" | "success" | "warning" | "danger" }
> = {
	low: { label: "Low", variant: "neutral" },
	medium: { label: "Medium", variant: "success" },
	high: { label: "High", variant: "warning" },
	critical: { label: "Critical", variant: "danger" },
};

export function TaskCard({ task, isDragOverlay }: TaskCardProps) {
	const {
		attributes,
		listeners,
		setNodeRef,
		transform,
		transition,
		isDragging,
	} = useSortable({
		id: task.id,
		data: { type: "Task", task },
		disabled: isDragOverlay,
	});

	const style = isDragOverlay
		? undefined
		: {
				transform: CSS.Transform.toString(transform),
				transition,
			};

	const priority = priorityConfig[task.priority];

	const initials = task.assignee.name
		.split(" ")
		.map((n) => n[0])
		.join("")
		.toUpperCase();

	return (
		<div
			ref={isDragOverlay ? undefined : setNodeRef}
			style={style}
			{...(isDragOverlay ? {} : attributes)}
			{...(isDragOverlay ? {} : listeners)}
			className={cn(
				"group cursor-grab rounded-lg border border-border-subtle bg-surface p-3 shadow-sm transition-all",
				"hover:border-border hover:shadow-md",
				"active:cursor-grabbing",
				isDragging && "opacity-40 shadow-lg",
				isDragOverlay && "cursor-grabbing shadow-xl ring-2 ring-border-brand",
			)}
		>
			{/* Task Title */}
			<h4 className="mb-3 text-sm font-medium leading-snug text-text">
				{task.title}
			</h4>

			{/* Footer: Assignee Avatar & Priority Lozenge */}
			<div className="flex items-center justify-between gap-2">
				<Avatar size="xs">
					<AvatarImage
						src={task.assignee.avatarUrl}
						alt={task.assignee.name}
					/>
					<AvatarFallback>{initials}</AvatarFallback>
				</Avatar>

				<Lozenge variant={priority.variant} isBold={task.priority === "critical"}>
					{priority.label}
				</Lozenge>
			</div>
		</div>
	);
}
