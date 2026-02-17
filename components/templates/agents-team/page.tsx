"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { token } from "@/lib/tokens";
import type { AgentsTeamSkill, AgentsTeamAgent } from "@/lib/agents-team-config-types";
import SidebarExpandIcon from "@atlaskit/icon/core/sidebar-expand";
import {
	buildClarificationSummaryPrompt,
	createClarificationSubmission,
	getLatestQuestionCardPayload,
	type ClarificationAnswers,
} from "@/components/templates/shared/lib/question-card-widget";
import {
	createPlanApprovalSubmission,
	type PlanApprovalSelection,
} from "@/components/templates/shared/lib/plan-approval";
import { getLatestPlanWidgetPayload } from "@/components/templates/shared/lib/plan-widget";
import { isMessageVisibleInTranscript } from "@/lib/rovo-ui-messages";
import { AppSidebar } from "./components/app-sidebar";
import AgentsTeamInitialView from "./components/agents-team-initial-view";
import AgentsTeamChatView from "./components/agents-team-chat-view";
import { ExecutionGridView } from "./components/execution-grid-view";
import ChatTitleRow from "./components/chat-title-row";
import { useAgentsTeamChat } from "./hooks/use-agents-team-chat";
import { useExecutionMode } from "./hooks/use-execution-mode";
import { useAgentsTeamConfig } from "./hooks/use-agents-team-config";
import SkillDialog from "./components/skill-dialog";
import AgentDialog from "./components/agent-dialog";
import {
	normalizeAgentsTeamMessages,
	isAnyWidgetCurrentlyLoading,
	getLoadingWidgetType,
	isPlanResponseComplete,
	toConversationItems,
	getLatestVisibleUserPrompt,
} from "./lib/message-utils";

