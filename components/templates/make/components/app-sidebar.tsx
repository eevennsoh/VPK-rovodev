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
import type { MakeSkill, MakeAgent } from "@/lib/make-config-types";
import type { AgentRunListItem } from "@/lib/make-run-types";
import type { RetryTaskGroupKey } from "@/components/templates/make/lib/retry-task-groups";
import { filterItemsBySidebarSearch } from "@/components/templates/make/lib/sidebar-search";
import { mapRunsToSidebarAppItems } from "@/components/templates/make/lib/make-artifact-items";
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
	initialNowMs?: number;
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
	skills: MakeSkill[];
	agents: MakeAgent[];
	onEditSkill: (skill: MakeSkill) => void;
	onNewSkill: () => void;
	onEditAgent: (agent: MakeAgent) => void;
	onNewAgent: () => void;
	onExportSkill: (name: string) => void;
	onExportAgent: (name: string) => void;
	onNewChat: () => void;
	onNewProject: () => void;
}

export function AppSidebar({
	isOverlay,
	isHoverReveal,
	onPinSidebar,
	chatHistory,
	activeChatId,
	runHistory,
	activeRunId,
	initialNowMs,
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
	onNewChat,
	onNewProject,
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
	const appArtifacts = useMemo(
		() => mapRunsToSidebarAppItems(runHistory),
		[runHistory],
	);
	const hasAnyHistory =
		runHistory.length > 0 ||
		chatHistory.length > 0 ||
		Boolean(isGeneratingTitle);
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
								"w-9 overflow-hidden transition-all duration-normal ease-out",
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
							href="/make"
							className="flex items-center gap-2 rounded-md p-1 text-text no-underline transition-colors hover:bg-surface-hovered hover:no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focused"
							aria-label="Go to plan"
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
					<div
						className={cn(
							"w-9 overflow-hidden text-icon-subtle transition-all duration-normal ease-out",
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
			</SidebarHeader>
			<SidebarContent className="bg-bg-neutral-subtle">
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
							<div className="mt-3 grid grid-cols-2 gap-2">
								<button
									type="button"
									onClick={onNewChat}
									className="flex cursor-pointer items-center justify-center rounded-full border border-dashed border-border bg-bg-neutral-subtle px-3 py-1.5 text-sm font-medium text-text-subtle transition-colors hover:bg-surface-hovered"
								>
									Chat
								</button>
								<button
									type="button"
									onClick={onNewProject}
									className="flex cursor-pointer items-center justify-center rounded-full border border-dashed border-border bg-bg-neutral-subtle px-3 py-1.5 text-sm font-medium text-text-subtle transition-colors hover:bg-surface-hovered"
								>
									Make
								</button>
							</div>
						</div>
						<div className="flex w-full flex-col">
							{hasRunHistory ? (
								<SidebarRunHistory
									items={filteredRunHistory}
									activeRunId={activeRunId}
									initialNowMs={initialNowMs}
									onSelectRun={onSelectRun}
									onDeleteRun={onDeleteRun}
									onRetryRunGroup={onRetryRunGroup}
								/>
							) : null}
						</div>
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
						<SidebarEmptyState onNewChat={onNewChat} onNewProject={onNewProject} />
					</div>
				)}
			</SidebarContent>
			<SidebarFooterSlot className="max-h-[50%] bg-surface p-0">
				<SidebarFooter
					apps={appArtifacts}
					skills={skills}
					agents={agents}
					onEditSkill={onEditSkill}
					onNewSkill={onNewSkill}
					onEditAgent={onEditAgent}
					onNewAgent={onNewAgent}
					onExportSkill={onExportSkill}
					onExportAgent={onExportAgent}
					onSelectApp={onSelectRun}
				/>
			</SidebarFooterSlot>
		</Sidebar>
	);
}
