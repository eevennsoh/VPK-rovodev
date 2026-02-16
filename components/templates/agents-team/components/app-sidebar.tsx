"use client";

import Image from "next/image";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
	Sidebar,
	SidebarContent,
	SidebarFooter as SidebarFooterSlot,
	SidebarHeader,
	useSidebar,
} from "@/components/ui/sidebar";
import { ThemeToggle } from "@/components/utils/theme-wrapper";
import { token } from "@/lib/tokens";
import SidebarCollapseIcon from "@atlaskit/icon/core/sidebar-collapse";
import SidebarExpandIcon from "@atlaskit/icon/core/sidebar-expand";
import type { AgentsTeamSkill, AgentsTeamAgent } from "@/lib/agents-team-config-types";
import SidebarChatHistory, {
	type ChatHistoryItem,
} from "./sidebar-chat-history";
import SidebarEmptyState from "./sidebar-empty-state";
import SidebarFooter from "./sidebar-footer";
import { TaskTrackerCard } from "./task-tracker-card";
import type { TaskStatusGroups } from "../lib/execution-data";

interface AppSidebarProps extends React.ComponentProps<typeof Sidebar> {
	isOverlay?: boolean;
	isHoverReveal?: boolean;
	onPinSidebar?: () => void;
	chatHistory: ChatHistoryItem[];
	activeChatId: string | null;
	isGeneratingTitle?: boolean;
	onSelectChat: (id: string) => void;
	onDeleteChat: (id: string) => void;
	isExecuting?: boolean;
	executionData?: {
		planTitle: string;
		planEmoji: string;
		taskStatusGroups: TaskStatusGroups;
		runStatus: "running" | "completed" | "failed";
		runCreatedAt: string | null;
		runCompletedAt: string | null;
		onManageTasks?: () => void;
	};
	skills: AgentsTeamSkill[];
	agents: AgentsTeamAgent[];
	onEditSkill: (skill: AgentsTeamSkill) => void;
	onNewSkill: () => void;
	onEditAgent: (agent: AgentsTeamAgent) => void;
	onNewAgent: () => void;
}

export function AppSidebar({
	isOverlay,
	isHoverReveal,
	onPinSidebar,
	chatHistory,
	activeChatId,
	isGeneratingTitle,
	onSelectChat,
	onDeleteChat,
	isExecuting,
	executionData,
	skills,
	agents,
	onEditSkill,
	onNewSkill,
	onEditAgent,
	onNewAgent,
	...props
}: Readonly<AppSidebarProps>) {
	const { toggleSidebar } = useSidebar();

	return (
		<Sidebar
			collapsible="offcanvas"
			className="[&_[data-slot=sidebar-inner]]:relative [&_[data-slot=sidebar-inner]]:bg-bg-neutral-subtle"
			{...props}
		>
			<SidebarHeader className="h-14 bg-bg-neutral-subtle px-4 py-0">
				<div className="flex h-full items-center justify-between">
					<div className="flex items-center text-icon-subtle">
						<div
							className={cn(
								"w-9 overflow-hidden transition-all duration-[var(--duration-normal)] ease-out",
								!isHoverReveal && !isOverlay && "w-0 opacity-0",
							)}
						>
							<Button
								aria-label="Pin sidebar"
								size="icon"
								variant="ghost"
								onClick={onPinSidebar}
							>
								<SidebarExpandIcon label="" />
							</Button>
						</div>
						<div className="flex items-center gap-2 p-1">
							<Image src="/1p/rovo.svg" alt="" width={20} height={20} aria-hidden />
							<span
								style={{ font: token("font.heading.xsmall") }}
								className="text-text"
							>
								Rovo
							</span>
						</div>
					</div>
					<div className="flex items-center text-icon-subtle">
						<ThemeToggle />
						<div
							className={cn(
								"w-9 overflow-hidden transition-all duration-[var(--duration-normal)] ease-out",
								(isOverlay || isHoverReveal) && "w-0 opacity-0",
							)}
						>
							<Button
								aria-label="Collapse sidebar"
								size="icon"
								variant="ghost"
								onClick={toggleSidebar}
							>
								<SidebarCollapseIcon label="" />
							</Button>
						</div>
					</div>
				</div>
			</SidebarHeader>
			<SidebarContent className="bg-bg-neutral-subtle pb-[7.5rem]">
				{isExecuting && executionData ? (
						<TaskTrackerCard
							planTitle={executionData.planTitle}
							planEmoji={executionData.planEmoji}
							taskStatusGroups={executionData.taskStatusGroups}
							runStatus={executionData.runStatus}
							runCreatedAt={executionData.runCreatedAt}
							runCompletedAt={executionData.runCompletedAt}
							onManageTasks={executionData.onManageTasks}
						/>
				) : chatHistory.length > 0 || isGeneratingTitle ? (
					<SidebarChatHistory
						items={chatHistory}
						activeChatId={activeChatId}
						isGeneratingTitle={isGeneratingTitle}
						onSelectChat={onSelectChat}
						onDeleteChat={onDeleteChat}
					/>
				) : (
					<div className="flex flex-1 items-center justify-center px-3">
						<SidebarEmptyState />
					</div>
				)}
			</SidebarContent>
			<SidebarFooterSlot className="absolute bottom-0 left-0 right-0 z-10 bg-bg-neutral-subtle p-0">
				<SidebarFooter
					skills={skills}
					agents={agents}
					onEditSkill={onEditSkill}
					onNewSkill={onNewSkill}
					onEditAgent={onEditAgent}
					onNewAgent={onNewAgent}
				/>
			</SidebarFooterSlot>
		</Sidebar>
	);
}
