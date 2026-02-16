"use client";

import { PlanCardWidget } from "@/components/templates/shared/components/plan-card-widget";
import type { ParsedPlanTask } from "@/components/templates/shared/lib/plan-widget";

const PLAN_TASKS: ParsedPlanTask[] = [
	{ id: "1", label: "Create Flexible Fridays Work-back Plan", blockedBy: [], agent: "Strategist" },
	{ id: "2", label: "Finalize Flexible Fridays policy wording", blockedBy: ["1"], agent: "Copywriter" },
	{ id: "3", label: "Create Manager toolkit content", blockedBy: ["2"], agent: "Copywriter" },
	{ id: "4", label: "Record Manager toolkit Loom walkthrough", blockedBy: ["3"], agent: "Creative" },
	{ id: "5", label: "Schedule and run Manager training sessions", blockedBy: ["3"], agent: "Coordinator" },
	{ id: "6", label: "Draft CEO company-wide announcement email", blockedBy: ["2"], agent: "Copywriter" },
	{ id: "7", label: "Review and approve CEO announcement", blockedBy: ["6"], agent: "Strategist" },
	{ id: "8", label: "Create Intranet FAQ & Flexible Fridays landing page", blockedBy: ["2"], agent: "Creative" },
	{ id: "9", label: "Send internal launch email + Slack announcement", blockedBy: ["7", "8"], agent: "Coordinator" },
	{ id: "10", label: "Launch Flexible Fridays Pilot (May 3)", blockedBy: ["9"], agent: "Strategist" },
];

export default function PlanDemo() {
	return (
		<PlanCardWidget
			title="Flexible Friday Project"
			description={`${PLAN_TASKS.length} tasks`}
			emoji="✌️"
			tasks={PLAN_TASKS}
			agents={["Coordinator", "Copywriter", "Creative", "Strategist"]}
			className="w-[776px] max-w-full"
		/>
	);
}
