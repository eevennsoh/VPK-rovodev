"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import type { Assignee, Priority, Task, TaskLabel } from "@/lib/sprint-board-types";

const AVAILABLE_LABELS: TaskLabel[] = [
	{ text: "Frontend", color: "blue" },
	{ text: "Backend", color: "green" },
	{ text: "Design", color: "purple" },
	{ text: "Bug", color: "red" },
	{ text: "UX", color: "purple" },
	{ text: "DevOps", color: "teal" },
	{ text: "Security", color: "red" },
	{ text: "Mobile", color: "orange" },
	{ text: "Testing", color: "yellow" },
	{ text: "Analytics", color: "teal" },
];

interface EditTaskDialogProps {
	task: Task | null;
	assignees: Assignee[];
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onSave: (taskId: string, updates: Partial<Pick<Task, "title" | "description" | "priority" | "storyPoints" | "labels"> & { assigneeId: string }>) => void;
}

export function EditTaskDialog({
	task,
	assignees,
	open,
	onOpenChange,
	onSave,
}: EditTaskDialogProps) {
	const [title, setTitle] = useState(task?.title ?? "");
	const [description, setDescription] = useState(task?.description ?? "");
	const [assigneeId, setAssigneeId] = useState(task?.assignee.id ?? "");
	const [priority, setPriority] = useState<Priority>(task?.priority ?? "medium");
	const [storyPoints, setStoryPoints] = useState(task?.storyPoints != null ? String(task.storyPoints) : "");
	const [selectedLabels, setSelectedLabels] = useState<TaskLabel[]>(task?.labels ?? []);

	const handleSubmit = useCallback(
		(e: React.FormEvent) => {
			e.preventDefault();
			if (!task || !title.trim()) return;

			const points = parseInt(storyPoints, 10);

			onSave(task.id, {
				title: title.trim(),
				description: description.trim() || undefined,
				assigneeId,
				priority,
				storyPoints: isNaN(points) || points < 0 ? undefined : points,
				labels: selectedLabels.length > 0 ? selectedLabels : undefined,
			});

			onOpenChange(false);
		},
		[task, title, description, assigneeId, priority, storyPoints, selectedLabels, onSave, onOpenChange],
	);

	const toggleLabel = useCallback((label: TaskLabel) => {
		setSelectedLabels((prev) => {
			const exists = prev.some((l) => l.text === label.text);
			if (exists) {
				return prev.filter((l) => l.text !== label.text);
			}
			return [...prev, label];
		});
	}, []);

	if (!task) return null;

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-[480px]">
				<form onSubmit={handleSubmit}>
					<DialogHeader>
						<DialogTitle>Edit Task</DialogTitle>
						<DialogDescription>
							Update the task details below.
						</DialogDescription>
					</DialogHeader>

					<div className="mt-4 flex flex-col gap-4">
						{/* Title */}
						<div className="flex flex-col gap-1.5">
							<Label htmlFor="edit-task-title">Title</Label>
							<Input
								id="edit-task-title"
								placeholder="Enter task title"
								value={title}
								onChange={(e) => setTitle(e.target.value)}
								autoFocus
								required
							/>
						</div>

						{/* Description */}
						<div className="flex flex-col gap-1.5">
							<Label htmlFor="edit-task-description">Description</Label>
							<Textarea
								id="edit-task-description"
								placeholder="Optional task description"
								value={description}
								onChange={(e) => setDescription(e.target.value)}
								rows={2}
							/>
						</div>

						{/* Row: Assignee + Priority */}
						<div className="grid grid-cols-2 gap-3">
							<div className="flex flex-col gap-1.5">
								<Label>Assignee</Label>
								<Select value={assigneeId} onValueChange={(v) => { if (v) setAssigneeId(v); }}>
									<SelectTrigger>
										<SelectValue placeholder="Select assignee" />
									</SelectTrigger>
									<SelectContent>
										{assignees.map((a) => (
											<SelectItem key={a.id} value={a.id}>
												{a.name}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>

							<div className="flex flex-col gap-1.5">
								<Label>Priority</Label>
								<Select value={priority} onValueChange={(v) => { if (v) setPriority(v as Priority); }}>
									<SelectTrigger>
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="low">Low</SelectItem>
										<SelectItem value="medium">Medium</SelectItem>
										<SelectItem value="high">High</SelectItem>
										<SelectItem value="critical">Critical</SelectItem>
									</SelectContent>
								</Select>
							</div>
						</div>

						{/* Story Points */}
						<div className="flex flex-col gap-1.5">
							<Label htmlFor="edit-task-points">Story Points</Label>
							<Input
								id="edit-task-points"
								type="number"
								min={0}
								max={100}
								placeholder="e.g. 5"
								value={storyPoints}
								onChange={(e) => setStoryPoints(e.target.value)}
							/>
						</div>

						{/* Labels */}
						<div className="flex flex-col gap-1.5">
							<Label>Labels</Label>
							<div className="flex flex-wrap gap-1.5">
								{AVAILABLE_LABELS.map((label) => {
									const isSelected = selectedLabels.some((l) => l.text === label.text);
									return (
										<button
											key={label.text}
											type="button"
											onClick={() => toggleLabel(label)}
											className={`rounded-md border px-2 py-0.5 text-xs font-medium transition-colors ${
												isSelected
													? "border-border-brand bg-surface-selected text-text"
													: "border-border-subtle bg-surface text-text-subtle hover:bg-bg-neutral-hovered"
											}`}
										>
											{label.text}
										</button>
									);
								})}
							</div>
						</div>
					</div>

					<DialogFooter className="mt-6">
						<Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
							Cancel
						</Button>
						<Button type="submit" disabled={!title.trim()}>
							Save Changes
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
