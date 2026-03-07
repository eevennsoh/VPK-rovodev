"use client";

import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/utils/theme-wrapper";
import { cn } from "@/lib/utils";
import {
	PlanProvider,
	usePlanState,
	usePlanActions,
	usePlanMeta,
} from "@/app/contexts/context-plan";
import { AppSidebar } from "./components/app-sidebar";
import PlanInitialView from "./components/plan-initial-view";
import PlanChatView from "./components/plan-chat-view";
import { ExecutionGridView } from "./components/execution-grid-view";
import { ConfigDialogs } from "./components/config-dialogs";
import NotificationIcon from "@atlaskit/icon/core/notification";

function TopNavBar() {
	return (
		<div className="flex items-center justify-between border-b border-border px-4 py-2">
			<Tabs defaultValue="make">
				<TabsList>
					<TabsTrigger value="chat">Chat</TabsTrigger>
					<TabsTrigger value="make">Make</TabsTrigger>
				</TabsList>
			</Tabs>

			<div className="flex items-center gap-1">
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
	);
}

export default function PlanView() {
	return (
		<PlanProvider>
			<PlanLayout />
		</PlanProvider>
	);
}

function PlanLayout() {
	const {
		sidebarOpen,
		sidebarHovered,
		isChatMode,
		isExecutionActive,
		taskExecutions,
		chatHistory,
		activeChatId,
		sidebarRunHistory,
		runId,
		isGeneratingTitle,
		pendingTitleChatId,
	} = usePlanState();

	const {
		setSidebarOpen,
		handleHoverEnter,
		handleHoverLeave,
		handlePinSidebar,
		handleSelectRun,
		handleDeleteRun,
		handleRetryRunGroup,
		handleSelectChat,
		handleDeleteChat,
		handleCreatePlan,
		handleNewChat,
	} = usePlanActions();

	const {
		skills,
		agents,
		skillDialogProps,
		agentDialogProps,
		sidebarConfigHandlers,
		importDialog,
		closeImportDialog,
		handleImport,
		deleteAlert,
		closeDeleteAlert,
		handleDeleteConfirm,
	} = usePlanMeta();

	const isSidebarCollapsedAndHovered = !sidebarOpen && sidebarHovered;

	return (
		<SidebarProvider
			open={sidebarOpen || sidebarHovered}
			onOpenChange={setSidebarOpen}
			style={
				{
					"--sidebar-width": "320px",
				} as React.CSSProperties
			}
			className={cn(
				"[&_[data-slot=sidebar-gap]]:ease-[var(--ease-in-out)] [&_[data-slot=sidebar-container]]:ease-[var(--ease-in-out)]",
				isSidebarCollapsedAndHovered && !isChatMode && "[&_[data-slot=sidebar-gap]]:w-0!",
			)}
		>
			<AppSidebar
				isOverlay={isSidebarCollapsedAndHovered && !isChatMode}
				isHoverReveal={isSidebarCollapsedAndHovered && isChatMode}
				onPinSidebar={handlePinSidebar}
				chatHistory={chatHistory}
				activeChatId={activeChatId}
				runHistory={sidebarRunHistory}
				activeRunId={runId}
				isGeneratingTitle={isGeneratingTitle}
				pendingTitleChatId={pendingTitleChatId}
				onSelectRun={handleSelectRun}
				onDeleteRun={handleDeleteRun}
				onRetryRunGroup={handleRetryRunGroup}
				onSelectChat={handleSelectChat}
				onDeleteChat={handleDeleteChat}
				onMouseEnter={handleHoverEnter}
				onMouseLeave={handleHoverLeave}
				skills={skills}
				agents={agents}
				onEditSkill={sidebarConfigHandlers.onEditSkill}
				onNewSkill={sidebarConfigHandlers.onNewSkill}
				onEditAgent={sidebarConfigHandlers.onEditAgent}
				onNewAgent={sidebarConfigHandlers.onNewAgent}
				onExportSkill={sidebarConfigHandlers.onExportSkill}
				onExportAgent={sidebarConfigHandlers.onExportAgent}
				onImportSkill={sidebarConfigHandlers.onImportSkill}
				onImportAgent={sidebarConfigHandlers.onImportAgent}
				onNewChat={handleNewChat}
				onCreatePlan={handleCreatePlan}
			/>
			<SidebarInset className="h-svh overflow-hidden">
				<div className="flex h-full min-h-0 flex-col">
					<TopNavBar />
					<div className="min-h-0 flex-1">
						{isChatMode ? (
							isExecutionActive ? (
								<ExecutionGridView
									taskExecutions={taskExecutions}
								/>
							) : (
								<PlanChatView />
							)
						) : (
							<PlanInitialView />
						)}
					</div>
				</div>
			</SidebarInset>
			<ConfigDialogs
				skillDialog={skillDialogProps}
				agentDialog={agentDialogProps}
				importDialog={importDialog}
				onImportDialogClose={closeImportDialog}
				onImport={handleImport}
				deleteAlert={deleteAlert}
				onDeleteAlertClose={closeDeleteAlert}
				onDeleteConfirm={handleDeleteConfirm}
			/>
		</SidebarProvider>
	);
}
