"use client";

import { useMemo } from "react";
import {
	PlanAgentBar,
	PlanSummary,
	PlanTaskItem,
	PlanTaskList,
	type PlanTask,
} from "@/components/ui-ai/plan";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Shared helpers for plan card widgets
// ---------------------------------------------------------------------------

export function stripTaskMarkdownDecorators(label: string): string {
	return label
		.replace(/\*\*([^*\n]+)\*\*/g, "$1")
		.replace(/__([^_\n]+)__/g, "$1")
		.replace(/^[*_`\s]+/, "")
		.replace(/[\s*_`]+$/, "")
		.trim();
}

export function extractTaskHeading(label: string): string {
	const normalizedLabel = stripTaskMarkdownDecorators(label);
	const emDashIndex = normalizedLabel.indexOf("\u2014"); // em-dash
	if (emDashIndex === -1) return normalizedLabel;
	const heading = stripTaskMarkdownDecorators(normalizedLabel.slice(0, emDashIndex));
	return heading.length > 0 ? heading : normalizedLabel;
}

export function resolveBlockedByLabels(task: PlanTask, allTasks: PlanTask[]): string[] {
	if (!Array.isArray(task.blockedBy)) return [];
	return task.blockedBy
		.map((blockedById) => {
			const taskIndex = allTasks.findIndex((t) => t.id === blockedById);
			return taskIndex >= 0 ? `Task ${taskIndex + 1}` : null;
		})
		.filter((label): label is string => label !== null);
}

// ---------------------------------------------------------------------------
// Shared tab content — Summary + Tasks tabs
// ---------------------------------------------------------------------------

interface PlanTabContentProps {
	description: string;
	tasks: PlanTask[];
	agents: string[];
	revealedCount: number;
	tabsListClassName?: string;
	summaryTabContentClassName?: string;
	tasksTabContentClassName?: string;
}

function stripLeadingMarkdownRule(value: string): string {
	return value.replace(/^\s*(?:-{3,}|\*{3,}|_{3,})\s*(?:\r?\n)+/, "").trimStart();
}

export function PlanTabContent({
	description,
	tasks,
	agents,
	revealedCount,
	tabsListClassName,
	summaryTabContentClassName,
	tasksTabContentClassName,
}: Readonly<PlanTabContentProps>) {
	const normalizedDescription = useMemo(
		() => stripLeadingMarkdownRule(description),
		[description],
	);
	const visibleTasks = useMemo(
		() => tasks.filter((task) => task.label.trim().length > 0),
		[tasks],
	);

	const clampedRevealedCount = Math.min(revealedCount, visibleTasks.length);

	return (
		<Tabs defaultValue="summary" className="gap-4">
			<TabsList variant="line" className={cn("mx-4 h-10 w-auto justify-start", tabsListClassName)}>
				<TabsTrigger value="summary" className="flex-none">
					Summary
				</TabsTrigger>
				<TabsTrigger value="tasks" className="flex-none">
					Tasks ({visibleTasks.length})
				</TabsTrigger>
			</TabsList>

			<TabsContent value="summary" className={cn("px-4 pb-4", summaryTabContentClassName)}>
				<PlanSummary summary={normalizedDescription} emptyMessage="No description provided." />
			</TabsContent>

			<TabsContent value="tasks" className={cn("px-3 pb-4", tasksTabContentClassName)}>
				<PlanAgentBar agents={agents} className="mb-2" />
				<PlanTaskList>
					{visibleTasks.slice(0, clampedRevealedCount).map((task, index) => (
						<PlanTaskItem
							key={task.id}
							index={index + 1}
							label={extractTaskHeading(task.label)}
							blockedByLabels={resolveBlockedByLabels(task, tasks)}
							agent={task.agent}
						/>
					))}
				</PlanTaskList>
			</TabsContent>
		</Tabs>
	);
}
