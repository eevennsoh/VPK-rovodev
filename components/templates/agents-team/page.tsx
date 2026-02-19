"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { token } from "@/lib/tokens";
import { API_ENDPOINTS } from "@/lib/api-config";
import type { AgentRunListItem } from "@/lib/agents-team-run-types";
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
import { useConfigDialogs } from "./hooks/use-config-dialogs";
import { ConfigDialogs } from "./components/config-dialogs";
import {
	selectRetryTasks,
	type RetryTaskGroupKey,
} from "./lib/retry-task-groups";
import {
	normalizeAgentsTeamMessages,
	isAnyWidgetCurrentlyLoading,
	getLoadingWidgetType,
	isPlanResponseComplete,
	toConversationItems,
	getLatestVisibleUserPrompt,
} from "./lib/message-utils";

function toDateTimestamp(value: string): number {
	const timestamp = Date.parse(value);
	return Number.isFinite(timestamp) ? timestamp : 0;
}

function sortRunsByRecency(leftRun: AgentRunListItem, rightRun: AgentRunListItem): number {
	const updatedDelta =
		toDateTimestamp(rightRun.updatedAt) - toDateTimestamp(leftRun.updatedAt);
	if (updatedDelta !== 0) {
		return updatedDelta;
	}

	const createdDelta =
		toDateTimestamp(rightRun.createdAt) - toDateTimestamp(leftRun.createdAt);
	if (createdDelta !== 0) {
		return createdDelta;
	}

	return rightRun.runId.localeCompare(leftRun.runId);
}

function parseErrorMessage(payload: unknown): string {
	if (!payload || typeof payload !== "object") {
		return "Request failed";
	}

	const record = payload as { error?: unknown; details?: unknown };
	if (typeof record.error === "string" && record.error.trim()) {
		return record.error.trim();
	}
	if (typeof record.details === "string" && record.details.trim()) {
		return record.details.trim();
	}

	return "Request failed";
}

function toErrorMessage(error: unknown): string {
	if (error instanceof Error && error.message.trim()) {
		return error.message.trim();
	}

	return "Request failed";
}

