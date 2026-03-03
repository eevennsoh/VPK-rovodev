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
import type { AgentRunListItem, AgentRun } from "@/lib/plan-run-types";
import type { RovoUIMessage } from "@/lib/rovo-ui-messages";
import { isMessageVisibleInTranscript } from "@/lib/rovo-ui-messages";
import type { QueuedPromptItem } from "@/app/contexts";
import type { PlanSkill, PlanAgent } from "@/lib/plan-config-types";
import type { ParsedQuestionCardPayload, ClarificationAnswers } from "@/components/templates/shared/lib/question-card-widget";
import type { ParsedPlanWidgetPayload } from "@/components/templates/shared/lib/plan-widget";
import type { PlanApprovalSelection } from "@/components/templates/shared/lib/plan-approval";
import type { GenerativeWidgetPrimaryActionPayload } from "@/components/templates/shared/lib/generative-widget";
import type { TaskExecution } from "@/components/templates/plan/lib/execution-data";
import type { ExecutionState } from "@/components/templates/plan/hooks/use-execution-mode";
import type { ChatHistoryItem } from "@/components/templates/plan/components/sidebar-chat-history";
import type { SkillDialogProps, AgentDialogProps, SidebarConfigHandlers, ImportDialogState, DeleteAlertState } from "@/components/templates/plan/hooks/use-config-dialogs";
import type { RetryTaskGroupKey } from "@/components/templates/plan/lib/retry-task-groups";
import {
	buildClarificationSummaryPrompt,
	createClarificationSubmission,
	getLatestQuestionCardPayload,
} from "@/components/templates/shared/lib/question-card-widget";
import {
	createPlanApprovalSubmission,
	getPlanApprovalKeyFromPlanWidget,
} from "@/components/templates/shared/lib/plan-approval";
import { getLatestPlanWidgetPayload } from "@/components/templates/shared/lib/plan-widget";
import {
	selectRetryTasks,
} from "@/components/templates/plan/lib/retry-task-groups";
import {
	normalizePlanMessages,
	isAnyWidgetCurrentlyLoading,
	getLoadingWidgetType,
	isPlanResponseComplete,
	toConversationItems,
	getLatestVisibleUserPrompt,
} from "@/components/templates/plan/lib/message-utils";
import { usePlanChat } from "@/components/templates/plan/hooks/use-plan-chat";
import { useExecutionMode } from "@/components/templates/plan/hooks/use-execution-mode";
import { usePlanConfig } from "@/components/templates/plan/hooks/use-plan-config";
import { useConfigDialogs } from "@/components/templates/plan/hooks/use-config-dialogs";

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

export interface PlanState {
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
	agentCount: number;

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

export interface PlanActions {
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
	handleClarificationDismiss: (questionCard: ParsedQuestionCardPayload) => void;
	handleApprovalSubmit: (selection: PlanApprovalSelection) => void;

	// Suggestions / Widgets
	handleSuggestedQuestionClick: (question: string) => Promise<void> | void;
	handleWidgetPrimaryAction: (payload: GenerativeWidgetPrimaryActionPayload) => Promise<void> | void;

	// Runs
	handleSelectRun: (runId: string) => void;
	handleDeleteRun: (runId: string) => void;
	handleRetryRunGroup: (runId: string, groupKey: RetryTaskGroupKey, taskIds: string[]) => Promise<void> | void;
	handleAddTask: (message: string) => void;
	handleCreatePlan: () => void;

	// Agent multiplier
	setAgentCount: (count: number) => void;
}

// ---------------------------------------------------------------------------
// Meta
// ---------------------------------------------------------------------------

export interface PlanMeta {
	skills: PlanSkill[];
	agents: PlanAgent[];
	skillDialogProps: SkillDialogProps;
	agentDialogProps: AgentDialogProps;
	sidebarConfigHandlers: SidebarConfigHandlers;
	importDialog: ImportDialogState;
	closeImportDialog: () => void;
	handleImport: (content: string) => Promise<void>;
	deleteAlert: DeleteAlertState;
	closeDeleteAlert: () => void;
	handleDeleteConfirm: () => void;
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

export interface PlanContextValue {
	state: PlanState;
	actions: PlanActions;
	meta: PlanMeta;
}

const PlanContext = createContext<PlanContextValue | null>(null);

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

interface PlanProviderProps {
	children: ReactNode;
}

export function PlanProvider({ children }: PlanProviderProps) {
	const router = useRouter();

	// ---- Local sidebar state ----
	const [isOpen, setIsOpen] = useState(true);
	const [isHovered, setIsHovered] = useState(false);
	const hoverTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	// ---- Run history ----
	const [runHistory, setRunHistory] = useState<AgentRunListItem[]>([]);
	const [agentCount, setAgentCount] = useState(4);
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
		dismissClarification,
		submitPlanApproval,
		appendPlanApprovalMarker,
		handleNewChat,
		handleSelectChat,
		handleDeleteChat,
	} = usePlanChat();

	const {
		skills,
		agents,
		availableTools,
		createSkill,
		updateSkill,
		deleteSkill,
		createAgent,
		updateAgent,
		deleteAgent,
		exportSkill,
		exportAgent,
		importSkill,
		importAgent,
	} = usePlanConfig();

