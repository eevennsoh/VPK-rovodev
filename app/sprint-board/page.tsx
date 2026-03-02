"use client";

import { useState, useCallback } from "react";
import UndoIcon from "@atlaskit/icon/core/undo";
import { Button } from "@/components/ui/button";
import {
	Breadcrumb,
	BreadcrumbItem,
	BreadcrumbLink,
	BreadcrumbList,
	BreadcrumbPage,
	BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { PageHeader } from "@/components/ui/page-header";
import { getInitialBoardState } from "@/lib/sprint-board-data";
import { Board } from "@/components/blocks/sprint-board/board";

export default function SprintBoardPage() {
	const [boardState, setBoardState] = useState(() => getInitialBoardState());

	// Handle column updates from drag-and-drop
	const handleColumnsChange = useCallback(
		(columnUpdates: Record<string, string[]>) => {
			setBoardState((prev) => ({
				...prev,
				columns: prev.columns.map((col) =>
					columnUpdates[col.id]
						? { ...col, taskIds: columnUpdates[col.id] }
						: col,
				),
			}));
		},
		[],
	);

	// Reset board to initial state
	const handleReset = useCallback(() => {
		setBoardState(getInitialBoardState());
	}, []);

	// Compute progress metrics
	const totalTasks = boardState.columns.reduce(
		(sum, col) => sum + col.taskIds.length,
		0,
	);
	const doneTasks =
		boardState.columns.find((col) => col.id === "done")?.taskIds.length ?? 0;
	const progressPercent =
		totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;

	return (
		<div className="flex min-h-screen flex-col bg-bg-neutral">
			{/* Page Header */}
			<PageHeader
				title="Sprint Board"
				description="Drag tasks between columns to update their status"
				className="border-b border-border-subtle bg-surface px-6 py-5"
				breadcrumbs={
					<Breadcrumb>
						<BreadcrumbList>
							<BreadcrumbItem>
								<BreadcrumbLink href="/">Home</BreadcrumbLink>
							</BreadcrumbItem>
							<BreadcrumbSeparator />
							<BreadcrumbItem>
								<BreadcrumbPage>Sprint Board</BreadcrumbPage>
							</BreadcrumbItem>
						</BreadcrumbList>
					</Breadcrumb>
				}
			/>

			{/* Controls Bar */}
			<div className="border-b border-border-subtle bg-surface-raised px-6 py-4">
				<div className="mx-auto flex max-w-[1400px] items-center justify-between">
					{/* Progress */}
					<div className="flex items-center gap-3">
						<div className="flex items-center gap-2">
							<div className="h-2 w-24 overflow-hidden rounded-full bg-bg-neutral">
								<div
									className="h-full rounded-full bg-bg-success-bold transition-all duration-500"
									style={{ width: `${progressPercent}%` }}
								/>
							</div>
							<span className="text-xs font-medium text-text-subtle">
								{doneTasks}/{totalTasks} done
							</span>
						</div>
					</div>

					{/* Reset Button */}
					<Button
						variant="ghost"
						size="sm"
						onClick={handleReset}
						className="gap-1.5"
					>
						<UndoIcon label="" size="small" />
						Reset
					</Button>
				</div>
			</div>

			{/* Board Container */}
			<div className="flex-1 overflow-auto">
				<div className="mx-auto max-w-[1400px] px-6 py-6">
					<Board
						columns={boardState.columns}
						tasks={boardState.tasks}
						onColumnsChange={handleColumnsChange}
					/>
				</div>
			</div>
		</div>
	);
}
