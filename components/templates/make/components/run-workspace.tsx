"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { ThemeToggle } from "@/components/utils/theme-wrapper";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { API_ENDPOINTS } from "@/lib/api-config";
import { cn } from "@/lib/utils";
import type {
	AgentRun,
	AgentRunListItem,
	AgentRunStreamEvent,
} from "@/lib/make-run-types";
import { isAgentRunStreamEvent } from "@/lib/make-run-types";
import type { AgentExecutionUpdate } from "@/lib/rovo-ui-messages";
import { deriveTaskExecutionsFromRun } from "@/components/templates/make/lib/execution-data";
import {
	applyExecutionUpdate,
	mergeStreamedExecutions,
	type TaskExecutionByTaskId,
} from "@/components/templates/make/lib/task-execution-stream";
import { MakeArtifactSurface } from "@/components/blocks/make-artifact/components/make-artifact-surface";
import { MakeGridSurface } from "@/components/blocks/make-grid/components/make-grid-surface";
import { AppSidebar } from "@/components/templates/make/components/app-sidebar";
import ChatTitleRow from "@/components/templates/make/components/chat-title-row";
import { useMakeConfig } from "@/components/templates/make/hooks/use-make-config";
import { useConfigDialogs } from "@/components/templates/make/hooks/use-config-dialogs";
import { ConfigDialogs } from "@/components/templates/make/components/config-dialogs";
import {
	selectRetryTasks,
	type RetryTaskGroupKey,
} from "@/components/templates/make/lib/retry-task-groups";
import NotificationIcon from "@atlaskit/icon/core/notification";

interface RunWorkspaceProps {
	runId: string;
	initialRun: AgentRun;
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
}: Readonly<RunWorkspaceProps>) {
	const router = useRouter();
	const [isOpen, setIsOpen] = useState(true);
	const [isHovered, setIsHovered] = useState(false);
	const hoverTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const [run, setRun] = useState<AgentRun>(initialRun);
	const [runHistory, setRunHistory] = useState<AgentRunListItem[]>([]);
	const [isAppending, setIsAppending] = useState(false);
	const [appendError, setAppendError] = useState<string | null>(null);
	const [streamedExecutionsByTaskId, setStreamedExecutionsByTaskId] =
		useState<TaskExecutionByTaskId>({});
	const eventSourceRef = useRef<EventSource | null>(null);
	const queuedExecutionUpdatesRef = useRef<AgentExecutionUpdate[]>([]);
	const scheduledFlushFrameRef = useRef<number | null>(null);

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
	} = useMakeConfig();

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

	const handleNavigateToMake = useCallback(() => {
		router.push("/make");
	}, [router]);

	const handleSelectRun = useCallback(
		(targetRunId: string) => {
			router.push(`/make/runs/${targetRunId}`);
		},
		[router]
	);

	const handleDeleteRun = useCallback(
		async (deletedRunId: string) => {
			try {
				const response = await fetch(
					API_ENDPOINTS.makeRun(deletedRunId),
					{ method: "DELETE" }
				);
				if (!response.ok) {
					console.error("[MAKE] Failed to delete run:", response.status);
					return;
				}
				setRunHistory((prev) => prev.filter((r) => r.runId !== deletedRunId));
				if (deletedRunId === runId) {
					router.push("/make");
				}
			} catch (error) {
				console.error("[MAKE] Failed to delete run:", error);
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
		const source = new EventSource(API_ENDPOINTS.makeRunStream(runId));
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
	}, [clearQueuedExecutionUpdates, closeEventSource, flushQueuedExecutionUpdates, queueExecutionUpdate, run.status, runId]);

	useEffect(() => {
		let cancelled = false;
		const loadRunHistory = async () => {
			try {
				const response = await fetch(
					API_ENDPOINTS.makeRuns(),
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
				console.error("[MAKE] Failed to load sidebar run history:", error);
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

			try {
				const response = await fetch(API_ENDPOINTS.makeRunTasks(targetRunId), {
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
				router.push(`/make/runs/${targetRunId}`);
			}
		},
		[appendTasksToRun, router, run, runHistory]
	);

	const handleAddTask = useCallback(
		(message: string) => {
			void appendTasksToRun(run.runId, message);
		},
		[appendTasksToRun, run.runId]
	);

	const taskExecutions = useMemo(() => {
		const baseExecutions = deriveTaskExecutionsFromRun(run);
		return mergeStreamedExecutions(baseExecutions, streamedExecutionsByTaskId);
	}, [run, streamedExecutionsByTaskId]);
	// Show execution grid while the run is actively executing.
	const shouldShowExecutionGrid = run.status === "running" || isAppending;

	const sidebarRunHistory = useMemo(() => {
		const runsById = new Map<string, AgentRunListItem>();
		for (const runItem of runHistory) {
			runsById.set(runItem.runId, runItem);
		}
		runsById.set(run.runId, run);

		return Array.from(runsById.values())
			.sort(sortRunsByRecency);
	}, [run, runHistory]);

	const handleTabChange = useCallback(
		(value: string) => {
			if (value !== "make") {
				router.push("/make");
			}
		},
		[router]
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
				onNewChat={handleNavigateToMake}
				onNewProject={handleNavigateToMake}
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
					value="make"
					onValueChange={handleTabChange}
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
						sidebarOpen={isOpen}
						sidebarHovered={isHovered}
						onExpandSidebar={() => setIsOpen(true)}
						onHoverEnter={handleHoverEnter}
						onHoverLeave={handleHoverLeave}
					/>
					<TabsContent value="make" className="min-h-0 flex-1 overflow-hidden">
						<div className="flex h-full min-h-0 flex-col">
							{appendError ? (
								<p className="mx-4 mt-4 rounded-md border border-border bg-surface-raised px-3 py-2 text-sm text-text-danger md:mx-6">
									{appendError}
								</p>
							) : null}
							<div className={cn("min-h-0 flex-1 overflow-hidden", appendError ? "mt-4" : null)}>
								{shouldShowExecutionGrid ? (
									<MakeGridSurface
										taskExecutions={taskExecutions}
										onAddTask={handleAddTask}
										showGeneratingEmptyState={isAppending}
									/>
								) : (
									<MakeArtifactSurface run={run} />
								)}
							</div>
						</div>
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
