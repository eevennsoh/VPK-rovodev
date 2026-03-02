"use client";

import { useCallback } from "react";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/utils/theme-wrapper";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription, EmptyContent } from "@/components/ui/empty";
import NotificationIcon from "@atlaskit/icon/core/notification";
import {
	MakeProvider,
	useMakeState,
	useMakeActions,
	useMakeMeta,
	type MakerTab,
} from "@/app/contexts/context-make";
import { MakeArtifactSurface } from "@/components/blocks/make-artifact/components/make-artifact-surface";
import { MakeGridSurface } from "@/components/blocks/make-grid/components/make-grid-surface";
import MakeGalleryContent from "@/components/blocks/make-page/components/make-gallery-content";
import { AppSidebar } from "./components/app-sidebar";
import { MakeFullscreenChat } from "./components/make-fullscreen-chat";
import ChatTitleRow from "./components/chat-title-row";
import { ConfigDialogs } from "./components/config-dialogs";
import { MakeSearchPlaceholder } from "./components/make-search-placeholder";
import { AnimatedCodeAscii } from "./components/animated-code-ascii";

export default function MakeView() {
	return (
		<MakeProvider>
			<MakeLayout />
		</MakeProvider>
	);
}

function MakeTabEmptyState({ onStartMaking }: Readonly<{ onStartMaking: () => void }>) {
	return (
		<div className="flex h-full items-center justify-center">
			<Empty>
				<EmptyHeader>
					<EmptyMedia className="mb-6">
						<AnimatedCodeAscii />
					</EmptyMedia>
					<EmptyTitle>Nothing made yet</EmptyTitle>
					<EmptyDescription>
						Use the Make toggle in Chat to start building apps, agents, skills, and automations.
					</EmptyDescription>
				</EmptyHeader>
				<EmptyContent>
					<Button onClick={onStartMaking} className="cursor-pointer">
						Start making
					</Button>
				</EmptyContent>
			</Empty>
		</div>
	);
}

function MakeLayout() {
	const {
		sidebarOpen,
		sidebarHovered,
		activeTab,
		isExecutionActive,
		executionState,
		taskExecutions,
		run,
		chatHistory,
		activeChatId,
		sidebarRunHistory,
		runId,
		isGeneratingTitle,
		pendingTitleChatId,
	} = useMakeState();

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
		handleNewChat,
		handleAddTask,
		activateMakeMode,
		deactivateMakeMode,
	} = useMakeActions();

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
	} = useMakeMeta();

	const handleNewProject = useCallback(() => {
		setActiveTab("chat");
		handleNewChat();
		activateMakeMode();
	}, [handleNewChat, setActiveTab, activateMakeMode]);

	const isSidebarCollapsedAndHovered = !sidebarOpen && sidebarHovered;
	const handleNewChatAndSwitchTab = useCallback(() => {
		setActiveTab("chat");
		handleNewChat();
		deactivateMakeMode();
	}, [handleNewChat, setActiveTab, deactivateMakeMode]);
	// Show execution grid while building; switch to artifact surface once execution is finished.
	const shouldShowExecutionGrid = executionState === "executing";

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
				onNewChat={handleNewChatAndSwitchTab}
				onNewProject={handleNewProject}
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
								<TabsTrigger value="chat">Chat</TabsTrigger>
								<TabsTrigger value="make">Make</TabsTrigger>
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
					<TabsContent value="chat" className="min-h-0 flex-1 overflow-hidden">
						<MakeFullscreenChat />
					</TabsContent>
					<TabsContent value="make" className="min-h-0 flex-1 overflow-hidden">
						{isExecutionActive && shouldShowExecutionGrid ? (
							<MakeGridSurface
								taskExecutions={taskExecutions}
								onAddTask={handleAddTask}
							/>
						) : isExecutionActive ? (
							<MakeArtifactSurface run={run} />
						) : sidebarRunHistory.length > 0 ? (
							<MakeGalleryContent />
						) : (
							<MakeTabEmptyState
								onStartMaking={() => {
									setActiveTab("chat");
									activateMakeMode();
								}}
							/>
						)}
					</TabsContent>
					<TabsContent value="search" className="min-h-0 flex-1 overflow-hidden">
						<MakeSearchPlaceholder />
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
