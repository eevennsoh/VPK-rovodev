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
import SearchIcon from "@atlaskit/icon/core/search";
import SidebarCollapseIcon from "@atlaskit/icon/core/sidebar-collapse";
import SidebarExpandIcon from "@atlaskit/icon/core/sidebar-expand";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import type { AgentsTeamSkill, AgentsTeamAgent } from "@/lib/agents-team-config-types";
import type { AgentRunListItem } from "@/lib/agents-team-run-types";
import type { RetryTaskGroupKey } from "@/components/templates/agents-team/lib/retry-task-groups";
import SidebarChatHistory, {
	type ChatHistoryItem,
} from "./sidebar-chat-history";
import SidebarEmptyState from "./sidebar-empty-state";
import SidebarFooter from "./sidebar-footer";
import SidebarRunHistory from "./sidebar-run-history";

interface AppSidebarProps extends React.ComponentProps<typeof Sidebar> {
	isOverlay?: boolean;
	isHoverReveal?: boolean;
	onPinSidebar?: () => void;
	chatHistory: ChatHistoryItem[];
	activeChatId: string | null;
	runHistory: AgentRunListItem[];
	activeRunId?: string | null;
	isGeneratingTitle?: boolean;
	pendingTitleChatId?: string | null;
	onSelectRun?: (runId: string) => void;
	onDeleteRun?: (runId: string) => void;
	onRetryRunGroup?: (
		runId: string,
		groupKey: RetryTaskGroupKey,
		taskIds: string[]
	) => Promise<void> | void;
	onSelectChat: (id: string) => void;
	onDeleteChat: (id: string) => void;
	skills: AgentsTeamSkill[];
	agents: AgentsTeamAgent[];
	onEditSkill: (skill: AgentsTeamSkill) => void;
	onNewSkill: () => void;
	onEditAgent: (agent: AgentsTeamAgent) => void;
	onNewAgent: () => void;
	onCreateAgentTeam: () => void;
}

export function AppSidebar({
	isOverlay,
	isHoverReveal,
	onPinSidebar,
	chatHistory,
	activeChatId,
	runHistory,
	activeRunId,
	isGeneratingTitle,
	pendingTitleChatId,
	onSelectRun,
	onDeleteRun,
	onRetryRunGroup,
	onSelectChat,
	onDeleteChat,
	skills,
	agents,
	onEditSkill,
	onNewSkill,
	onEditAgent,
	onNewAgent,
	onCreateAgentTeam,
	...props
}: Readonly<AppSidebarProps>) {
	const { toggleSidebar } = useSidebar();
	const hasRunHistory = runHistory.length > 0;
	const hasChatHistory = chatHistory.length > 0 || Boolean(isGeneratingTitle);

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
				{hasRunHistory || hasChatHistory ? (
					<div className="flex flex-col">
						<div className="p-3">
							<InputGroup>
								<InputGroupAddon>
									<SearchIcon label="Search" />
								</InputGroupAddon>
								<InputGroupInput placeholder="Search" aria-label="Search" />
							</InputGroup>
						</div>
						{hasRunHistory ? (
							<SidebarRunHistory
								items={runHistory}
								activeRunId={activeRunId}
								onSelectRun={onSelectRun}
								onDeleteRun={onDeleteRun}
								onRetryRunGroup={onRetryRunGroup}
							/>
						) : null}
						{hasChatHistory ? (
							<SidebarChatHistory
								items={chatHistory}
								activeChatId={activeChatId}
								isGeneratingTitle={isGeneratingTitle}
								pendingChatId={pendingTitleChatId}
								sectionLabel="Chats"
								onSelectChat={onSelectChat}
								onDeleteChat={onDeleteChat}
							/>
						) : null}
					</div>
				) : (
					<div className="flex flex-1 items-center justify-center px-3">
						<SidebarEmptyState onCreateOne={onCreateAgentTeam} />
					</div>
				)}
			</SidebarContent>
			<SidebarFooterSlot className="absolute bottom-0 left-0 right-0 z-10 bg-surface p-0">
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
