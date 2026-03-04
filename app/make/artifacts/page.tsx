"use client";

import { useCallback, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/utils/theme-wrapper";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
	Empty,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle,
	EmptyDescription,
	EmptyContent,
} from "@/components/ui/empty";
import NotificationIcon from "@atlaskit/icon/core/notification";
import {
	MakeProvider,
	useMakeState,
	useMakeActions,
	useMakeMeta,
} from "@/app/contexts/context-make";
import DiscoveryGallery from "@/components/blocks/discovery-gallery/page";
import { MakeArtifactSurface } from "@/components/blocks/make-artifact/components/make-artifact-surface";
import { MakeGridSurface } from "@/components/blocks/make-grid/components/make-grid-surface";
import MakeGalleryContent from "@/components/blocks/make-page/components/make-gallery-content";
import { AppSidebar } from "@/components/templates/make/components/app-sidebar";
import ChatTitleRow from "@/components/templates/make/components/chat-title-row";
import { ConfigDialogs } from "@/components/templates/make/components/config-dialogs";
import { AnimatedCodeAscii } from "@/components/templates/make/components/animated-code-ascii";
import type { MakeItem } from "@/components/blocks/make-item/lib/types";
import { mapRunsToMakeGalleryItems } from "@/components/templates/make/lib/make-artifact-items";
import { isRunExecutionPhase } from "@/components/templates/make/lib/execution-data";
import { createMakeEntryHref } from "@/components/templates/make/lib/navigation-intent";


export default function MakeArtifactsPage() {
	return (
		<MakeProvider>
			<ArtifactsLayout />
		</MakeProvider>
	);
}

function ArtifactsEmptyState({ onStartMaking, onSelect }: Readonly<{
	onStartMaking: () => void;
	onSelect: (prompt: string) => void;
}>) {
	return (
		<div className="flex h-full flex-col items-center overflow-y-auto">
			<div
				className="stagger-fade-in flex flex-col items-center py-16"
			>
				<Empty className="py-0">
					<EmptyHeader>
						<EmptyMedia className="mb-6">
							<AnimatedCodeAscii />
						</EmptyMedia>
						<EmptyTitle>Nothing made yet</EmptyTitle>
						<EmptyDescription>
							Apps, agents, skills, and automations
							<br />
							that you create will appear here.
						</EmptyDescription>
					</EmptyHeader>
					<EmptyContent>
						<Button onClick={onStartMaking} className="cursor-pointer">
							Start making
						</Button>
					</EmptyContent>
				</Empty>
			</div>
			<div
				className="stagger-fade-in w-full max-w-[800px] pb-8"
				style={{ animationDelay: "0.06s" }}
			>
				<DiscoveryGallery onSelect={onSelect} />
			</div>
		</div>
	);
}

function ArtifactsLayout() {
	const router = useRouter();

	useEffect(() => {
		router.prefetch(createMakeEntryHref("fresh-chat"));
		router.prefetch(createMakeEntryHref("fresh-make"));
	}, [router]);

	const {
		sidebarOpen,
		sidebarHovered,
		isExecutionActive,
		executionState,
		taskExecutions,
		run,
		chatHistory,
		activeChatId,
		sidebarRunHistory,
		hasLoadedRunHistory,
		runId,
		isGeneratingTitle,
		pendingTitleChatId,
	} = useMakeState();

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
		handleAddTask,
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

	const handleOpenFreshChat = useCallback(() => {
		router.push(createMakeEntryHref("fresh-chat"));
	}, [router]);

	const handleOpenFreshMake = useCallback(() => {
		router.push(createMakeEntryHref("fresh-make"));
	}, [router]);

	const makeGalleryItems = useMemo(
		() => mapRunsToMakeGalleryItems(sidebarRunHistory),
		[sidebarRunHistory],
	);

	const handleGalleryItemSelect = useCallback((item: MakeItem) => {
		const selectedRunId = item.runMeta?.runId ?? item.id;
		handleSelectRun(selectedRunId);
	}, [handleSelectRun]);

	const isSidebarCollapsedAndHovered = !sidebarOpen && sidebarHovered;

	const handleEmptyStateGallerySelect = useCallback((prompt: string) => {
		router.push(createMakeEntryHref("fresh-make", prompt));
	}, [router]);

	// Show execution grid while tasks are still active; switch once all tasks are done.
	const shouldShowExecutionGrid =
		executionState === "executing" && (run === null || isRunExecutionPhase(run));

	return (
		<SidebarProvider
			open={sidebarOpen || sidebarHovered}
			onOpenChange={setSidebarOpen}
			style={
				{
					"--sidebar-width": "320px",
				} as React.CSSProperties
			}
			className="[&_[data-slot=sidebar-gap]]:ease-[var(--ease-in-out)] [&_[data-slot=sidebar-container]]:ease-[var(--ease-in-out)]"
		>
			<AppSidebar
				isOverlay={isSidebarCollapsedAndHovered}
				isHoverReveal={!isSidebarCollapsedAndHovered && !sidebarOpen && sidebarHovered}
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
				onNewChat={handleOpenFreshChat}
				onNewProject={handleOpenFreshMake}
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
				<div className="flex h-full min-h-0 flex-col gap-0">
					<ChatTitleRow
						title={null}
						isTitlePending={false}
						sidebarOpen={sidebarOpen}
						sidebarHovered={sidebarHovered}
						onExpandSidebar={() => setSidebarOpen(true)}
						onHoverEnter={handleHoverEnter}
						onHoverLeave={handleHoverLeave}
					/>
					<div className="min-h-0 flex-1 overflow-hidden">
						{isExecutionActive && shouldShowExecutionGrid ? (
							<MakeGridSurface
								taskExecutions={taskExecutions}
								onAddTask={handleAddTask}
							/>
						) : isExecutionActive ? (
							<MakeArtifactSurface run={run} />
						) : makeGalleryItems.length > 0 ? (
							<MakeGalleryContent items={makeGalleryItems} onItemSelect={handleGalleryItemSelect} />
						) : !hasLoadedRunHistory ? (
							<div className="h-full" aria-hidden />
							) : (
								<ArtifactsEmptyState
									onStartMaking={handleOpenFreshMake}
									onSelect={handleEmptyStateGallerySelect}
								/>
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
