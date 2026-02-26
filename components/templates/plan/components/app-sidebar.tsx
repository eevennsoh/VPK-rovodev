"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
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
import CrossIcon from "@atlaskit/icon/core/cross";
import SearchIcon from "@atlaskit/icon/core/search";
import SidebarCollapseIcon from "@atlaskit/icon/core/sidebar-collapse";
import SidebarExpandIcon from "@atlaskit/icon/core/sidebar-expand";
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from "@/components/ui/input-group";
import {
	Empty,
	EmptyContent,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle,
} from "@/components/ui/empty";
import type { PlanSkill, PlanAgent } from "@/lib/agents-team-config-types";
import type { AgentRunListItem } from "@/lib/agents-team-run-types";
import type { RetryTaskGroupKey } from "@/components/templates/agents-team/lib/retry-task-groups";
import { filterItemsBySidebarSearch } from "@/components/templates/agents-team/lib/sidebar-search";
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
	skills: PlanSkill[];
	agents: PlanAgent[];
	onEditSkill: (skill: PlanSkill) => void;
	onNewSkill: () => void;
	onEditAgent: (agent: PlanAgent) => void;
	onNewAgent: () => void;
	onExportSkill: (name: string) => void;
	onExportAgent: (name: string) => void;
	onImportSkill: () => void;
	onImportAgent: () => void;
	onCreatePlan: () => void;
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
	onExportSkill,
	onExportAgent,
	onImportSkill,
	onImportAgent,
	onCreatePlan,
	...props
}: Readonly<AppSidebarProps>) {
	const { toggleSidebar } = useSidebar();
	const [searchQuery, setSearchQuery] = useState("");
	const normalizedSearchQuery = searchQuery.trim();
	const showGeneratingTitle = Boolean(isGeneratingTitle) && normalizedSearchQuery.length === 0;
	const filteredRunHistory = useMemo(
		() => filterItemsBySidebarSearch(runHistory, searchQuery, (run) => run.plan.title),
		[runHistory, searchQuery]
	);
	const filteredChatHistory = useMemo(
		() => filterItemsBySidebarSearch(chatHistory, searchQuery, (chat) => chat.title),
		[chatHistory, searchQuery]
	);
	const hasAnyHistory = runHistory.length > 0 || chatHistory.length > 0 || Boolean(isGeneratingTitle);
	const hasRunHistory = filteredRunHistory.length > 0;
	const hasChatHistory = filteredChatHistory.length > 0 || showGeneratingTitle;
	const showNoResults =
		normalizedSearchQuery.length > 0 &&
		filteredRunHistory.length === 0 &&
		filteredChatHistory.length === 0;

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
						<Link
							href="/agents-team"
							className="flex items-center gap-2 rounded-md p-1 text-text no-underline transition-colors hover:bg-surface-hovered hover:no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focused"
							aria-label="Go to agents team"
						>
							<Image src="/1p/rovo.svg" alt="" width={20} height={20} aria-hidden />
							<span
								style={{ font: token("font.heading.xsmall") }}
								className="text-text"
							>
								Rovo
							</span>
						</Link>
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
				{hasAnyHistory ? (
					<div className="flex flex-col">
						<div className="p-3">
							<InputGroup>
								<InputGroupAddon>
									<SearchIcon label="Search" />
								</InputGroupAddon>
								<InputGroupInput
									placeholder="Search"
									aria-label="Search"
									type="search"
									className="[&::-webkit-search-cancel-button]:hidden"
									value={searchQuery}
									onChange={(event) => setSearchQuery(event.currentTarget.value)}
								/>
								{searchQuery && (
									<InputGroupAddon align="inline-end">
										<InputGroupButton
											size="icon-xs"
											variant="ghost"
											onClick={() => setSearchQuery("")}
											aria-label="Clear search"
										>
											<CrossIcon label="" size="small" />
										</InputGroupButton>
									</InputGroupAddon>
								)}
							</InputGroup>
						</div>
						{hasRunHistory ? (
							<SidebarRunHistory
								items={filteredRunHistory}
								activeRunId={activeRunId}
								onSelectRun={onSelectRun}
								onDeleteRun={onDeleteRun}
								onRetryRunGroup={onRetryRunGroup}
							/>
						) : null}
						{hasChatHistory ? (
							<SidebarChatHistory
								items={filteredChatHistory}
								activeChatId={activeChatId}
								isGeneratingTitle={showGeneratingTitle}
								pendingChatId={pendingTitleChatId}
								sectionLabel="Chats"
								onSelectChat={onSelectChat}
								onDeleteChat={onDeleteChat}
							/>
						) : null}
						{showNoResults ? (
							<div className="px-3 pb-2">
								<Empty width="narrow" className="gap-4 py-2">
									<EmptyHeader>
										<EmptyMedia>
											<Image
												src="/illustration-spot/empty-state/comment/light.svg"
												alt=""
												width={160}
												height={160}
												aria-hidden
												className="dark:hidden"
											/>
											<Image
												src="/illustration-spot/empty-state/comment/dark.svg"
												alt=""
												width={160}
												height={160}
												aria-hidden
												className="hidden dark:block"
											/>
										</EmptyMedia>
										<EmptyTitle>No results</EmptyTitle>
										<EmptyDescription>
											We couldn&apos;t find anything matching your search.
										</EmptyDescription>
									</EmptyHeader>
									<EmptyContent>
										<Button
											variant="outline"
											size="sm"
											onClick={() => setSearchQuery("")}
										>
											Clear search
										</Button>
									</EmptyContent>
								</Empty>
							</div>
						) : null}
					</div>
				) : (
					<div className="flex flex-1 items-center justify-center px-3">
						<SidebarEmptyState onCreateOne={onCreatePlan} />
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
					onExportSkill={onExportSkill}
					onExportAgent={onExportAgent}
					onImportSkill={onImportSkill}
					onImportAgent={onImportAgent}
				/>
			</SidebarFooterSlot>
		</Sidebar>
	);
}