	const {
		skillDialogProps,
		agentDialogProps,
		sidebarConfigHandlers,
		importDialog,
		closeImportDialog,
		handleImport,
		deleteAlert,
		closeDeleteAlert,
		handleDeleteConfirm,
	} = useConfigDialogs({
		skills,
		agents,
		createSkill,
		updateSkill,
		deleteSkill,
		createAgent,
		updateAgent,
		deleteAgent,
		exportSkill,
		exportAgent,
		importSkill,
		importAgent,
		availableTools,
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
		() => normalizePlanMessages(rawUiMessages, isStreaming),
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
			router.push(`/plan/runs/${runId}`);
		}
	}, [executionState, router, runId]);

	useEffect(() => {
		let cancelled = false;
		const loadRunHistory = async () => {
			try {
				const response = await fetch(API_ENDPOINTS.planRuns(), {
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
				console.error("[PLAN] Failed to load sidebar run history:", error);
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
			void submitClarification(
				clarificationPrompt,
				clarificationSubmission,
				activeQuestionCard,
			);
		},
		[activeQuestionCard, submitClarification],
	);

	const handleClarificationDismiss = useCallback(
		(questionCard: ParsedQuestionCardPayload) => {
			void dismissClarification(questionCard);
		},
		[dismissClarification],
	);

	const handleApprovalSubmit = useCallback(
		(selection: PlanApprovalSelection) => {
			const approvalSubmission = createPlanApprovalSubmission(
				selection,
				activePlanWidget,
			);
			const shouldStartRun = selection.decision === "auto-accept";
			const planApprovalPlanKey = getPlanApprovalKeyFromPlanWidget(activePlanWidget);

			if (shouldStartRun && activePlanWidget) {
				void appendPlanApprovalMarker({
					decision: "auto-accept",
					planApprovalPlanKey,
				});
				void startExecution({
					plan: activePlanWidget,
					userPrompt: latestUserPrompt,
					conversation: conversationItems,
					customInstruction: selection.customInstruction,
					agentCount,
				});
				return;
			}

			void submitPlanApproval(approvalSubmission);
		},
		[
			activePlanWidget,
			agentCount,
			conversationItems,
			latestUserPrompt,
			startExecution,
			submitPlanApproval,
			appendPlanApprovalMarker,
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

	const handleCreatePlan = useCallback(() => {
		if (!isPlanMode) {
			togglePlanMode();
		}
	}, [isPlanMode, togglePlanMode]);

	const handleSelectRun = useCallback(
		(selectedRunId: string) => {
			router.push(`/plan/runs/${selectedRunId}`);
		},
		[router],
	);

	const handleDeleteRun = useCallback(
		async (deletedRunId: string) => {
			try {
				const response = await fetch(
					API_ENDPOINTS.planRun(deletedRunId),
					{ method: "DELETE" },
				);
				if (!response.ok) {
					console.error("[PLAN] Failed to delete run:", response.status);
					return;
				}
				setRunHistory((prev) => prev.filter((r) => r.runId !== deletedRunId));
			} catch (error) {
				console.error("[PLAN] Failed to delete run:", error);
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
				const response = await fetch(API_ENDPOINTS.planRunTasks(targetRunId), {
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

				router.push(`/plan/runs/${targetRunId}`);
			} catch (error) {
				console.error(
					"[PLAN] Failed to retry run task group:",
					toErrorMessage(error),
				);
			}
		},
		[router, sidebarRunHistory],
	);

	// ---- Context value ----

	const state: PlanState = useMemo(
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
			agentCount,
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
			agentCount,
			chatHistory,
			activeChatId,
			sidebarRunHistory,
			activeChatTitle,
			isActiveChatTitlePending,
			isGeneratingTitle,
			pendingTitleChatId,
		],
	);

	const actions: PlanActions = useMemo(
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
			handleClarificationDismiss,
			handleApprovalSubmit,
			handleSuggestedQuestionClick,
			handleWidgetPrimaryAction,
			handleSelectRun,
			handleDeleteRun,
			handleRetryRunGroup,
			handleAddTask,
			handleCreatePlan,
			setAgentCount,
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
			handleClarificationDismiss,
			handleApprovalSubmit,
			handleSuggestedQuestionClick,
			handleWidgetPrimaryAction,
			handleSelectRun,
			handleDeleteRun,
			handleRetryRunGroup,
			handleAddTask,
			handleCreatePlan,
		],
	);

	const meta: PlanMeta = useMemo(
		() => ({
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
		}),
		[skills, agents, skillDialogProps, agentDialogProps, sidebarConfigHandlers, importDialog, closeImportDialog, handleImport, deleteAlert, closeDeleteAlert, handleDeleteConfirm],
	);

	const contextValue: PlanContextValue = useMemo(
		() => ({ state, actions, meta }),
		[state, actions, meta],
	);

	return (
		<PlanContext value={contextValue}>
			{children}
		</PlanContext>
	);
}

// ---------------------------------------------------------------------------
// Hooks
// ---------------------------------------------------------------------------

export function usePlan(): PlanContextValue {
	const context = use(PlanContext);
	if (context === null) {
		throw new Error("usePlan must be used within a PlanProvider");
	}
	return context;
}

export function usePlanState(): PlanState {
	return usePlan().state;
}

export function usePlanActions(): PlanActions {
	return usePlan().actions;
}

export function usePlanMeta(): PlanMeta {
	return usePlan().meta;
}
