"use client";

import { type FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { API_ENDPOINTS } from "@/lib/api-config";
import { cn } from "@/lib/utils";
import type {
	AgentRun,
	AgentRunArtifact,
	AgentRunConfluenceShareInput,
	AgentRunListItem,
	AgentRunShareRequest,
	AgentRunShareResponse,
	AgentRunSummary,
	AgentRunVisualSummary,
	AgentRunGenuiSummary,
	AgentRunStreamEvent,
} from "@/lib/plan-run-types";
import { isAgentRunStreamEvent } from "@/lib/plan-run-types";
import type { AgentExecutionUpdate } from "@/lib/rovo-ui-messages";
import { deriveTaskExecutionsFromRun } from "@/components/projects/plan/lib/execution-data";
import {
	applyExecutionUpdate,
	mergeStreamedExecutions,
	type TaskExecutionByTaskId,
} from "@/components/projects/plan/lib/task-execution-stream";
import { ExecutionGridView } from "@/components/projects/plan/components/execution-grid-view";
import { RunFilesTab } from "@/components/projects/plan/components/run-files-tab";
import { RunSummarySection } from "@/app/plan/runs/[runId]/run-summary-section";
import { AppSidebar } from "@/components/projects/plan/components/app-sidebar";
import ChatTitleRow from "@/components/projects/plan/components/chat-title-row";
import { usePlanConfig } from "@/components/projects/plan/hooks/use-plan-config";
import { useConfigDialogs } from "@/components/projects/plan/hooks/use-config-dialogs";
import { ConfigDialogs } from "@/components/projects/plan/components/config-dialogs";
import {
	selectRetryTasks,
	type RetryTaskGroupKey,
} from "@/components/projects/plan/lib/retry-task-groups";
import {
	derivePlanEmojiFromTitle,
	resolvePlanDisplayTitle,
} from "@/components/projects/shared/lib/plan-identity";

interface RunWorkspaceProps {
	runId: string;
	initialRun: AgentRun;
	initialNowMs?: number;
	initialSummary: AgentRunSummary | null;
	initialVisualSummary: AgentRunVisualSummary | null;
	initialGenuiSummary: AgentRunGenuiSummary | null;
	initialArtifacts: AgentRunArtifact[];
}

interface RunSummaryResponse {
	run?: AgentRun;
	summary?: AgentRunSummary | null;
	visualSummary?: AgentRunVisualSummary | null;
	genuiSummary?: AgentRunGenuiSummary | null;
	error?: string;
}

interface RunFilesResponse {
	run?: AgentRun;
	artifacts?: AgentRunArtifact[];
	error?: string;
}

interface ShareNotice {
	type: "success" | "error";
	message: string;
	externalUrl?: string;
}

interface ConfluenceShareFormState {
	baseUrl: string;
	spaceKey: string;
	title: string;
	parentPageId: string;
}

const DEFAULT_CONFLUENCE_BASE_URL = "https://venn-test.atlassian.net/wiki";

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

function getLatestAudioArtifact(artifacts: AgentRunArtifact[]): AgentRunArtifact | null {
	const audioArtifacts = artifacts.filter(
		(artifact) => artifact.type === "audio" && typeof artifact.url === "string"
	);
	if (audioArtifacts.length === 0) {
		return null;
	}

	return [...audioArtifacts].sort((left, right) => {
		if (left.iteration !== right.iteration) {
			return right.iteration - left.iteration;
		}

		const leftTimestamp = Date.parse(left.createdAt);
		const rightTimestamp = Date.parse(right.createdAt);
		if (Number.isFinite(leftTimestamp) && Number.isFinite(rightTimestamp)) {
			return rightTimestamp - leftTimestamp;
		}

		return right.createdAt.localeCompare(left.createdAt);
	})[0];
}

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

export function RunWorkspace({
	runId,
	initialRun,
	initialNowMs,
	initialSummary,
	initialVisualSummary,
	initialGenuiSummary,
	initialArtifacts,
}: Readonly<RunWorkspaceProps>) {
	const router = useRouter();
	const [isOpen, setIsOpen] = useState(true);
	const [isHovered, setIsHovered] = useState(false);
	const hoverTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const [activeTab, setActiveTab] = useState("chat");
	const [run, setRun] = useState<AgentRun>(initialRun);
	const [summary, setSummary] = useState<AgentRunSummary | null>(initialSummary);
	const [visualSummary, setVisualSummary] =
		useState<AgentRunVisualSummary | null>(initialVisualSummary);
	const [genuiSummary, setGenuiSummary] =
		useState<AgentRunGenuiSummary | null>(initialGenuiSummary);
	const [runHistory, setRunHistory] = useState<AgentRunListItem[]>([]);
	const [artifacts, setArtifacts] = useState<AgentRunArtifact[]>(initialArtifacts);
	const [isAppending, setIsAppending] = useState(false);
	const [appendError, setAppendError] = useState<string | null>(null);
	const [summaryError, setSummaryError] = useState<string | null>(null);
	const [filesError, setFilesError] = useState<string | null>(null);
	const [isFilesLoading, setIsFilesLoading] = useState(false);
	const [streamedExecutionsByTaskId, setStreamedExecutionsByTaskId] =
		useState<TaskExecutionByTaskId>({});
	const eventSourceRef = useRef<EventSource | null>(null);
	const previousRunStatusRef = useRef<AgentRun["status"]>(initialRun.status);
	const queuedExecutionUpdatesRef = useRef<AgentExecutionUpdate[]>([]);
	const scheduledFlushFrameRef = useRef<number | null>(null);
	const [shareNotice, setShareNotice] = useState<ShareNotice | null>(null);
	const [isShareInFlight, setIsShareInFlight] = useState(false);
	const [isConfluenceDialogOpen, setIsConfluenceDialogOpen] = useState(false);
	const [confluenceShareForm, setConfluenceShareForm] = useState<ConfluenceShareFormState>({
		baseUrl: DEFAULT_CONFLUENCE_BASE_URL,
		spaceKey: "",
		title: "",
		parentPageId: "",
	});

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

	const handleNavigateToPlan = useCallback(() => {
		router.push("/plan");
	}, [router]);

	const handleSelectRun = useCallback(
		(targetRunId: string) => {
			router.push(`/plan/runs/${targetRunId}`);
		},
		[router]
	);

	const handleDeleteRun = useCallback(
		async (deletedRunId: string) => {
			try {
				const response = await fetch(
					API_ENDPOINTS.planRun(deletedRunId),
					{ method: "DELETE" }
				);
				if (!response.ok) {
					console.error("[PLAN] Failed to delete run:", response.status);
					return;
				}
				setRunHistory((prev) => prev.filter((r) => r.runId !== deletedRunId));
				if (deletedRunId === runId) {
					router.push("/plan");
				}
			} catch (error) {
				console.error("[PLAN] Failed to delete run:", error);
			}
		},
		[router, runId]
	);

	const handleUnusedSelectChat = useCallback((chatId: string) => {
		void chatId;
	}, []);

	const handleUnusedDeleteChat = useCallback((chatId: string) => {
		void chatId;
	}, []);

	const closeEventSource = useCallback(() => {
		if (eventSourceRef.current) {
			eventSourceRef.current.close();
			eventSourceRef.current = null;
		}
	}, []);

	const clearQueuedExecutionUpdates = useCallback(() => {
		queuedExecutionUpdatesRef.current = [];
		if (scheduledFlushFrameRef.current !== null) {
			cancelAnimationFrame(scheduledFlushFrameRef.current);
			scheduledFlushFrameRef.current = null;
		}
	}, []);

	const flushQueuedExecutionUpdates = useCallback(() => {
		if (scheduledFlushFrameRef.current !== null) {
			cancelAnimationFrame(scheduledFlushFrameRef.current);
			scheduledFlushFrameRef.current = null;
		}

		const queuedUpdates = queuedExecutionUpdatesRef.current;
		if (queuedUpdates.length === 0) {
			return;
		}

		queuedExecutionUpdatesRef.current = [];
		setStreamedExecutionsByTaskId((previousByTaskId) => {
			let nextById = previousByTaskId;
			for (const update of queuedUpdates) {
				nextById = applyExecutionUpdate(nextById, update);
			}
			return nextById;
		});
	}, []);

	const queueExecutionUpdate = useCallback(
		(update: AgentExecutionUpdate) => {
			queuedExecutionUpdatesRef.current.push(update);
			if (scheduledFlushFrameRef.current !== null) {
				return;
			}

			scheduledFlushFrameRef.current = window.requestAnimationFrame(() => {
				scheduledFlushFrameRef.current = null;
				flushQueuedExecutionUpdates();
			});
		},
		[flushQueuedExecutionUpdates]
	);

	const refreshSummary = useCallback(async () => {
		try {
			const response = await fetch(API_ENDPOINTS.planRunSummary(runId), {
				cache: "no-store",
			});
			if (!response.ok) {
				const payload = (await response.json().catch(() => ({}))) as unknown;
				setSummaryError(parseErrorMessage(payload));
				return;
			}

			const payload = (await response.json()) as RunSummaryResponse;
			if (payload.run) {
				setRun(payload.run);
			}
			setSummary(payload.summary ?? null);
			setVisualSummary(payload.visualSummary ?? null);
			setGenuiSummary(payload.genuiSummary ?? null);
			setSummaryError(null);
		} catch (error) {
			setSummaryError(toErrorMessage(error));
		}
	}, [runId]);

	const refreshFiles = useCallback(async () => {
		setIsFilesLoading(true);
		try {
			const response = await fetch(API_ENDPOINTS.planRunFiles(runId), {
				cache: "no-store",
			});
			if (!response.ok) {
				const payload = (await response.json().catch(() => ({}))) as unknown;
				setFilesError(parseErrorMessage(payload));
				return;
			}

			const payload = (await response.json()) as RunFilesResponse;
			if (payload.run) {
				setRun(payload.run);
			}
			setArtifacts(Array.isArray(payload.artifacts) ? payload.artifacts : []);
			setFilesError(null);
		} catch (error) {
			setFilesError(toErrorMessage(error));
		} finally {
			setIsFilesLoading(false);
		}
	}, [runId]);

	const refreshSummaryAndFiles = useCallback(async () => {
		await Promise.all([refreshSummary(), refreshFiles()]);
	}, [refreshFiles, refreshSummary]);

	useEffect(() => {
		return () => {
			if (hoverTimeoutRef.current) {
				clearTimeout(hoverTimeoutRef.current);
			}
			clearQueuedExecutionUpdates();
			closeEventSource();
		};
	}, [clearQueuedExecutionUpdates, closeEventSource]);

	useEffect(() => {
		const shouldConnectStream = run.status === "running";
		if (!shouldConnectStream) {
			closeEventSource();
			return;
		}

		closeEventSource();
		const source = new EventSource(API_ENDPOINTS.planRunStream(runId));
		eventSourceRef.current = source;

		source.onmessage = (messageEvent) => {
			const parsedEvent = (() => {
				try {
					return JSON.parse(messageEvent.data) as unknown;
				} catch {
					return null;
				}
			})();
			if (!isAgentRunStreamEvent(parsedEvent)) {
				return;
			}

			const runEvent = parsedEvent as AgentRunStreamEvent;
			if (runEvent.type === "agent.update") {
				queueExecutionUpdate(runEvent.update);
				return;
			}

			flushQueuedExecutionUpdates();
			if ("update" in runEvent && runEvent.update) {
				setStreamedExecutionsByTaskId((previousByTaskId) =>
					applyExecutionUpdate(previousByTaskId, runEvent.update as AgentExecutionUpdate)
				);
			}

			if ("run" in runEvent && runEvent.run) {
				setRun(runEvent.run);
			}

			if (
				runEvent.type === "run.summary-ready" ||
				runEvent.type === "run.completed" ||
				runEvent.type === "run.failed"
			) {
				void refreshSummaryAndFiles();
			}
		};

		source.onerror = () => {
			flushQueuedExecutionUpdates();
			source.close();
			eventSourceRef.current = null;
		};

		return () => {
			clearQueuedExecutionUpdates();
			source.close();
			if (eventSourceRef.current === source) {
				eventSourceRef.current = null;
			}
		};
	}, [clearQueuedExecutionUpdates, closeEventSource, flushQueuedExecutionUpdates, queueExecutionUpdate, refreshSummaryAndFiles, run.status, runId]);

	useEffect(() => {
		const previousStatus = previousRunStatusRef.current;
		if (
			(previousStatus === "running" && run.status !== "running") ||
			(previousStatus !== run.status && run.status === "completed")
		) {
			void refreshSummaryAndFiles();
		}
		previousRunStatusRef.current = run.status;
	}, [refreshSummaryAndFiles, run.status]);

	useEffect(() => {
		let cancelled = false;
		const loadRunHistory = async () => {
			try {
				const response = await fetch(
					API_ENDPOINTS.planRuns(),
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
			} catch {
				// Network errors are expected during dev when the backend restarts.
			}
		};

		void loadRunHistory();

		return () => {
			cancelled = true;
		};
	}, [run.runId, run.status]);

	const appendTasksToRun = useCallback(
		async (
			targetRunId: string,
			prompt: string,
			contextPrompt?: string,
			retryTaskIds?: string[]
		): Promise<AgentRun | null> => {
			const normalizedMessage = prompt.trim();
			const hasRetryTaskIds = Array.isArray(retryTaskIds) && retryTaskIds.length > 0;
			if ((!normalizedMessage && !hasRetryTaskIds) || isAppending) {
				return null;
			}

			setAppendError(null);
			setIsAppending(true);
			setActiveTab("chat");

			try {
				const response = await fetch(API_ENDPOINTS.planRunTasks(targetRunId), {
					method: "POST",
					headers: {
						"Content-Type": "application/json",
					},
					body: JSON.stringify({
						prompt: normalizedMessage,
						contextPrompt,
						retryTaskIds,
					}),
				});
				if (!response.ok) {
					const payload = (await response.json().catch(() => ({}))) as unknown;
					throw new Error(parseErrorMessage(payload));
				}

				const payload = (await response.json()) as { run?: AgentRun };
				const nextRun = payload.run ?? null;
				if (nextRun) {
					setRunHistory((previousHistory) => {
						const nextRunsById = new Map(
							previousHistory.map((historyRun) => [historyRun.runId, historyRun] as const)
						);
						nextRunsById.set(nextRun.runId, nextRun);
						return Array.from(nextRunsById.values()).sort(sortRunsByRecency);
					});
					if (nextRun.runId === run.runId) {
						setRun(nextRun);
					}
				}

				return nextRun;
			} catch (error) {
				setAppendError(toErrorMessage(error));
				return null;
			} finally {
				setIsAppending(false);
			}
		},
		[isAppending, run.runId]
	);

	const handleAppendTasks = useCallback(
		async (message: string) => {
			await appendTasksToRun(runId, message);
		},
		[appendTasksToRun, runId]
	);

	const handleRetryRunGroup = useCallback(
		async (targetRunId: string, groupKey: RetryTaskGroupKey, taskIds: string[]) => {
			const targetRun =
				run.runId === targetRunId
					? run
					: runHistory.find((historyRun) => historyRun.runId === targetRunId);
			if (!targetRun) {
				return;
			}

			const selectedTasks = selectRetryTasks(targetRun.tasks, groupKey, taskIds);
			if (selectedTasks.length === 0) {
				return;
			}

			const nextRun = await appendTasksToRun(
				targetRunId,
				"",
				undefined,
				selectedTasks.map((task) => task.id)
			);
			if (!nextRun) {
				return;
			}

			if (targetRunId !== run.runId) {
				router.push(`/plan/runs/${targetRunId}`);
			}
		},
		[appendTasksToRun, router, run, runHistory]
	);

	const taskExecutions = useMemo(() => {
		const baseExecutions = deriveTaskExecutionsFromRun(run);
		return mergeStreamedExecutions(baseExecutions, streamedExecutionsByTaskId);
	}, [run, streamedExecutionsByTaskId]);
	const sidebarRunHistory = useMemo(() => {
		const runsById = new Map<string, AgentRunListItem>();
		for (const runItem of runHistory) {
			runsById.set(runItem.runId, runItem);
		}
		runsById.set(run.runId, run);

		return Array.from(runsById.values())
			.sort(sortRunsByRecency);
	}, [run, runHistory]);

	const latestAudioArtifact = useMemo(
		() => getLatestAudioArtifact(artifacts),
		[artifacts]
	);

	const summarySectionKey = useMemo(
		() =>
			[
				run.iteration,
				summary?.createdAt ?? "none",
				visualSummary?.createdAt ?? "none",
				genuiSummary?.createdAt ?? "none",
				latestAudioArtifact?.createdAt ?? "none",
			].join(":"),
		[
			genuiSummary?.createdAt,
			latestAudioArtifact?.createdAt,
			run.iteration,
			summary?.createdAt,
			visualSummary?.createdAt,
		]
	);
	const runDisplayTitle = useMemo(() => {
		const resolvedTitle = resolvePlanDisplayTitle(run.plan.title, run.plan.tasks);
		const resolvedEmoji = derivePlanEmojiFromTitle(resolvedTitle);
		return `${resolvedEmoji} ${resolvedTitle}`;
	}, [run.plan.tasks, run.plan.title]);
	const defaultConfluenceTitle = useMemo(
		() => `${runDisplayTitle} summary`,
		[runDisplayTitle]
	);
	const isSummaryGenerating = useMemo(() => {
		if (summaryError) {
			return false;
		}

		if (run.status === "running") {
			return true;
		}

		return summary === null || visualSummary === null || genuiSummary === null;
	}, [genuiSummary, run.status, summary, summaryError, visualSummary]);
	const isShareDisabled = useMemo(() => {
		const summaryContent = typeof summary?.content === "string" ? summary.content.trim() : "";
		return summaryContent.length === 0 || isShareInFlight;
	}, [isShareInFlight, summary?.content]);

	const postRunShare = useCallback(
		async (requestBody: AgentRunShareRequest): Promise<AgentRunShareResponse> => {
			const response = await fetch(API_ENDPOINTS.planRunShare(runId), {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify(requestBody),
			});
			if (!response.ok) {
				const payload = (await response.json().catch(() => ({}))) as unknown;
				throw new Error(parseErrorMessage(payload));
			}

			const payload = (await response.json()) as AgentRunShareResponse;
			return payload;
		},
		[runId]
	);

	const handleShareToSlack = useCallback(async () => {
		if (isShareDisabled) {
			return;
		}

		setShareNotice(null);
		setIsShareInFlight(true);
		try {
			const payload = await postRunShare({ target: "slack" });
			setShareNotice({
				type: "success",
				message: "Sent final synthesis to Slack DM.",
				externalUrl: payload.externalUrl,
			});
		} catch (error) {
			setShareNotice({
				type: "error",
				message: toErrorMessage(error),
			});
		} finally {
			setIsShareInFlight(false);
		}
	}, [isShareDisabled, postRunShare]);

	const handleOpenConfluenceShareDialog = useCallback(() => {
		if (isShareDisabled) {
			return;
		}

		setConfluenceShareForm({
			baseUrl: DEFAULT_CONFLUENCE_BASE_URL,
			spaceKey: "",
			title: defaultConfluenceTitle,
			parentPageId: "",
		});
		setShareNotice(null);
		setIsConfluenceDialogOpen(true);
	}, [defaultConfluenceTitle, isShareDisabled]);

	const handleConfluenceFieldChange = useCallback(
		(field: keyof ConfluenceShareFormState, value: string) => {
			setConfluenceShareForm((previous) => ({
				...previous,
				[field]: value,
			}));
		},
		[]
	);

	const handleSubmitConfluenceShare = useCallback(
		async (event: FormEvent<HTMLFormElement>) => {
			event.preventDefault();
			if (isShareDisabled) {
				return;
			}

			setShareNotice(null);
			setIsShareInFlight(true);
			try {
				const confluencePayload: AgentRunConfluenceShareInput = {
					baseUrl: confluenceShareForm.baseUrl.trim() || undefined,
					spaceKey: confluenceShareForm.spaceKey.trim() || undefined,
					title: confluenceShareForm.title.trim() || undefined,
					parentPageId: confluenceShareForm.parentPageId.trim() || undefined,
				};
				const payload = await postRunShare({
					target: "confluence",
					confluence: confluencePayload,
				});
				setShareNotice({
					type: "success",
					message: "Created Confluence page from final synthesis.",
					externalUrl: payload.externalUrl,
				});
				setIsConfluenceDialogOpen(false);
			} catch (error) {
				setShareNotice({
					type: "error",
					message: toErrorMessage(error),
				});
			} finally {
				setIsShareInFlight(false);
			}
		},
		[confluenceShareForm, isShareDisabled, postRunShare]
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
				"[&_[data-slot=sidebar-gap]]:ease-[var(--ease-in-out)] [&_[data-slot=sidebar-container]]:ease-[var(--ease-in-out)]"
			)}
		>
			<AppSidebar
				isOverlay={false}
				isHoverReveal={!isOpen && isHovered}
				onPinSidebar={handlePinSidebar}
				chatHistory={[]}
				activeChatId={null}
				runHistory={sidebarRunHistory}
				activeRunId={run.runId}
				initialNowMs={initialNowMs}
				onSelectRun={handleSelectRun}
				onDeleteRun={handleDeleteRun}
				onRetryRunGroup={handleRetryRunGroup}
				onSelectChat={handleUnusedSelectChat}
				onDeleteChat={handleUnusedDeleteChat}
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
				onNewChat={handleNavigateToPlan}
				onCreatePlan={handleNavigateToPlan}
			/>
			<SidebarInset className="h-svh overflow-hidden">
				<Tabs
					value={activeTab}
					onValueChange={setActiveTab}
					className="flex h-full min-h-0 flex-col gap-0"
				>
					<ChatTitleRow
						title={runDisplayTitle}
						isTitlePending={false}
						onNewChat={handleNavigateToPlan}
						onShareToConfluence={handleOpenConfluenceShareDialog}
						onShareToSlack={handleShareToSlack}
						shareDisabled={isShareDisabled}
						isSharing={isShareInFlight}
						centerSlot={(
							<TabsList className="w-fit shrink-0">
								<TabsTrigger value="chat">Chat</TabsTrigger>
								<TabsTrigger value="summary">
									<span className="inline-flex items-center gap-1.5">
										{isSummaryGenerating ? (
											<Spinner
												size="xs"
												className="text-text-subtle"
												label="Generating summary results"
											/>
										) : null}
										<span>Summary</span>
									</span>
								</TabsTrigger>
								<TabsTrigger value="files">
									Files <Badge variant="secondary">{artifacts.length}</Badge>
								</TabsTrigger>
							</TabsList>
						)}
						sidebarOpen={isOpen}
						sidebarHovered={isHovered}
						onExpandSidebar={() => setIsOpen(true)}
						onHoverEnter={handleHoverEnter}
						onHoverLeave={handleHoverLeave}
					/>
					{shareNotice ? (
						<div
							className={cn(
								"border-b px-4 py-2 text-sm md:px-6",
								shareNotice.type === "success"
									? "bg-bg-success-subtler text-text-success-bolder"
									: "bg-bg-danger-subtler text-text-danger-bolder"
							)}
						>
							<div className="flex flex-wrap items-center justify-between gap-2">
								<span>{shareNotice.message}</span>
								{shareNotice.externalUrl ? (
									<a
										href={shareNotice.externalUrl}
										target="_blank"
										rel="noreferrer"
										className="text-link underline-offset-3 hover:underline"
									>
										Open
									</a>
								) : null}
							</div>
						</div>
					) : null}
					<TabsContent value="chat" className="min-h-0 flex-1 overflow-hidden">
						<div className="flex h-full min-h-0 flex-col">
							{appendError ? (
								<p className="mx-4 mt-4 rounded-md border border-border bg-surface-raised px-3 py-2 text-sm text-text-danger md:mx-6">
									{appendError}
								</p>
							) : null}
							<div className={cn("min-h-0 flex-1 overflow-hidden", appendError ? "mt-4" : null)}>
							<ExecutionGridView
								taskExecutions={taskExecutions}
								showGeneratingEmptyState={isAppending}
							/>
							</div>
						</div>
					</TabsContent>

					<TabsContent value="summary" className="min-h-0 flex-1 overflow-y-auto">
						<div className="flex flex-col gap-4 px-4 pb-4 pt-4 md:px-6">
							{summaryError ? (
								<p className="rounded-md border border-border bg-surface-raised px-3 py-2 text-sm text-text-danger">
									{summaryError}
								</p>
							) : null}

							<RunSummarySection
								key={summarySectionKey}
								runId={runId}
								initialRun={run}
								initialSummary={summary}
								initialVisualSummary={visualSummary}
								initialGenuiSummary={genuiSummary}
								audioSummaryUrl={latestAudioArtifact?.url ?? null}
							/>
						</div>
					</TabsContent>

					<TabsContent value="files" className="min-h-0 flex-1 overflow-y-auto">
						<div className="px-4 pb-4 pt-4 md:px-6">
							<RunFilesTab artifacts={artifacts} isLoading={isFilesLoading} error={filesError} />
						</div>
					</TabsContent>
				</Tabs>
				<Dialog open={isConfluenceDialogOpen} onOpenChange={setIsConfluenceDialogOpen}>
					<DialogContent size="md">
						<form className="flex flex-col gap-4" onSubmit={handleSubmitConfluenceShare}>
							<DialogHeader>
								<DialogTitle>Share to Confluence</DialogTitle>
								<DialogDescription>
									Create a Confluence page using the final synthesis content.
								</DialogDescription>
							</DialogHeader>
							<div className="grid gap-3">
								<div className="grid gap-1.5">
									<Label htmlFor="share-confluence-base-url">Confluence base URL</Label>
									<Input
										id="share-confluence-base-url"
										value={confluenceShareForm.baseUrl}
										onChange={(event) =>
											handleConfluenceFieldChange("baseUrl", event.target.value)
										}
										placeholder={DEFAULT_CONFLUENCE_BASE_URL}
									/>
								</div>
								<div className="grid gap-1.5">
									<Label htmlFor="share-confluence-space-key">Space key</Label>
									<Input
										id="share-confluence-space-key"
										value={confluenceShareForm.spaceKey}
										onChange={(event) =>
											handleConfluenceFieldChange("spaceKey", event.target.value)
										}
										placeholder="TEAM"
										required
									/>
								</div>
								<div className="grid gap-1.5">
									<Label htmlFor="share-confluence-title">Page title</Label>
									<Input
										id="share-confluence-title"
										value={confluenceShareForm.title}
										onChange={(event) =>
											handleConfluenceFieldChange("title", event.target.value)
										}
										placeholder={defaultConfluenceTitle}
										required
									/>
								</div>
								<div className="grid gap-1.5">
									<Label htmlFor="share-confluence-parent-page-id">
										Parent page ID (optional)
									</Label>
									<Input
										id="share-confluence-parent-page-id"
										value={confluenceShareForm.parentPageId}
										onChange={(event) =>
											handleConfluenceFieldChange("parentPageId", event.target.value)
										}
										placeholder="123456789"
									/>
								</div>
							</div>
							<DialogFooter className="flex-row justify-end gap-2 border-0 bg-transparent p-0">
								<Button
									type="button"
									variant="outline"
									onClick={() => setIsConfluenceDialogOpen(false)}
									disabled={isShareInFlight}
								>
									Cancel
								</Button>
								<Button type="submit" isLoading={isShareInFlight} disabled={isShareInFlight}>
									Share
								</Button>
							</DialogFooter>
						</form>
					</DialogContent>
				</Dialog>
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
