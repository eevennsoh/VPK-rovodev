"use client";

import { useState, useCallback, useRef } from "react";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import type { TaskExecution } from "@/components/templates/agents-team/lib/execution-data";
import { ExecutionGridView } from "@/components/templates/agents-team/components/execution-grid-view";
import { AgentGridSidebar } from "./components/agent-grid-sidebar";
import GridTitleRow from "./components/grid-title-row";

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
		content: "Auditing the current design system for consistency issues. Found 12 color token mismatches and 3 spacing inconsistencies across the component library. Preparing a remediation plan.",
	},
	{
		taskId: "TASK-4",
		taskLabel: "API schema validation",
		agentId: "agent-4",
		agentName: "Engineer",
		status: "completed",
		content: "Completed validation of all 24 API endpoints. All schemas conform to OpenAPI 3.1 specification. No breaking changes detected. Generated compatibility report for the team.",
	},
];

export default function AgentGridPage() {
	const [isOpen, setIsOpen] = useState(true);
	const [isHovered, setIsHovered] = useState(false);
	const hoverTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const [executions, setExecutions] = useState<TaskExecution[]>(MOCK_EXECUTIONS);

	const handleHoverEnter = useCallback(() => {
		if (hoverTimeoutRef.current) {
			clearTimeout(hoverTimeoutRef.current);
			hoverTimeoutRef.current = null;
		}
		setIsHovered(true);
	}, []);

	const handleHoverLeave = useCallback(() => {
		hoverTimeoutRef.current = setTimeout(() => {
			setIsHovered(false);
		}, 100);
	}, []);

	const handlePinSidebar = useCallback(() => {
		setIsOpen(true);
		setIsHovered(false);
	}, []);

	const handleAddTask = useCallback((message: string) => {
		const newExecution: TaskExecution = {
			taskId: `TASK-${Date.now()}`,
			taskLabel: message,
			agentId: `agent-${Date.now()}`,
			agentName: "Assistant",
			status: "working",
			content: "",
		};
		setExecutions((prev) => [...prev, newExecution]);
	}, []);

	return (
		<SidebarProvider
			open={isOpen || isHovered}
			onOpenChange={setIsOpen}
			style={
				{
					"--sidebar-width": "320px",
				} as React.CSSProperties
			}
			className={cn("[&_[data-slot=sidebar-gap]]:ease-[var(--ease-in-out)] [&_[data-slot=sidebar-container]]:ease-[var(--ease-in-out)]", !isOpen && isHovered && "[&_[data-slot=sidebar-gap]]:w-0!")}
		>
			<AgentGridSidebar isOverlay={!isOpen && isHovered} onPinSidebar={handlePinSidebar} onMouseEnter={handleHoverEnter} onMouseLeave={handleHoverLeave} />
			<SidebarInset className="h-svh overflow-hidden">
				<div className="flex h-full min-h-0 flex-col">
					<GridTitleRow
						title="Flexible Friday Plan"
						onNewChat={() => {}}
						sidebarOpen={isOpen}
						sidebarHovered={isHovered}
						onExpandSidebar={() => setIsOpen(true)}
						onHoverEnter={handleHoverEnter}
						onHoverLeave={handleHoverLeave}
					/>
					<div className="min-h-0 flex-1">
						<ExecutionGridView taskExecutions={executions} onAddTask={handleAddTask} />
					</div>
				</div>
			</SidebarInset>
		</SidebarProvider>
	);
}
