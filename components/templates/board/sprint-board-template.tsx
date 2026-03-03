"use client";

import { useState, useCallback } from "react";
import { SprintBoard } from "@/components/blocks/board";
import {
	getInitialBoardState,
	type BoardState,
} from "@/components/blocks/board/board-data";

export function SprintBoardTemplate() {
	const [state, setState] = useState<BoardState>(getInitialBoardState);

	const handleStateChange = useCallback((next: BoardState) => {
		setState(next);
	}, []);

	// Compute progress
	const totalTasks = Object.keys(state.tasks).length;
	const doneTasks = state.columns.done.length;
	const progressPercent =
		totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;

	return (
		<div className="flex min-h-screen flex-col bg-bg-neutral">
			{/* Page Header */}
			<div className="border-b border-border bg-surface px-6 py-5">
				<div className="mx-auto max-w-[1400px]">
					<h1 className="text-xl font-semibold text-text">ABCD</h1>
					<p className="mt-1 text-sm text-text-subtle">
						Drag tasks between columns to update their status
					</p>
				</div>
			</div>

			{/* Progress Bar */}
			<div className="border-b border-border-subtle bg-surface-raised px-6 py-4">
				<div className="mx-auto flex max-w-[1400px] items-center gap-3">
					<span className="text-sm font-medium text-text-subtle">
						Progress:
					</span>
					<div className="h-2 w-32 overflow-hidden rounded-full bg-bg-neutral">
						<div
							className="h-full rounded-full bg-bg-success-bold transition-all duration-500"
							style={{ width: `${progressPercent}%` }}
						/>
					</div>
					<span className="text-xs font-medium text-text-subtle">
						{doneTasks}/{totalTasks} done ({progressPercent}%)
					</span>
				</div>
			</div>

			{/* Board */}
			<div className="flex-1 overflow-auto">
				<div className="mx-auto max-w-[1400px] px-6 py-6">
					<SprintBoard state={state} onStateChange={handleStateChange} />
				</div>
			</div>
		</div>
	);
}
