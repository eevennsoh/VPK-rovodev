"use client";

import { memo, useMemo } from "react";
import CheckCircleIcon from "@atlaskit/icon/core/check-circle";
import CrossCircleIcon from "@atlaskit/icon/core/cross-circle";
import ClockIcon from "@atlaskit/icon/core/clock";
import TaskIcon from "@atlaskit/icon/core/task";
import { cn } from "@/lib/utils";
import { token } from "@/lib/tokens";
import type { AgentRun } from "@/lib/make-run-types";
import type { TaskExecution } from "../lib/execution-data";
import { extractTaskHeading } from "../lib/execution-data";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type CardSize = "large" | "medium" | "small";

interface BentoCard {
	id: string;
	taskLabel: string;
	heading: string;
	agentName: string;
	status: "completed" | "failed" | "working";
	content: string;
	size: CardSize;
	/** Index for staggered animation delay */
	animationIndex: number;
}

interface BentoSummaryViewProps {
	taskExecutions: TaskExecution[];
	run: AgentRun | null;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function determineCardSize(
	content: string,
	index: number,
	total: number
): CardSize {
	// First card is always large when there are multiple
	if (index === 0 && total > 1) {
		return "large";
	}

	// Cards with substantial content are medium
	if (content.length > 300) {
		return "medium";
	}

	// Cards with very little content are small
	if (content.length < 80) {
		return "small";
	}

	return "medium";
}

function formatDuration(run: AgentRun | null): string | null {
	if (!run?.createdAt) {
		return null;
	}

	const start = new Date(run.createdAt).getTime();
	if (!Number.isFinite(start)) {
		return null;
	}
	const end = run.completedAt
		? new Date(run.completedAt).getTime()
		: Date.now();
	if (!Number.isFinite(end)) {
		return null;
	}
	const durationMs = end - start;

	if (durationMs < 1000) {
		return "<1s";
	}

	const seconds = Math.floor(durationMs / 1000);
	if (seconds < 60) {
		return `${seconds}s`;
	}

	const minutes = Math.floor(seconds / 60);
	const remainingSeconds = seconds % 60;
	return remainingSeconds > 0 ? `${minutes}m ${remainingSeconds}s` : `${minutes}m`;
}

function buildBentoCards(taskExecutions: TaskExecution[]): BentoCard[] {
	const completedOrFailed = taskExecutions.filter(
		(execution) => execution.status === "completed" || execution.status === "failed"
	);
	const total = completedOrFailed.length;

	return completedOrFailed.map((execution, index) => ({
		id: execution.taskId,
		taskLabel: execution.taskLabel,
		heading: extractTaskHeading(execution.taskLabel),
		agentName: execution.agentName || "Agent",
		status: execution.status,
		content: execution.content,
		size: determineCardSize(execution.content, index, total),
		animationIndex: index,
	}));
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function StatusIcon({ status }: { status: BentoCard["status"] }) {
	if (status === "completed") {
		return (
			<span className="text-text-success">
				<CheckCircleIcon label="Completed" />
			</span>
		);
	}

	if (status === "failed") {
		return (
			<span className="text-text-danger">
				<CrossCircleIcon label="Failed" />
			</span>
		);
	}

	return (
		<span className="text-text-subtle">
			<TaskIcon label="Working" />
		</span>
	);
}

function ContentPreview({ content }: { content: string }) {
	if (!content.trim()) {
		return (
			<p className="text-sm leading-5 text-text-subtlest italic">
				No output produced.
			</p>
		);
	}

	// Detect if content looks like code (simple heuristic)
	const looksLikeCode =
		content.includes("```") ||
		content.includes("function ") ||
		content.includes("const ") ||
		content.includes("import ");

	if (looksLikeCode && content.includes("```")) {
		// Extract code block content
		const codeMatch = content.match(/```[\w]*\n?([\s\S]*?)```/);
		const codeContent = codeMatch ? codeMatch[1].trim() : content;
		const textBefore = content.slice(0, content.indexOf("```")).trim();

		return (
			<div className="flex flex-col gap-2">
				{textBefore ? (
					<p className="text-sm leading-5 text-text-subtle line-clamp-2">
						{textBefore}
					</p>
				) : null}
				<pre className="overflow-x-auto rounded-sm bg-bg-neutral p-3 text-xs leading-5 text-text">
					<code>{codeContent.slice(0, 500)}{codeContent.length > 500 ? "\n..." : ""}</code>
				</pre>
			</div>
		);
	}

	return (
		<p className="text-sm leading-5 text-text-subtle line-clamp-6 whitespace-pre-wrap">
			{content.slice(0, 800)}
		</p>
	);
}

const BentoCardComponent = memo(function BentoCardComponent({
	card,
}: {
	card: BentoCard;
}) {
	return (
		<div
			className={cn(
				"mb-3 break-inside-avoid rounded-lg border border-border p-4",
				"bg-surface-raised",
				"animate-in fade-in slide-in-from-bottom-2 duration-300 fill-mode-both",
			)}
			style={{
				boxShadow: token("elevation.shadow.raised"),
				animationDelay: `${card.animationIndex * 80}ms`,
			}}
		>
			{/* Header */}
			<div className="mb-3 flex items-start justify-between gap-2">
				<div className="flex min-w-0 flex-col gap-0.5">
					<h3
						className="truncate font-semibold text-text"
						style={{ font: token("font.heading.xsmall") }}
					>
						{card.heading}
					</h3>
					<span className="text-xs text-text-subtlest">
						{card.agentName}
					</span>
				</div>
				<StatusIcon status={card.status} />
			</div>

			{/* Content */}
			<ContentPreview content={card.content} />
		</div>
	);
});

BentoCardComponent.displayName = "BentoCardComponent";

function RunSummaryCard({ run }: { run: AgentRun }) {
	const duration = formatDuration(run);
	const completedCount = run.tasks.filter((t) => t.status === "done").length;
	const failedCount = run.tasks.filter(
		(t) => t.status === "failed" || t.status === "blocked-failed"
	).length;
	const totalCount = run.tasks.length;
	const isAllSuccess = failedCount === 0 && completedCount === totalCount;

	return (
		<div
			className={cn(
				"mb-3 break-inside-avoid rounded-lg border border-border p-4",
				"bg-surface-raised",
				"animate-in fade-in slide-in-from-bottom-2 duration-300 fill-mode-both",
			)}
			style={{
				boxShadow: token("elevation.shadow.raised"),
			}}
		>
			<div className="mb-3 flex items-center gap-2">
				<span className={isAllSuccess ? "text-text-success" : "text-text-warning"}>
					<CheckCircleIcon label={isAllSuccess ? "Success" : "Partial success"} />
				</span>
				<h3
					className="font-semibold text-text"
					style={{ font: token("font.heading.xsmall") }}
				>
					{run.plan.title || "Run Summary"}
				</h3>
			</div>

			<div className="flex flex-col gap-1.5 text-sm text-text-subtle">
				<div className="flex items-center gap-2">
					<TaskIcon label="Tasks" />
					<span>
						{completedCount}/{totalCount} tasks completed
						{failedCount > 0 ? `, ${failedCount} failed` : ""}
					</span>
				</div>
				{duration ? (
					<div className="flex items-center gap-2">
						<ClockIcon label="Duration" />
						<span>Completed in {duration}</span>
					</div>
				) : null}
			</div>

			{run.summary?.content ? (
				<p className="mt-3 text-sm leading-5 text-text-subtle line-clamp-4 whitespace-pre-wrap">
					{run.summary.content.slice(0, 400)}
				</p>
			) : null}
		</div>
	);
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export const BentoSummaryView = memo(function BentoSummaryView({
	taskExecutions,
	run,
}: Readonly<BentoSummaryViewProps>) {
	const cards = useMemo(
		() => buildBentoCards(taskExecutions),
		[taskExecutions]
	);

	return (
		<div className="flex h-full min-h-0 flex-col overflow-y-auto overflow-x-hidden">
			<div className="mx-auto w-full max-w-5xl px-6 py-6">
				{/* Run summary card at top */}
				{run ? <RunSummaryCard run={run} /> : null}

				{/* Masonry layout */}
				<div className="columns-1 gap-3 md:columns-2 lg:columns-3">
					{cards.map((card) => (
						<BentoCardComponent key={card.id} card={card} />
					))}

					{cards.length === 0 ? (
						<div className="col-span-full py-12 text-center text-sm text-text-subtlest">
							No task results to display.
						</div>
					) : null}
				</div>
			</div>
		</div>
	);
});

BentoSummaryView.displayName = "BentoSummaryView";
