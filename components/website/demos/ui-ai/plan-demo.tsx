"use client";

import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
	Plan,
	PlanAvatar,
	PlanContent,
	PlanDescription,
	PlanFooter,
	PlanHeader,
	PlanSummary,
	PlanTaskItem,
	PlanTaskList,
	PlanTitle,
	type PlanTask,
} from "@/components/ui-ai/plan";
import { useState } from "react";

const PLAN_TASKS: PlanTask[] = [
	{ id: "1", label: "Create Flexible Fridays Work-back Plan", blockedBy: [] },
	{ id: "2", label: "Finalize Flexible Fridays policy wording", blockedBy: ["1"] },
	{ id: "3", label: "Create Manager toolkit content", blockedBy: ["1"] },
	{ id: "4", label: "Record Manager toolkit Loom walkthrough", blockedBy: [] },
	{ id: "5", label: "Schedule and run Manager training sessions", blockedBy: [] },
	{ id: "6", label: "Draft CEO company-wide announcement email", blockedBy: [] },
	{ id: "7", label: "Review and approve CEO announcement", blockedBy: [] },
	{ id: "8", label: "Create Intranet FAQ & Flexible Fridays landing page", blockedBy: [] },
	{ id: "9", label: "Send internal launch email + Slack announcement", blockedBy: [] },
	{ id: "10", label: "Launch Flexible Fridays Pilot (May 3)", blockedBy: [] },
];

const PLAN_SUMMARY = `# Plan summary

The content about the plan. The content about the plan. The content about the plan. The content about the plan. The content about the plan. The content about the plan. The content about the plan. The content about the plan. The content about the plan. The content about the plan. The content about the plan. The content about the plan. The content about the plan. The content about the plan. The content about the plan. The content about the plan. The content about the plan. The content about the plan. The content about the plan. The content about the plan.

## Heading

The content about the plan. The content about the plan. The content about the plan. The content about the plan. The content about the plan. The content about the plan. The content about the plan. The content about the plan. The content about the plan. The content about the plan. The content about the plan. The content about the plan. The content about the plan. The content about the plan. The content about the plan. The content about the plan. The content about the plan. The content about the plan. The content about the plan. The content about the plan.

### Sub heading

The content about the plan. The content about the plan. The content about the plan. The content about the plan. The content about the plan. The content about the plan. The content about the plan. The content about the plan. The content about the plan. The content about the plan. The content about the plan. The content about the plan. The content about the plan. The content about the plan. The content about the plan. The content about the plan. The content about the plan. The content about the plan. The content about the plan. The content about the plan.`;

function resolveBlockedByLabels(task: PlanTask): string[] {
	return task.blockedBy
		.map((blockedById) => {
			const taskIndex = PLAN_TASKS.findIndex((t) => t.id === blockedById);
			return taskIndex >= 0 ? `Task ${taskIndex + 1}` : null;
		})
		.filter((label): label is string => label !== null);
}

function resolveBlockedByText(task: PlanTask): string | undefined {
	if (task.blockedBy.length === 0) {
		return undefined;
	}

	const blockedTags = task.blockedBy
		.map((blockedById) => {
			const taskIndex = PLAN_TASKS.findIndex((t) => t.id === blockedById);
			return taskIndex >= 0 ? `#${taskIndex + 1}` : null;
		})
		.filter((tag): tag is string => tag !== null);

	if (blockedTags.length === 0) {
		return undefined;
	}

	return `Blocked by ${blockedTags.join(", ")}`;
}

function PlanDemoHeader() {
	return (
		<PlanHeader
			leading={<PlanAvatar emoji="✌️" />}
			title={<PlanTitle className="truncate text-sm leading-5 font-semibold text-text">Plan title</PlanTitle>}
			description={<PlanDescription className="text-xs leading-4 text-text-subtlest">{`${PLAN_TASKS.length} tasks • Description`}</PlanDescription>}
		/>
	);
}

function PlanDemoFooter() {
	return (
		<PlanFooter className="items-center justify-between">
			<div className="flex items-center gap-6">
				<div className="flex flex-col gap-0.5">
					<span className="text-xs leading-4 text-text-subtlest">Estimated cost and time</span>
					<span className="text-xs leading-4 font-medium text-text">$0.85 • ~3 min</span>
				</div>
				<div className="flex flex-col gap-0.5">
					<span className="text-xs leading-4 text-text-subtlest">Number of agents</span>
					<Select defaultValue="1x">
						<SelectTrigger variant="none" size="sm" className="!h-auto gap-1 !p-0 text-xs leading-4 font-medium text-text">
							<SelectValue />
						</SelectTrigger>
						<SelectContent alignItemWithTrigger={false} align="start" className="min-w-0">
							<SelectGroup>
								<SelectItem value="1x" className="py-1.5 pl-7 pr-2.5 text-xs">1x</SelectItem>
								<SelectItem value="2x" className="py-1.5 pl-7 pr-2.5 text-xs">2x</SelectItem>
								<SelectItem value="3x" className="py-1.5 pl-7 pr-2.5 text-xs">3x</SelectItem>
								<SelectItem value="4x" className="py-1.5 pl-7 pr-2.5 text-xs">4x</SelectItem>
							</SelectGroup>
						</SelectContent>
					</Select>
				</div>
			</div>
			<div className="flex items-center gap-2">
				<Button variant="outline">Open preview</Button>
				<Button>Build</Button>
			</div>
		</PlanFooter>
	);
}

export function PlanDemoTasksOnly() {
	const [isOpen, setIsOpen] = useState(true);

	return (
		<Plan className="w-[776px] max-w-full gap-0 py-0 shadow-xs" open={isOpen} onOpenChange={setIsOpen}>
			<PlanDemoHeader />

			<PlanContent className="px-0 pb-0 pt-4">
				<div className="px-3 pb-4">
					<PlanTaskList>
						{PLAN_TASKS.map((task, index) => (
							<PlanTaskItem key={task.id} index={index + 1} label={task.label} blockedByLabels={resolveBlockedByLabels(task)} />
						))}
					</PlanTaskList>
				</div>

				<PlanDemoFooter />
			</PlanContent>
		</Plan>
	);
}

export function PlanDemoSummaryAndTasks() {
	const [isOpen, setIsOpen] = useState(true);

	return (
		<Plan className="w-[776px] max-w-full gap-0 py-0 shadow-xs" open={isOpen} onOpenChange={setIsOpen}>
			<PlanDemoHeader />

			<PlanContent className="px-0 pb-0 pt-4">
				<Tabs defaultValue="summary" className="gap-4">
					<TabsList variant="line" className="h-10 w-auto justify-start mx-4">
						<TabsTrigger value="summary" className="flex-none">Summary</TabsTrigger>
						<TabsTrigger value="tasks" className="flex-none">Tasks ({PLAN_TASKS.length})</TabsTrigger>
					</TabsList>

					<TabsContent value="summary" className="px-4 pb-4">
						<PlanSummary summary={PLAN_SUMMARY} />
					</TabsContent>

					<TabsContent value="tasks" className="px-3 pb-4">
						<PlanTaskList showMoreLabel="Show more">
							{PLAN_TASKS.map((task, index) => (
								<PlanTaskItem key={task.id} index={index + 1} label={task.label} blockedByText={resolveBlockedByText(task)} />
							))}
						</PlanTaskList>
					</TabsContent>
				</Tabs>

				<PlanDemoFooter />
			</PlanContent>
		</Plan>
	);
}

export default function PlanDemo() {
	return <PlanDemoTasksOnly />;
}
