"use client";

import {
	createContext,
	use,
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
	type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { API_ENDPOINTS } from "@/lib/api-config";
import type { AgentRunListItem, AgentRun } from "@/lib/agents-team-run-types";
import type { RovoUIMessage } from "@/lib/rovo-ui-messages";
import { isMessageVisibleInTranscript } from "@/lib/rovo-ui-messages";
import type { QueuedPromptItem } from "@/app/contexts";
import type { AgentsTeamSkill, AgentsTeamAgent } from "@/lib/agents-team-config-types";
import type { ParsedQuestionCardPayload, ClarificationAnswers } from "@/components/templates/shared/lib/question-card-widget";
import type { ParsedPlanWidgetPayload } from "@/components/templates/shared/lib/plan-widget";
import type { PlanApprovalSelection } from "@/components/templates/shared/lib/plan-approval";
import type { GenerativeWidgetPrimaryActionPayload } from "@/components/templates/shared/lib/generative-widget";
import type { TaskExecution } from "@/components/templates/agents-team/lib/execution-data";
import type { ExecutionState } from "@/components/templates/agents-team/hooks/use-execution-mode";
import type { ChatHistoryItem } from "@/components/templates/agents-team/components/sidebar-chat-history";
import type { SkillDialogProps, AgentDialogProps, SidebarConfigHandlers } from "@/components/templates/agents-team/hooks/use-config-dialogs";
import type { RetryTaskGroupKey } from "@/components/templates/agents-team/lib/retry-task-groups";
import {
	buildClarificationSummaryPrompt,
	createClarificationSubmission,
	getLatestQuestionCardPayload,
} from "@/components/templates/shared/lib/question-card-widget";
import {
	createPlanApprovalSubmission,
} from "@/components/templates/shared/lib/plan-approval";
import { getLatestPlanWidgetPayload } from "@/components/templates/shared/lib/plan-widget";
import {
	selectRetryTasks,
} from "@/components/templates/agents-team/lib/retry-task-groups";
import {
	normalizeAgentsTeamMessages,
	isAnyWidgetCurrentlyLoading,
	getLoadingWidgetType,
	isPlanResponseComplete,
	toConversationItems,
	getLatestVisibleUserPrompt,
} from "@/components/templates/agents-team/lib/message-utils";
import { useAgentsTeamChat } from "@/components/templates/agents-team/hooks/use-agents-team-chat";
import { useExecutionMode } from "@/components/templates/agents-team/hooks/use-execution-mode";
import { useAgentsTeamConfig } from "@/components/templates/agents-team/hooks/use-agents-team-config";
import { useConfigDialogs } from "@/components/templates/agents-team/hooks/use-config-dialogs";

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

export interface AgentsTeamState {
	// Sidebar
	sidebarOpen: boolean;
	sidebarHovered: boolean;

	// Chat
	prompt: string;
	isPlanMode: boolean;
	isChatMode: boolean;
	isStreaming: boolean;
	isSubmitPending: boolean;

	// Messages
	uiMessages: RovoUIMessage[];
	normalizedUiMessages: RovoUIMessage[];
	queuedPrompts: ReadonlyArray<QueuedPromptItem>;

	// Derived
	activeQuestionCard: ParsedQuestionCardPayload | null;
	activePlanWidget: ParsedPlanWidgetPayload | null;
	isWidgetLoading: boolean;
	loadingWidgetType: string | null;
	isPlanMessageComplete: boolean;

	// Execution
	isExecutionActive: boolean;
	executionState: ExecutionState;
	runId: string | null;
	taskExecutions: TaskExecution[];
	run: AgentRun | null;

	// History
	chatHistory: ChatHistoryItem[];
	activeChatId: string | null;
	sidebarRunHistory: AgentRunListItem[];

	// Title
	activeChatTitle: string | null;
	isActiveChatTitlePending: boolean;
	isGeneratingTitle: boolean;
	pendingTitleChatId: string | null;
}

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

export interface AgentsTeamActions {
	// Sidebar
	setSidebarOpen: (open: boolean) => void;
	handleHoverEnter: () => void;
	handleHoverLeave: () => void;
	handlePinSidebar: () => void;

	// Chat
	setPrompt: (value: string) => void;
	handleSubmit: () => Promise<void> | void;
	stopStreaming: () => Promise<void>;
	togglePlanMode: () => void;
	removeQueuedPrompt: (id: string) => void;
	handleNewChat: () => void;
	handleSelectChat: (id: string) => void;
	handleDeleteChat: (id: string) => void;

	// Clarification / Approval
	handleClarificationSubmit: (answers: ClarificationAnswers) => void;
	handleApprovalSubmit: (selection: PlanApprovalSelection) => void;

	// Suggestions / Widgets
	handleSuggestedQuestionClick: (question: string) => Promise<void> | void;
	handleWidgetPrimaryAction: (payload: GenerativeWidgetPrimaryActionPayload) => Promise<void> | void;

	// Runs
	handleSelectRun: (runId: string) => void;
	handleDeleteRun: (runId: string) => void;
	handleRetryRunGroup: (runId: string, groupKey: RetryTaskGroupKey, taskIds: string[]) => Promise<void> | void;
	handleAddTask: (message: string) => void;
	handleCreateAgentTeam: () => void;
}

// ---------------------------------------------------------------------------
// Meta
// ---------------------------------------------------------------------------

export interface AgentsTeamMeta {
	skills: AgentsTeamSkill[];
	agents: AgentsTeamAgent[];
	skillDialogProps: SkillDialogProps;
	agentDialogProps: AgentDialogProps;
	sidebarConfigHandlers: SidebarConfigHandlers;
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

export interface AgentsTeamContextValue {
	state: AgentsTeamState;
	actions: AgentsTeamActions;
	meta: AgentsTeamMeta;
}

const AgentsTeamContext = createContext<AgentsTeamContextValue | null>(null);

// ---------------------------------------------------------------------------
// Helpers (pure)
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

interface AgentsTeamProviderProps {
	children: ReactNode;
}

export function AgentsTeamProvider({ children }: AgentsTeamProviderProps) {
	const router = useRouter();

	// ---- Local sidebar state ----
	const [isOpen, setIsOpen] = useState(true);
	const [isHovered, setIsHovered] = useState(false);
	const hoverTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	// ---- Run history ----
	const [runHistory, setRunHistory] = useState<AgentRunListItem[]>([]);
	const hasNavigatedToSummaryRef = useRef(false);

	// ---- Hooks ----
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
		handleWidgetPrimaryAction,
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

	// ---- Derived state (memos) ----
	const normalizedUiMessages = useMemo(
		() => normalizeAgentsTeamMessages(rawUiMessages, isStreaming),
		[rawUiMessages, isStreaming],
	);
	const uiMessages = useMemo(
		() => normalizedUiMessages.filter(isMessageVisibleInTranscript),
		[normalizedUiMessages],
	);
	const latestUserPrompt = useMemo(
		() => getLatestVisibleUserPrompt(uiMessages),
		[uiMessages],
	);
	const conversationItems = useMemo(
		() => toConversationItems(uiMessages),
		[uiMessages],
	);
	const activeQuestionCard = useMemo(
		() => getLatestQuestionCardPayload(rawUiMessages),
		[rawUiMessages],
	);
	const activePlanWidget = useMemo(
		() => getLatestPlanWidgetPayload(rawUiMessages),
		[rawUiMessages],
	);
	const isWidgetLoading = useMemo(
		() => isAnyWidgetCurrentlyLoading(rawUiMessages),
		[rawUiMessages],
	);
	const loadingWidgetType = useMemo(
		() => getLoadingWidgetType(rawUiMessages),
		[rawUiMessages],
	);
	const isPlanMessageComplete = useMemo(
		() => isPlanResponseComplete(rawUiMessages),
		[rawUiMessages],
	);

	const activeChatTitle =
		activeChatId !== null
			? chatHistory.find((item) => item.id === activeChatId)?.title ?? null
			: null;
	const isActiveChatTitlePending =
		activeChatId !== null && pendingTitleChatId === activeChatId;

	const sidebarRunHistory = useMemo(() => {
		const runsById = new Map<string, AgentRunListItem>();
		for (const runItem of runHistory) {
			runsById.set(runItem.runId, runItem);
		}
		if (run) {
			runsById.set(run.runId, run);
		}

		return Array.from(runsById.values()).sort(sortRunsByRecency);
	}, [run, runHistory]);

	// ---- Effects ----

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
				const response = await fetch(API_ENDPOINTS.agentsTeamRuns(), {
					cache: "no-store",
				});
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

	// ---- Callbacks ----

	const handleClarificationSubmit = useCallback(
		(answers: ClarificationAnswers) => {
			if (!activeQuestionCard) {
				return;
			}

			const clarificationSubmission = createClarificationSubmission(
				activeQuestionCard,
				answers,
			);
			const clarificationPrompt = buildClarificationSummaryPrompt(
				activeQuestionCard,
				answers,
			);
			void submitClarification(clarificationPrompt, clarificationSubmission);
		},
		[activeQuestionCard, submitClarification],
	);

	const handleApprovalSubmit = useCallback(
		(selection: PlanApprovalSelection) => {
			const approvalSubmission = createPlanApprovalSubmission(
				selection,
				activePlanWidget,
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
		],
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
		[sendDirective],
	);

	const handleCreateAgentTeam = useCallback(() => {
		if (!isPlanMode) {
			togglePlanMode();
		}
	}, [isPlanMode, togglePlanMode]);

	const handleSelectRun = useCallback(
		(selectedRunId: string) => {
			router.push(`/agents-team/runs/${selectedRunId}`);
		},
		[router],
	);

	const handleDeleteRun = useCallback(
		async (deletedRunId: string) => {
			try {
				const response = await fetch(
					API_ENDPOINTS.agentsTeamRun(deletedRunId),
					{ method: "DELETE" },
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
		[],
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
							previousHistory.map((historyRun) => [historyRun.runId, historyRun] as const),
						);
						nextRunsById.set(nextRun.runId, nextRun);
						return Array.from(nextRunsById.values()).sort(sortRunsByRecency);
					});
				}

				router.push(`/agents-team/runs/${targetRunId}`);
			} catch (error) {
				console.error(
					"[AGENTS-TEAM] Failed to retry run task group:",
					toErrorMessage(error),
				);
			}
		},
		[router, sidebarRunHistory],
	);

	// ---- Context value ----

	const state: AgentsTeamState = useMemo(
		() => ({
			sidebarOpen: isOpen,
			sidebarHovered: isHovered,
			prompt,
			isPlanMode,
			isChatMode,
			isStreaming,
			isSubmitPending,
			uiMessages,
			normalizedUiMessages,
			queuedPrompts,
			activeQuestionCard,
			activePlanWidget,
			isWidgetLoading,
			loadingWidgetType,
			isPlanMessageComplete,
			isExecutionActive,
			executionState,
			runId,
			taskExecutions,
			run,
			chatHistory,
			activeChatId,
			sidebarRunHistory,
			activeChatTitle,
			isActiveChatTitlePending,
			isGeneratingTitle,
			pendingTitleChatId,
		}),
		[
			isOpen,
			isHovered,
			prompt,
			isPlanMode,
			isChatMode,
			isStreaming,
			isSubmitPending,
			uiMessages,
			normalizedUiMessages,
			queuedPrompts,
			activeQuestionCard,
			activePlanWidget,
			isWidgetLoading,
			loadingWidgetType,
			isPlanMessageComplete,
			isExecutionActive,
			executionState,
			runId,
			taskExecutions,
			run,
			chatHistory,
			activeChatId,
			sidebarRunHistory,
			activeChatTitle,
			isActiveChatTitlePending,
			isGeneratingTitle,
			pendingTitleChatId,
		],
	);

	const actions: AgentsTeamActions = useMemo(
		() => ({
			setSidebarOpen: setIsOpen,
			handleHoverEnter,
			handleHoverLeave,
			handlePinSidebar,
			setPrompt,
			handleSubmit,
			stopStreaming,
			togglePlanMode,
			removeQueuedPrompt,
			handleNewChat,
			handleSelectChat,
			handleDeleteChat,
			handleClarificationSubmit,
			handleApprovalSubmit,
			handleSuggestedQuestionClick,
			handleWidgetPrimaryAction,
			handleSelectRun,
			handleDeleteRun,
			handleRetryRunGroup,
			handleAddTask,
			handleCreateAgentTeam,
		}),
		[
			handleHoverEnter,
			handleHoverLeave,
			handlePinSidebar,
			setPrompt,
			handleSubmit,
			stopStreaming,
			togglePlanMode,
			removeQueuedPrompt,
			handleNewChat,
			handleSelectChat,
			handleDeleteChat,
			handleClarificationSubmit,
			handleApprovalSubmit,
			handleSuggestedQuestionClick,
			handleWidgetPrimaryAction,
			handleSelectRun,
			handleDeleteRun,
			handleRetryRunGroup,
			handleAddTask,
			handleCreateAgentTeam,
		],
	);

	const meta: AgentsTeamMeta = useMemo(
		() => ({
			skills,
			agents,
			skillDialogProps,
			agentDialogProps,
			sidebarConfigHandlers,
		}),
		[skills, agents, skillDialogProps, agentDialogProps, sidebarConfigHandlers],
	);

	const contextValue: AgentsTeamContextValue = useMemo(
		() => ({ state, actions, meta }),
		[state, actions, meta],
	);

	return (
		<AgentsTeamContext value={contextValue}>
			{children}
		</AgentsTeamContext>
	);
}

// ---------------------------------------------------------------------------
// Hooks
// ---------------------------------------------------------------------------

export function useAgentsTeam(): AgentsTeamContextValue {
	const context = use(AgentsTeamContext);
	if (context === null) {
		throw new Error("useAgentsTeam must be used within an AgentsTeamProvider");
	}
	return context;
}

export function useAgentsTeamState(): AgentsTeamState {
	return useAgentsTeam().state;
}

export function useAgentsTeamActions(): AgentsTeamActions {
	return useAgentsTeam().actions;
}

export function useAgentsTeamMeta(): AgentsTeamMeta {
	return useAgentsTeam().meta;
}
