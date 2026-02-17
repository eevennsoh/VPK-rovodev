"use client";

import { useState, useCallback } from "react";
import type { TaskExecution } from "@/components/templates/agents-team/lib/execution-data";
import { ExecutionGridView } from "@/components/templates/agents-team/components/execution-grid-view";

const MOCK_EXECUTIONS: TaskExecution[] = [
	{
		taskId: "TASK-1",
		taskLabel: "Research competitor analysis",
		agentId: "agent-1",
		agentName: "Researcher",
		status: "working",
		content:
			"I'm currently analyzing the top 5 competitors in the market. So far I've identified key differentiators in pricing strategy and feature sets. The analysis covers market positioning, user demographics, and growth trajectories.",
	},
	{
		taskId: "TASK-2",
		taskLabel: "Draft product requirements",
		agentId: "agent-2",
		agentName: "Product Manager",
		status: "working",
		content:
			"Drafting the PRD based on stakeholder interviews. Key sections include user stories, acceptance criteria, and technical constraints. I've completed the executive summary and am now working on the detailed requirements.",
	},
	{
		taskId: "TASK-3",
		taskLabel: "Design system audit",
		agentId: "agent-3",
		agentName: "Designer",
		status: "working",
		content:
			"Auditing the current design system for consistency issues. Found 12 color token mismatches and 3 spacing inconsistencies across the component library. Preparing a remediation plan.",
	},
	{
		taskId: "TASK-4",
		taskLabel: "API schema validation",
		agentId: "agent-4",
		agentName: "Engineer",
		status: "completed",
		content:
			"Completed validation of all 24 API endpoints. All schemas conform to OpenAPI 3.1 specification. No breaking changes detected. Generated compatibility report for the team.",
	},
];

export default function AgentGridPage() {
	const [executions, setExecutions] = useState<TaskExecution[]>(MOCK_EXECUTIONS);

	const handleAddTask = useCallback((message: string) => {
		const newExecution: TaskExecution = {
			taskId: `TASK-${executions.length + 1}`,
			taskLabel: message,
			agentId: `agent-${executions.length + 1}`,
			agentName: "Assistant",
			status: "working",
			content: "",
		};
		setExecutions((prev) => [...prev, newExecution]);
	}, [executions.length]);

	return (
		<div className="h-screen w-screen bg-surface">
			<ExecutionGridView
				taskExecutions={executions}
				onAddTask={handleAddTask}
			/>
		</div>
	);
}
