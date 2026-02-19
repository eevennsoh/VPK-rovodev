"use client";

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import ShowMoreHorizontalIcon from "@atlaskit/icon/core/show-more-horizontal";
import { cn } from "@/lib/utils";
import { type Task } from "../types";

interface TaskCardProps {
	task: Task;
	onDragStart: () => void;
	isDragging?: boolean;
}

const priorityConfig: Record<string, { color: string; label: string }> = {
	low: { color: "text-text-subtle", label: "Low" },
	medium: { color: "text-text", label: "Medium" },
	high: { color: "text-icon-warning", label: "High" },
	critical: { color: "text-icon-danger", label: "Critical" },
};

export function TaskCard({ task, onDragStart, isDragging }: TaskCardProps) {
	const priorityStyle = priorityConfig[task.priority];

	return (
		<Card
			draggable
			onDragStart={onDragStart}
			className={cn(
				"p-4 cursor-grab active:cursor-grabbing transition-all hover:shadow-md",
				"bg-surface border border-border-neutral hover:border-border-bold",
				isDragging && "opacity-50 shadow-lg",
			)}
		>
			<div className="flex items-start justify-between gap-2 mb-3">
				<div className="flex-1 min-w-0">
					<h4 className="font-medium text-sm text-text truncate">{task.title}</h4>
					{task.description && (
						<p className="text-xs text-text-subtle mt-1 line-clamp-2">{task.description}</p>
					)}
				</div>
				<button className="flex-shrink-0 p-1 hover:bg-bg-neutral rounded">
					<ShowMoreHorizontalIcon label="" size="small" />
				</button>
			</div>

			{/* Labels */}
			{task.labels && task.labels.length > 0 && (
				<div className="flex flex-wrap gap-1 mb-3">
					{task.labels.map(label => (
						<Badge key={label} variant="secondary">
							{label}
						</Badge>
					))}
				</div>
			)}

			{/* Footer */}
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-2">
					{task.storyPoints && (
						<span className="text-xs font-semibold text-text-subtle px-2 py-1 bg-bg-neutral rounded">
							{task.storyPoints}pt
						</span>
					)}
					<span className={cn("text-xs font-medium", priorityStyle.color)}>
						{priorityStyle.label}
					</span>
				</div>

				{task.assignee && (
					<Avatar className="h-6 w-6">
						{task.assignee.avatar && <AvatarImage src={task.assignee.avatar} />}
						<AvatarFallback className="text-xs">
							{task.assignee.name
								.split(" ")
								.map(n => n[0])
								.join("")}
						</AvatarFallback>
					</Avatar>
				)}
			</div>
		</Card>
	);
}
