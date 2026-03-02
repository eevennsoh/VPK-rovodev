"use client";

import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import type {
	MakerAgent,
	MakerSkill,
} from "@/lib/make-config-types";
import type {
	AgentRunListItem,
	AgentRunTask,
} from "@/lib/make-run-types";
import { type TaskExecution } from "@/components/templates/make/lib/execution-data";
import { MakeGridSurface } from "./components/make-grid-surface";
import { AppSidebar } from "@/components/templates/make/components/app-sidebar";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ThemeToggle } from "@/components/utils/theme-wrapper";
import NotificationIcon from "@atlaskit/icon/core/notification";
import SummaryTitleRow from "@/components/blocks/make-artifact/components/summary-title-row";

const MOCK_EXECUTIONS: TaskExecution[] = [
	{
		taskId: "TASK-1",
		taskLabel: "Research competitor analysis",
		agentId: "agent-1",
		agentName: "Researcher",
		agentAvatarUrl: "/avatar-agent/strategy-agents/wildcard-1.svg",
		status: "working",
		content:
			"I'm currently analyzing the top 5 competitors in the market. So far I've identified key differentiators in pricing strategy and feature sets. The analysis covers market positioning, user demographics, and growth trajectories.",
	},
	{
		taskId: "TASK-2",
		taskLabel: "Draft product requirements",
		agentId: "agent-2",
		agentName: "Product Manager",
		agentAvatarUrl: "/avatar-agent/product-agents/wildcard-1.svg",
		status: "working",
		content:
			"Drafting the PRD based on stakeholder interviews. Key sections include user stories, acceptance criteria, and technical constraints. I've completed the executive summary and am now working on the detailed requirements.",
	},
	{
		taskId: "TASK-3",
		taskLabel: "Design system audit",
		agentId: "agent-3",
		agentName: "Designer",
		agentAvatarUrl: "/avatar-agent/dev-agents/code-reviewer.svg",
		status: "working",
		content: "Auditing the current design system for consistency issues. Found 12 color token mismatches and 3 spacing inconsistencies across the component library. Preparing a remediation plan.",
	},
	{
		taskId: "TASK-4",
		taskLabel: "API schema validation",
		agentId: "agent-4",
		agentName: "Engineer",
		agentAvatarUrl: "/avatar-agent/dev-agents/basic-coding-agent-template.svg",
		status: "completed",
		content: "Completed validation of all 24 API endpoints. All schemas conform to OpenAPI 3.1 specification. No breaking changes detected. Generated compatibility report for the team.",
	},
];

const MOCK_RUN_CREATED_AT = "2025-01-15T10:00:00.000Z";
const MOCK_RUN_UPDATED_AT = "2025-01-15T10:10:51.000Z";

function toRunTasks(executions: ReadonlyArray<TaskExecution>): AgentRunTask[] {
	return executions.map((execution) => ({
		id: execution.taskId,
		label: execution.taskLabel,
		agentName: execution.agentName,
		agentId: execution.agentId,
		blockedBy: [],
		status: execution.status === "completed" ? "done" : "in-progress",
		attempts: 1,
		startedAt: null,
		completedAt: execution.status === "completed" ? new Date().toISOString() : null,
		error: null,
		output: null,
		outputSummary: null,
	}));
}

export default function MakeGridPage() {
	const [isOpen, setIsOpen] = useState(true);
	const [isHovered, setIsHovered] = useState(false);
	const hoverTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const [executions] = useState<TaskExecution[]>(MOCK_EXECUTIONS);

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

	const runHistory = useMemo<AgentRunListItem[]>(() => {
		const runTasks = toRunTasks(executions);
		return [
			{
				runId: "mock-run",
				status: "running",
				error: null,
				createdAt: MOCK_RUN_CREATED_AT,
				updatedAt: MOCK_RUN_UPDATED_AT,
				completedAt: null,
				plan: {
					title: "Flexible Friday Plan",
					description: "Mock run for the execution grid demo.",
					emoji: "\u{1F525}",
					agents: Array.from(
						new Set(runTasks.map((task) => task.agentName))
					),
					tasks: runTasks.map((task) => ({
						id: task.id,
						label: task.label,
						agent: task.agentName,
						blockedBy: task.blockedBy,
					})),
				},
				tasks: runTasks,
			},
		];
	}, [executions]);

	const handleUnusedSelectChat = useCallback((chatId: string) => {
		void chatId;
	}, []);

	const handleUnusedDeleteChat = useCallback((chatId: string) => {
		void chatId;
	}, []);

	const handleUnusedEditSkill = useCallback((skill: MakerSkill) => {
		void skill.name;
	}, []);

	const handleUnusedEditAgent = useCallback((agent: MakerAgent) => {
		void agent.name;
	}, []);

	const handleUnusedCreate = useCallback(() => {
		void 0;
	}, []);

	const handleUnusedExport = useCallback((name: string) => {
		void name;
	}, []);

	useEffect(() => {
		return () => {
			if (hoverTimeoutRef.current) {
				clearTimeout(hoverTimeoutRef.current);
			}
		};
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
			className={cn(
				"overflow-hidden [&_[data-slot=sidebar-gap]]:ease-[var(--ease-in-out)] [&_[data-slot=sidebar-container]]:ease-[var(--ease-in-out)]"
			)}
		>
			<AppSidebar
				isOverlay={false}
				isHoverReveal={!isOpen && isHovered}
				onPinSidebar={handlePinSidebar}
				chatHistory={[]}
				activeChatId={null}
				runHistory={runHistory}
				activeRunId="mock-run"
				onSelectChat={handleUnusedSelectChat}
				onDeleteChat={handleUnusedDeleteChat}
				onMouseEnter={handleHoverEnter}
				onMouseLeave={handleHoverLeave}
				skills={[]}
				agents={[]}
				onEditSkill={handleUnusedEditSkill}
				onNewSkill={handleUnusedCreate}
				onEditAgent={handleUnusedEditAgent}
				onNewAgent={handleUnusedCreate}
				onExportSkill={handleUnusedExport}
				onExportAgent={handleUnusedExport}
				onNewChat={handleUnusedCreate}
				onNewProject={handleUnusedCreate}
			/>
			<SidebarInset className="h-svh min-w-0 overflow-hidden">
				<div className="flex h-full min-h-0 min-w-0 flex-col">
					<div className="flex items-center justify-between border-b border-border px-4 py-2">
						<Tabs defaultValue="make">
							<TabsList>
								<TabsTrigger value="home">Home</TabsTrigger>
								<TabsTrigger value="make">Make</TabsTrigger>
								<TabsTrigger value="chat">Chat</TabsTrigger>
								<TabsTrigger value="search">Search</TabsTrigger>
							</TabsList>
						</Tabs>
						<div className="flex items-center gap-1 text-icon-subtle">
							<ThemeToggle />
							<Button aria-label="Notifications" size="icon" variant="ghost">
								<NotificationIcon label="" />
							</Button>
							<Avatar size="sm">
								<AvatarImage src="" alt="Profile" />
								<AvatarFallback>M</AvatarFallback>
							</Avatar>
						</div>
					</div>
					<SummaryTitleRow
						title="Flexible Friday Plan"
						sidebarOpen={isOpen}
						sidebarHovered={isHovered}
						onExpandSidebar={() => setIsOpen(true)}
						onHoverEnter={handleHoverEnter}
						onHoverLeave={handleHoverLeave}
					/>
					<div className="min-h-0 min-w-0 flex-1">
						<MakeGridSurface taskExecutions={executions} />
					</div>
				</div>
			</SidebarInset>
		</SidebarProvider>
	);
}