export default function AgentsTeamView() {
	const router = useRouter();
	const [isOpen, setIsOpen] = useState(true);
	const [isHovered, setIsHovered] = useState(false);
	const [runHistory, setRunHistory] = useState<AgentRunListItem[]>([]);
	const hasNavigatedToSummaryRef = useRef(false);
	const hoverTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const {
		prompt,
		setPrompt,
		isPlanMode,
		togglePlanMode,
		isChatMode,
		isStreaming,
		isSubmitPending,
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

	const { skillDialogProps, agentDialogProps, sidebarConfigHandlers } = useConfigDialogs({
		skills,
		createSkill,
		updateSkill,
		deleteSkill,
		createAgent,
		updateAgent,
		deleteAgent,
	});

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
		isExecutionActive,
		executionState,
		runId,
		runStatus,
		taskExecutions,
		run,
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
		if (!runId || executionState === "idle") {
			hasNavigatedToSummaryRef.current = false;
			return;
		}

		if (!hasNavigatedToSummaryRef.current) {
			hasNavigatedToSummaryRef.current = true;
			router.push(`/agents-team/runs/${runId}`);
		}
	}, [executionState, router, runId]);

	useEffect(() => {
		let cancelled = false;
		const loadRunHistory = async () => {
			try {
				const response = await fetch(
					API_ENDPOINTS.agentsTeamRuns(),
					{
						cache: "no-store",
					}
				);
				if (!response.ok || cancelled) {
					return;
				}

				const payload = (await response.json()) as { runs?: AgentRunListItem[] };
				if (!cancelled && Array.isArray(payload.runs)) {
					setRunHistory(payload.runs);
				}
			} catch (error) {
				console.error("[AGENTS-TEAM] Failed to load sidebar run history:", error);
			}
		};

		void loadRunHistory();

		return () => {
			cancelled = true;
		};
	}, [runId, runStatus]);

	const sidebarRunHistory = useMemo(() => {
		const runsById = new Map<string, AgentRunListItem>();
		for (const runItem of runHistory) {
			runsById.set(runItem.runId, runItem);
		}
		if (run) {
			runsById.set(run.runId, run);
		}

		return Array.from(runsById.values())
			.sort(sortRunsByRecency);
	}, [run, runHistory]);

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
			const shouldStartRun = selection.decision === "auto-accept";

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

	const handleCreateAgentTeam = useCallback(() => {
		if (!isPlanMode) {
			togglePlanMode();
		}
	}, [isPlanMode, togglePlanMode]);

	const handleRetryPlanWidget = useCallback(() => {
		const retryPrompt = latestUserPrompt.trim();
		if (!retryPrompt) {
			return;
		}

		void handleSuggestedQuestionClick(retryPrompt);
	}, [handleSuggestedQuestionClick, latestUserPrompt]);

	const handleSelectRun = useCallback(
		(selectedRunId: string) => {
			router.push(`/agents-team/runs/${selectedRunId}`);
		},
		[router]
	);

	const handleDeleteRun = useCallback(
		async (deletedRunId: string) => {
			try {
				const response = await fetch(
					API_ENDPOINTS.agentsTeamRun(deletedRunId),
					{ method: "DELETE" }
				);
				if (!response.ok) {
					console.error("[AGENTS-TEAM] Failed to delete run:", response.status);
					return;
				}
				setRunHistory((prev) => prev.filter((r) => r.runId !== deletedRunId));
			} catch (error) {
				console.error("[AGENTS-TEAM] Failed to delete run:", error);
			}
		},
		[]
	);

	const handleRetryRunGroup = useCallback(
		async (targetRunId: string, groupKey: RetryTaskGroupKey, taskIds: string[]) => {
			const targetRun = sidebarRunHistory.find((item) => item.runId === targetRunId);
			if (!targetRun) {
				return;
			}

			const selectedTasks = selectRetryTasks(targetRun.tasks, groupKey, taskIds);
			if (selectedTasks.length === 0) {
				return;
			}

				try {
					const response = await fetch(API_ENDPOINTS.agentsTeamRunTasks(targetRunId), {
						method: "POST",
						headers: {
							"Content-Type": "application/json",
						},
						body: JSON.stringify({
							retryTaskIds: selectedTasks.map((task) => task.id),
						}),
					});
				if (!response.ok) {
					const payload = (await response.json().catch(() => ({}))) as unknown;
					throw new Error(parseErrorMessage(payload));
				}

				const payload = (await response.json()) as { run?: AgentRunListItem };
				const nextRun = payload.run;
				if (nextRun) {
					setRunHistory((previousHistory) => {
						const nextRunsById = new Map(
							previousHistory.map((historyRun) => [historyRun.runId, historyRun] as const)
						);
						nextRunsById.set(nextRun.runId, nextRun);
						return Array.from(nextRunsById.values()).sort(sortRunsByRecency);
					});
				}

				router.push(`/agents-team/runs/${targetRunId}`);
			} catch (error) {
				console.error(
					"[AGENTS-TEAM] Failed to retry run task group:",
					toErrorMessage(error)
				);
			}
		},
		[router, sidebarRunHistory]
	);

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
										isPlanMode={isPlanMode}
										isStreaming={isStreaming}
										isSubmitPending={isSubmitPending}
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
										onPlanModeToggle={togglePlanMode}
										queuedPrompts={queuedPrompts}
										onRemoveQueuedPrompt={removeQueuedPrompt}
										onClarificationSubmit={handleClarificationSubmit}
										onApprovalSubmit={handleApprovalSubmit}
										onSuggestedQuestionClick={handleSuggestedQuestionClick}
										onRetryPlanWidget={handleRetryPlanWidget}
									/>
								)}
							</div>
						</div>
				) : (
						<AgentsTeamInitialView
							prompt={prompt}
							isStreaming={isStreaming || isSubmitPending}
							isPlanMode={isPlanMode}
							queuedPrompts={queuedPrompts}
							onPromptChange={setPrompt}
							onSubmit={handleSubmit}
							onStop={stopStreaming}
							onPlanModeToggle={togglePlanMode}
							onRemoveQueuedPrompt={removeQueuedPrompt}
						/>
				)}
			</SidebarInset>
			<ConfigDialogs skillDialog={skillDialogProps} agentDialog={agentDialogProps} />
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
