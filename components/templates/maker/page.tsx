"use client";

import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
	type MakerTab,
} from "@/app/contexts/context-maker";
import { AppSidebar } from "./components/app-sidebar";
import MakerInitialView from "./components/maker-initial-view";
import MakerChatView from "./components/maker-chat-view";
import { ExecutionGridView } from "./components/execution-grid-view";
import ChatTitleRow from "./components/chat-title-row";
import { ConfigDialogs } from "./components/config-dialogs";
import { MakerSearchPlaceholder } from "./components/maker-search-placeholder";

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
		activeTab,
		isChatMode,
		isExecutionActive,
		taskExecutions,
		chatHistory,
		activeChatId,
		sidebarRunHistory,
		runId,
		isGeneratingTitle,
		pendingTitleChatId,
	} = useMakerState();

	const {
		setSidebarOpen,
		setActiveTab,
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
				isSidebarCollapsedAndHovered && activeTab === "make" && "[&_[data-slot=sidebar-gap]]:w-0!",
			)}
		>
			<AppSidebar
				isOverlay={isSidebarCollapsedAndHovered && activeTab === "make"}
				isHoverReveal={isSidebarCollapsedAndHovered && activeTab !== "make"}
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
			<SidebarInset className="h-svh overflow-hidden">
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
				<Tabs
					value={activeTab}
					onValueChange={(value) => setActiveTab(value as MakerTab)}
					className="flex h-full min-h-0 flex-col gap-0"
				>
					<ChatTitleRow
						title={null}
						isTitlePending={false}
						leftSlot={(
							<TabsList className="mr-3 w-fit shrink-0">
								<TabsTrigger value="home">Home</TabsTrigger>
								<TabsTrigger value="make">Make</TabsTrigger>
								<TabsTrigger value="chat">Chat</TabsTrigger>
								<TabsTrigger value="search">Search</TabsTrigger>
							</TabsList>
						)}
						sidebarOpen={sidebarOpen}
						sidebarHovered={sidebarHovered}
						onExpandSidebar={() => setSidebarOpen(true)}
						onHoverEnter={handleHoverEnter}
						onHoverLeave={handleHoverLeave}
					/>
					<TabsContent value="home" className="min-h-0 flex-1 overflow-hidden">
						<div className="flex h-full flex-col items-center justify-center gap-3 text-text-subtlest">
							<p className="text-sm">Home</p>
						</div>
					</TabsContent>
					<TabsContent value="make" className="min-h-0 flex-1 overflow-hidden">
						{isExecutionActive ? (
							<ExecutionGridView
								taskExecutions={taskExecutions}
								onAddTask={handleAddTask}
							/>
						) : (
							<MakerInitialView />
						)}
					</TabsContent>
					<TabsContent value="chat" className="min-h-0 flex-1 overflow-hidden">
						{isChatMode ? (
							<MakerChatView />
						) : (
							<div className="flex h-full flex-col items-center justify-center gap-3 text-text-subtlest">
								<p className="text-sm">Start a conversation from the Home tab</p>
							</div>
						)}
					</TabsContent>
					<TabsContent value="search" className="min-h-0 flex-1 overflow-hidden">
						<MakerSearchPlaceholder />
					</TabsContent>
				</Tabs>
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
