"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogFooter,
	DialogClose,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { Project, Task } from "@/lib/time-tracking-types";

interface TimeEntryFormProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	projects: Project[];
	onAddTask: (task: Omit<Task, "id">) => void;
}

export function TimeEntryForm({
	open,
	onOpenChange,
	projects,
	onAddTask,
}: TimeEntryFormProps) {
	const [selectedProjectId, setSelectedProjectId] = useState(
		projects[0]?.id ?? "",
	);
	const [taskName, setTaskName] = useState("");

	const handleSave = () => {
		const trimmed = taskName.trim();
		if (!trimmed || !selectedProjectId) return;

		onAddTask({
			name: trimmed,
			projectId: selectedProjectId,
		});
		setTaskName("");
		onOpenChange(false);
	};

	const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
		if (e.key === "Enter") {
			handleSave();
		}
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-[400px]">
				<DialogHeader>
					<DialogTitle>Add Task</DialogTitle>
				</DialogHeader>

				<div className="flex flex-col gap-4 py-4">
					{/* Project selector */}
					<div className="flex flex-col gap-2">
						<label className="text-sm font-medium text-text">
							Project
						</label>
						<div className="flex flex-wrap gap-2">
							{projects.map((project) => (
								<button
									key={project.id}
									type="button"
									onClick={() =>
										setSelectedProjectId(project.id)
									}
									className={cn(
										"flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm transition-colors",
										selectedProjectId === project.id
											? "border-border-selected bg-bg-selected text-text-selected"
											: "border-border-subtle bg-surface hover:bg-bg-neutral-subtle-hovered",
									)}
								>
									<span
										className={cn(
											"size-2.5 rounded-full",
											project.color,
										)}
									/>
									{project.name}
								</button>
							))}
						</div>
					</div>

					{/* Task name input */}
					<div className="flex flex-col gap-2">
						<label className="text-sm font-medium text-text">
							Task name
						</label>
						<Input
							value={taskName}
							onChange={(e) => setTaskName(e.target.value)}
							onKeyDown={handleKeyDown}
							placeholder="e.g., Code review, Bug fix, Sprint demo..."
							autoFocus
						/>
					</div>
				</div>

				<DialogFooter>
					<DialogClose
						render={<Button variant="ghost" size="sm" />}
					>
						Cancel
					</DialogClose>
					<Button
						size="sm"
						onClick={handleSave}
						disabled={!taskName.trim()}
					>
						Add Task
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
