"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Lozenge } from "@/components/ui/lozenge";
import { Tag } from "@/components/ui/tag";
import CrossIcon from "@atlaskit/icon/core/cross";
import { cn } from "@/lib/utils";
import type { Task, Priority, LabelColor } from "@/lib/sprint-board-types";

interface TaskCardProps {
	task: Task;
	isDragOverlay?: boolean;
	onTaskClick?: (task: Task) => void;
	onDeleteTask?: (taskId: string) => void;
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

const labelColorMap: Record<LabelColor, "blue" | "green" | "purple" | "orange" | "teal" | "red" | "yellow" | "magenta"> = {
	blue: "blue",
	green: "green",
	purple: "purple",
	orange: "orange",
	teal: "teal",
	red: "red",
	yellow: "yellow",
	magenta: "magenta",
};

export function TaskCard({ task, isDragOverlay, onTaskClick, onDeleteTask }: TaskCardProps) {
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
			onClick={(e) => {
				if (onTaskClick && !isDragOverlay && !isDragging) {
					e.stopPropagation();
					onTaskClick(task);
				}
			}}
			className={cn(
				"group relative cursor-grab rounded-lg border border-border-subtle bg-surface p-3 shadow-sm transition-all",
				"hover:border-border hover:shadow-md",
				"active:cursor-grabbing",
				isDragging && "opacity-40 shadow-lg",
				isDragOverlay && "cursor-grabbing shadow-xl ring-2 ring-border-brand",
			)}
		>
			{/* Delete button — hover-revealed */}
			{onDeleteTask && !isDragOverlay ? (
				<Button
					variant="ghost"
					size="icon"
					className="absolute right-1 top-1 size-6 opacity-0 transition-opacity group-hover:opacity-100"
					onClick={(e) => {
						e.stopPropagation();
						onDeleteTask(task.id);
					}}
				>
					<CrossIcon label="Delete task" size="small" />
				</Button>
			) : null}

			{/* Labels */}
			{task.labels && task.labels.length > 0 ? (
				<div className="mb-2 flex flex-wrap gap-1">
					{task.labels.map((label) => (
						<Tag key={label.text} color={labelColorMap[label.color]} className="text-[10px]">
							{label.text}
						</Tag>
					))}
				</div>
			) : null}

			{/* Task Title */}
			<h4 className="mb-1 text-sm font-medium leading-snug text-text">
				{task.title}
			</h4>

			{/* Description */}
			{task.description ? (
				<p className="mb-3 line-clamp-2 text-xs leading-relaxed text-text-subtle">
					{task.description}
				</p>
			) : (
				<div className="mb-3" />
			)}

			{/* Footer: Assignee Avatar, Story Points & Priority Lozenge */}
			<div className="flex items-center justify-between gap-2">
				<div className="flex items-center gap-2">
					<Avatar size="xs">
						<AvatarImage
							src={task.assignee.avatarUrl}
							alt={task.assignee.name}
						/>
						<AvatarFallback>{initials}</AvatarFallback>
					</Avatar>
					{task.storyPoints != null ? (
						<Badge variant="secondary" className="h-5 min-w-5 justify-center rounded-full px-1.5 text-[10px] font-semibold">
							{task.storyPoints}
						</Badge>
					) : null}
				</div>

				<Lozenge variant={priority.variant} isBold={task.priority === "critical"}>
					{priority.label}
				</Lozenge>
			</div>
		</div>
	);
}
