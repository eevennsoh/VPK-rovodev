"use client";

import type { TaskExecution } from "@/components/projects/make/lib/execution-data";
import { ExecutionGridView } from "@/components/projects/make/components/execution-grid-view";

interface MakeGridSurfaceProps {
	taskExecutions: TaskExecution[];
	onAddTask?: (message: string) => void;
	showGeneratingEmptyState?: boolean;
}

export function MakeGridSurface({
	taskExecutions,
	onAddTask,
	showGeneratingEmptyState = false,
}: Readonly<MakeGridSurfaceProps>) {
	return (
		<ExecutionGridView
			taskExecutions={taskExecutions}
			onAddTask={onAddTask}
			showGeneratingEmptyState={showGeneratingEmptyState}
		/>
	);
}
