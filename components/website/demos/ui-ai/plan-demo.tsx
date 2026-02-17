"use client";

import { Plan, PlanAction, PlanAvatar, PlanChevronTrigger, PlanContent, PlanDescription, PlanHeader, PlanTaskItem, PlanTaskList, PlanTitle, type PlanTask } from "@/components/ui-ai/plan";
import { cn } from "@/lib/utils";
import { useState } from "react";

const PLAN_TASKS: PlanTask[] = [
	{ id: "1", label: "Create Flexible Fridays Work-back Plan", blockedBy: [] },
	{ id: "2", label: "Finalize Flexible Fridays policy wording", blockedBy: ["1"] },
	{ id: "3", label: "Create Manager toolkit content", blockedBy: ["2"], agent: "Content writer", agentAvatarSrc: "/avatar-agent/teamwork-agents/user-manual-writer.svg" },
	{ id: "4", label: "Record Manager toolkit Loom walkthrough", blockedBy: ["3"], agent: "Recap agent", agentAvatarSrc: "/avatar-agent/teamwork-agents/team-recap.svg" },
	{ id: "5", label: "Schedule and run Manager training sessions", blockedBy: ["3"] },
	{ id: "6", label: "Draft CEO company-wide announcement email", blockedBy: ["2"] },
	{ id: "7", label: "Review and approve CEO announcement", blockedBy: ["6"] },
	{ id: "8", label: "Create Intranet FAQ & Flexible Fridays landing page", blockedBy: ["2"] },
	{ id: "9", label: "Send internal launch email + Slack announcement", blockedBy: ["7", "8"] },
	{ id: "10", label: "Launch Flexible Fridays Pilot (May 3)", blockedBy: ["9"] },
];

function resolveBlockedByLabels(task: PlanTask): string[] {
	return task.blockedBy
		.map((blockedById) => {
			const taskIndex = PLAN_TASKS.findIndex((t) => t.id === blockedById);
			return taskIndex >= 0 ? `Task ${taskIndex + 1}` : null;
		})
		.filter((label): label is string => label !== null);
}

export default function PlanDemo() {
	const [isOpen, setIsOpen] = useState(true);

	return (
		<Plan className="w-[776px] max-w-full gap-3 py-0 shadow-xs" open={isOpen} onOpenChange={setIsOpen}>
			<PlanHeader className={cn("items-center px-4 pt-4", !isOpen && "pb-4")}>
				<div className="flex min-w-0 items-center gap-3">
					<PlanAvatar emoji="✌️" />
					<div className="min-w-0">
						<PlanTitle className="truncate text-sm leading-5 font-semibold text-text">Flexible Friday Project</PlanTitle>
						<PlanDescription className="text-xs leading-4 text-text-subtlest">{`${PLAN_TASKS.length} tasks • Plan description`}</PlanDescription>
					</div>
				</div>
				<PlanAction className="self-center">
					<PlanChevronTrigger isOpen={isOpen} onClick={() => setIsOpen((prev) => !prev)} />
				</PlanAction>
			</PlanHeader>

			<PlanContent className="px-3 pb-4">
				<PlanTaskList>
					{PLAN_TASKS.map((task, index) => (
						<PlanTaskItem key={task.id} index={index + 1} label={task.label} blockedByLabels={resolveBlockedByLabels(task)} agent={task.agent} agentAvatarSrc={task.agentAvatarSrc} />
					))}
				</PlanTaskList>
			</PlanContent>
		</Plan>
	);
}
