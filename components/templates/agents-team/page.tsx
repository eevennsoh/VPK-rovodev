"use client";

import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import {
	PlanProvider,
	usePlanState,
	usePlanActions,
	usePlanMeta,
} from "@/app/contexts/context-agents-team";
import { AppSidebar } from "./components/app-sidebar";
import PlanInitialView from "./components/agents-team-initial-view";
import PlanChatView from "./components/agents-team-chat-view";
import { ExecutionGridView } from "./components/execution-grid-view";
import ChatTitleRow from "./components/chat-title-row";
import { ConfigDialogs } from "./components/config-dialogs";
import { CollapsedSidebarBranding } from "./components/collapsed-sidebar-branding";

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
		activeChatTitle,
		isActiveChatTitlePending,
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
		handleAddTask,
	} = usePlanActions();

	const {
		skills,
		agents,
		skillDialogProps,
		agentDialogProps,
		sidebarConfigHandlers,
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
				onCreatePlan={handleCreatePlan}
			/>
			<SidebarInset className={isChatMode ? "h-svh overflow-hidden" : undefined}>
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
							onNewChat={handleNewChat}
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
								<PlanChatView />
							)}
						</div>
					</div>
				) : (
					<PlanInitialView />
				)}
			</SidebarInset>
			<ConfigDialogs skillDialog={skillDialogProps} agentDialog={agentDialogProps} />
		</SidebarProvider>
	);
}
