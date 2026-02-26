"use client";

import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/utils/theme-wrapper";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import NotificationIcon from "@atlaskit/icon/core/notification";
import {
	MakerProvider,
	useMakerState,
	useMakerActions,
	useMakerMeta,
} from "@/app/contexts/context-maker";
import { AppSidebar } from "./components/app-sidebar";
import MakerInitialView from "./components/maker-initial-view";
import MakerChatView from "./components/maker-chat-view";
import { ExecutionGridView } from "./components/execution-grid-view";
import ChatTitleRow from "./components/chat-title-row";
import { ConfigDialogs } from "./components/config-dialogs";
import { CollapsedSidebarBranding } from "./components/collapsed-sidebar-branding";

export default function MakerView() {
	return (
		<MakerProvider>
			<MakerLayout />
		</MakerProvider>
	);
}

function MakerLayout() {
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
		activeChatTitle,
		isActiveChatTitlePending,
	} = useMakerState();

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
		handleAddTask,
	} = useMakerActions();

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
	} = useMakerMeta();

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
				onCreatePlan={handleCreatePlan}
				onNewChat={handleNewChat}
			/>
			<SidebarInset className={isChatMode ? "h-svh overflow-hidden" : undefined}>
				<div className="pointer-events-none absolute top-0 right-0 z-20 flex h-14 items-center gap-0.5 pr-4 text-icon-subtle">
					<div className="pointer-events-auto">
						<ThemeToggle />
					</div>
					<Button
						aria-label="Notifications"
						size="icon"
						variant="ghost"
						className="pointer-events-auto"
					>
						<NotificationIcon label="" />
					</Button>
					<div className="pointer-events-auto flex size-8 items-center justify-center">
						<Avatar size="sm" className="cursor-pointer">
							<AvatarImage src="/avatar-human/austin-lambert.png" alt="User avatar" />
							<AvatarFallback>U</AvatarFallback>
						</Avatar>
					</div>
				</div>
				{!isChatMode ? (
					<CollapsedSidebarBranding
						isVisible={!sidebarOpen && !sidebarHovered}
						onExpandClick={() => setSidebarOpen(true)}
						onHoverEnter={handleHoverEnter}
						onHoverLeave={handleHoverLeave}
					/>
				) : null}
				{isChatMode ? (
					<div className="flex h-full min-h-0 flex-col">
						<ChatTitleRow
							title={activeChatTitle}
							isTitlePending={isActiveChatTitlePending}
							sidebarOpen={sidebarOpen}
							sidebarHovered={sidebarHovered}
							onExpandSidebar={() => setSidebarOpen(true)}
							onHoverEnter={handleHoverEnter}
							onHoverLeave={handleHoverLeave}
						/>
						<div className="min-h-0 flex-1">
							{isExecutionActive ? (
								<ExecutionGridView
									taskExecutions={taskExecutions}
									onAddTask={handleAddTask}
								/>
							) : (
								<MakerChatView />
							)}
						</div>
					</div>
				) : (
					<MakerInitialView />
				)}
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