export default function AgentsTeamView() {
	const router = useRouter();
	const [isOpen, setIsOpen] = useState(true);
	const [isHovered, setIsHovered] = useState(false);
	const hasNavigatedToSummaryRef = useRef(false);
	const hoverTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const {
		prompt,
		setPrompt,
		isAgentTeamMode,
		toggleAgentTeamMode,
		isChatMode,
		isStreaming,
		stopStreaming,
		isGeneratingTitle,
		pendingTitleChatId,
		uiMessages: rawUiMessages,
		queuedPrompts,
		removeQueuedPrompt,
		chatHistory,
		activeChatId,
		handleSubmit,
		handleSuggestedQuestionClick,
		submitClarification,
		submitPlanApproval,
		handleNewChat,
		handleSelectChat,
		handleDeleteChat,
		handleDeleteMessage,
	} = useAgentsTeamChat();

	const {
		skills,
		agents,
		createSkill,
		updateSkill,
		deleteSkill,
		createAgent,
		updateAgent,
		deleteAgent,
	} = useAgentsTeamConfig();

	const [skillDialogOpen, setSkillDialogOpen] = useState(false);
	const [agentDialogOpen, setAgentDialogOpen] = useState(false);
	const [editingSkill, setEditingSkill] = useState<AgentsTeamSkill | null>(null);
	const [editingAgent, setEditingAgent] = useState<AgentsTeamAgent | null>(null);

	const handleEditSkill = useCallback((skill: AgentsTeamSkill) => {
		setEditingSkill(skill);
		setSkillDialogOpen(true);
	}, []);

	const handleNewSkill = useCallback(() => {
		setEditingSkill(null);
		setSkillDialogOpen(true);
	}, []);

	const handleSaveSkill = useCallback(
		async (data: Parameters<typeof createSkill>[0]) => {
			if (editingSkill) {
				await updateSkill(editingSkill.id, data);
			} else {
				await createSkill(data);
			}
		},
		[editingSkill, createSkill, updateSkill]
	);

	const handleEditAgent = useCallback((agent: AgentsTeamAgent) => {
		setEditingAgent(agent);
		setAgentDialogOpen(true);
	}, []);

	const handleNewAgent = useCallback(() => {
		setEditingAgent(null);
		setAgentDialogOpen(true);
	}, []);

	const handleSaveAgent = useCallback(
		async (data: Parameters<typeof createAgent>[0]) => {
			if (editingAgent) {
				await updateAgent(editingAgent.id, data);
			} else {
				await createAgent(data);
			}
		},
		[editingAgent, createAgent, updateAgent]
	);

	const normalizedUiMessages = useMemo(
		() => normalizeAgentsTeamMessages(rawUiMessages, isStreaming),
		[rawUiMessages, isStreaming]
	);
	const uiMessages = useMemo(
		() => normalizedUiMessages.filter(isMessageVisibleInTranscript),
		[normalizedUiMessages]
	);
	const latestUserPrompt = useMemo(
		() => getLatestVisibleUserPrompt(uiMessages),
		[uiMessages]
	);
	const conversationItems = useMemo(
		() => toConversationItems(uiMessages),
		[uiMessages]
	);
	const activeQuestionCard = useMemo(
		() => getLatestQuestionCardPayload(rawUiMessages),
		[rawUiMessages]
	);
	const activePlanWidget = useMemo(
		() => getLatestPlanWidgetPayload(rawUiMessages),
		[rawUiMessages]
	);
	const isWidgetLoading = useMemo(
		() => isAnyWidgetCurrentlyLoading(rawUiMessages),
		[rawUiMessages]
	);
	const loadingWidgetType = useMemo(
		() => getLoadingWidgetType(rawUiMessages),
		[rawUiMessages]
	);
	const isPlanMessageComplete = useMemo(
		() => isPlanResponseComplete(rawUiMessages),
		[rawUiMessages]
	);

	const {
		isExecuting,
		isExecutionActive,
		executionState,
		runId,
		runStatus,
		runCreatedAt,
		runCompletedAt,
		taskExecutions,
		taskStatusGroups,
		executionPlan,
		startExecution,
		sendDirective,
	} = useExecutionMode();

	const activeChatTitle =
		activeChatId !== null
			? chatHistory.find((item) => item.id === activeChatId)?.title ?? null
			: null;
	const isActiveChatTitlePending =
		activeChatId !== null && pendingTitleChatId === activeChatId;

	useEffect(() => {
		if (!runId) {
			return;
		}

		if (executionState === "completed" || executionState === "failed") {
			if (!hasNavigatedToSummaryRef.current) {
				hasNavigatedToSummaryRef.current = true;
				router.push(`/agents-team/runs/${runId}`);
			}
			return;
		}

		hasNavigatedToSummaryRef.current = false;
	}, [executionState, router, runId]);

	const handleClarificationSubmit = useCallback(
		(answers: ClarificationAnswers) => {
			if (!activeQuestionCard) {
				return;
			}

			const clarificationSubmission = createClarificationSubmission(
				activeQuestionCard,
				answers
			);
			const clarificationPrompt = buildClarificationSummaryPrompt(
				activeQuestionCard,
				answers
			);
			void submitClarification(clarificationPrompt, clarificationSubmission);
		},
		[activeQuestionCard, submitClarification]
	);

	const handleApprovalSubmit = useCallback(
		(selection: PlanApprovalSelection) => {
			const approvalSubmission = createPlanApprovalSubmission(
				selection,
				activePlanWidget
			);
			const shouldStartRun =
				selection.decision === "auto-accept" ||
				selection.decision === "manual-approve";

			if (shouldStartRun && activePlanWidget) {
				void startExecution({
					plan: activePlanWidget,
					userPrompt: latestUserPrompt,
					conversation: conversationItems,
					customInstruction: selection.customInstruction,
				});
				return;
			}

			void submitPlanApproval(approvalSubmission);
		},
		[
			activePlanWidget,
			conversationItems,
			latestUserPrompt,
			startExecution,
			submitPlanApproval,
		]
	);

	const handleHoverEnter = useCallback(() => {
		if (hoverTimeoutRef.current) {
			clearTimeout(hoverTimeoutRef.current);
			hoverTimeoutRef.current = null;
		}
		setIsHovered(true);
	}, []);

	const handleHoverLeave = useCallback(() => {
		hoverTimeoutRef.current = setTimeout(() => {
			setIsHovered(false);
		}, 100);
	}, []);

	const handlePinSidebar = useCallback(() => {
		setIsOpen(true);
		setIsHovered(false);
	}, []);

	const handleAddTask = useCallback(
		(message: string) => {
			void sendDirective("", message);
		},
		[sendDirective]
	);

	const handleManageTasks = useCallback(() => {
		if (!runId) {
			return;
		}

		router.push(`/agents-team/runs/${runId}`);
	}, [router, runId]);

	const handleCreateAgentTeam = useCallback(() => {
		if (!isAgentTeamMode) {
			toggleAgentTeamMode();
		}
	}, [isAgentTeamMode, toggleAgentTeamMode]);

	return (
		<SidebarProvider
			open={isOpen || isHovered}
			onOpenChange={setIsOpen}
			style={
				{
					"--sidebar-width": "320px",
				} as React.CSSProperties
			}
			className={cn(
				"[&_[data-slot=sidebar-gap]]:ease-[var(--ease-in-out)] [&_[data-slot=sidebar-container]]:ease-[var(--ease-in-out)]",
				!isOpen && isHovered && !isChatMode && "[&_[data-slot=sidebar-gap]]:w-0!"
			)}
		>
			<AppSidebar
				isOverlay={!isOpen && isHovered && !isChatMode}
				isHoverReveal={!isOpen && isHovered && isChatMode}
				onPinSidebar={handlePinSidebar}
				chatHistory={chatHistory}
				activeChatId={activeChatId}
				isGeneratingTitle={isGeneratingTitle}
				pendingTitleChatId={pendingTitleChatId}
				onSelectChat={handleSelectChat}
				onDeleteChat={handleDeleteChat}
				onMouseEnter={handleHoverEnter}
				onMouseLeave={handleHoverLeave}
				isExecuting={isExecutionActive}
				executionData={
					isExecutionActive && executionPlan
						? {
								planTitle: executionPlan.title,
								planEmoji: executionPlan.emoji ?? "\u270C\uFE0F",
								taskStatusGroups,
								runStatus: runStatus ?? (isExecuting ? "running" : "failed"),
								runCreatedAt,
								runCompletedAt,
								onManageTasks: runId ? handleManageTasks : undefined,
							}
						: undefined
				}
				skills={skills}
				agents={agents}
				onEditSkill={handleEditSkill}
				onNewSkill={handleNewSkill}
				onEditAgent={handleEditAgent}
				onNewAgent={handleNewAgent}
				onCreateAgentTeam={handleCreateAgentTeam}
			/>
			<SidebarInset className={isChatMode ? "h-svh overflow-hidden" : undefined}>
				{!isChatMode ? (
						<CollapsedSidebarBranding
							isVisible={!isOpen && !isHovered}
							onExpandClick={() => setIsOpen(true)}
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
								sidebarOpen={isOpen}
								sidebarHovered={isHovered}
								onExpandSidebar={() => setIsOpen(true)}
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
									<AgentsTeamChatView
										prompt={prompt}
										isAgentTeamMode={isAgentTeamMode}
										isStreaming={isStreaming}
										isWidgetLoading={isWidgetLoading}
										loadingWidgetType={loadingWidgetType}
										isPlanResponseComplete={isPlanMessageComplete}
										uiMessages={uiMessages}
										streamingUiMessages={normalizedUiMessages}
										activeQuestionCard={activeQuestionCard}
										activePlanWidget={activePlanWidget}
										onPromptChange={setPrompt}
										onSubmit={handleSubmit}
										onStop={stopStreaming}
										onAgentTeamModeToggle={toggleAgentTeamMode}
										queuedPrompts={queuedPrompts}
										onRemoveQueuedPrompt={removeQueuedPrompt}
										onClarificationSubmit={handleClarificationSubmit}
										onApprovalSubmit={handleApprovalSubmit}
										onSuggestedQuestionClick={handleSuggestedQuestionClick}
									onDeleteMessage={handleDeleteMessage}
									/>
								)}
							</div>
						</div>
				) : (
						<AgentsTeamInitialView
							prompt={prompt}
							isStreaming={isStreaming}
							isAgentTeamMode={isAgentTeamMode}
							queuedPrompts={queuedPrompts}
							onPromptChange={setPrompt}
							onSubmit={handleSubmit}
							onStop={stopStreaming}
							onAgentTeamModeToggle={toggleAgentTeamMode}
							onRemoveQueuedPrompt={removeQueuedPrompt}
						/>
				)}
			</SidebarInset>
			<SkillDialog
				open={skillDialogOpen}
				skill={editingSkill}
				onOpenChange={setSkillDialogOpen}
				onSave={handleSaveSkill}
				onDelete={deleteSkill}
			/>
			<AgentDialog
				open={agentDialogOpen}
				agent={editingAgent}
				availableSkills={skills}
				onOpenChange={setAgentDialogOpen}
				onSave={handleSaveAgent}
				onDelete={deleteAgent}
			/>
		</SidebarProvider>
	);
}

interface CollapsedSidebarBrandingProps {
	isVisible: boolean;
	onExpandClick: () => void;
	onHoverEnter: () => void;
	onHoverLeave: () => void;
}

function CollapsedSidebarBranding({
	isVisible,
	onExpandClick,
	onHoverEnter,
	onHoverLeave,
}: Readonly<CollapsedSidebarBrandingProps>) {
	return (
		<div
			className={cn(
				"absolute left-2 top-3 z-20 flex items-center gap-1 text-icon-subtle transition-opacity duration-[var(--duration-normal)] ease-out",
				isVisible ? "opacity-100" : "pointer-events-none opacity-0"
			)}
			onMouseEnter={onHoverEnter}
			onMouseLeave={onHoverLeave}
		>
			<Button
				aria-label="Expand sidebar"
				size="icon"
				variant="ghost"
				onClick={onExpandClick}
			>
				<SidebarExpandIcon label="" />
			</Button>
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
	);
}
