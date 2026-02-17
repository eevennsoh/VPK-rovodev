"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
	AudioPlayer,
	AudioPlayerControlBar,
	AudioPlayerDurationDisplay,
	AudioPlayerElement,
	AudioPlayerPlayButton,
	AudioPlayerTimeDisplay,
	AudioPlayerTimeRange,
} from "@/components/ui-ai/audio-player";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { API_ENDPOINTS } from "@/lib/api-config";
import type {
	AgentRun,
	AgentRunArtifact,
	AgentRunSummary,
	AgentRunVisualSummary,
	AgentRunGenuiSummary,
	AgentRunStreamEvent,
} from "@/lib/agents-team-run-types";
import { isAgentRunStreamEvent } from "@/lib/agents-team-run-types";
import type { AgentExecutionUpdate } from "@/lib/rovo-ui-messages";
import {
	computeTaskStatusGroupsFromRun,
	deriveTaskExecutionsFromRun,
	type TaskExecution,
} from "@/components/templates/agents-team/lib/execution-data";
import { ExecutionGridView } from "@/components/templates/agents-team/components/execution-grid-view";
import { TaskTrackerCard } from "@/components/templates/agents-team/components/task-tracker-card";
import { RunFilesTab } from "@/components/templates/agents-team/components/run-files-tab";
import { RunSummarySection } from "@/app/agents-team/runs/[runId]/run-summary-section";

interface RunWorkspaceProps {
	runId: string;
	initialRun: AgentRun;
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

type TaskExecutionByAgentId = Record<string, TaskExecution>;

function applyExecutionUpdate(
	previousByAgentId: TaskExecutionByAgentId,
	update: AgentExecutionUpdate
): TaskExecutionByAgentId {
	if (!update.agentId || !update.taskId) {
		return previousByAgentId;
	}

	const existingExecution = previousByAgentId[update.agentId];
	if (existingExecution && existingExecution.agentId === update.agentId) {
		const hasTaskChanged = existingExecution.taskId !== update.taskId;
		const nextContent = update.content
			? hasTaskChanged
				? update.content
				: `${existingExecution.content}${update.content}`
			: existingExecution.content;
		return {
			...previousByAgentId,
			[update.agentId]: {
				...existingExecution,
				taskId: update.taskId,
				agentName: update.agentName,
				taskLabel: update.taskLabel,
				status: update.status,
				content: nextContent,
			},
		};
	}

	return {
		...previousByAgentId,
		[update.agentId]: {
			taskId: update.taskId,
			taskLabel: update.taskLabel,
			agentId: update.agentId,
			agentName: update.agentName,
			status: update.status,
			content: update.content ?? "",
		},
	};
}

function mergeStreamedExecutions(
	baseExecutions: ReadonlyArray<TaskExecution>,
	streamedExecutionsByAgentId: TaskExecutionByAgentId
): TaskExecution[] {
	const streamedExecutions = Object.values(streamedExecutionsByAgentId);
	if (streamedExecutions.length === 0) {
		return [...baseExecutions];
	}

	const mergedById = new Map(
		baseExecutions.map((execution) => [execution.agentId, execution] as const)
	);
	for (const streamedExecution of streamedExecutions) {
		mergedById.set(streamedExecution.agentId, streamedExecution);
	}

	const orderedExecutions = baseExecutions.map(
		(execution) => mergedById.get(execution.agentId) ?? execution
	);
	const baseAgentIds = new Set(baseExecutions.map((execution) => execution.agentId));
	for (const streamedExecution of streamedExecutions) {
		if (!baseAgentIds.has(streamedExecution.agentId)) {
			orderedExecutions.push(streamedExecution);
		}
	}

	return orderedExecutions;
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

export function RunWorkspace({
	runId,
	initialRun,
	initialSummary,
	initialVisualSummary,
	initialGenuiSummary,
	initialArtifacts,
}: Readonly<RunWorkspaceProps>) {
	const [activeTab, setActiveTab] = useState("chat");
	const [run, setRun] = useState<AgentRun>(initialRun);
	const [summary, setSummary] = useState<AgentRunSummary | null>(initialSummary);
	const [visualSummary, setVisualSummary] =
		useState<AgentRunVisualSummary | null>(initialVisualSummary);
	const [genuiSummary, setGenuiSummary] =
		useState<AgentRunGenuiSummary | null>(initialGenuiSummary);
	const [artifacts, setArtifacts] = useState<AgentRunArtifact[]>(initialArtifacts);
	const [isAppending, setIsAppending] = useState(false);
	const [appendError, setAppendError] = useState<string | null>(null);
	const [summaryError, setSummaryError] = useState<string | null>(null);
	const [filesError, setFilesError] = useState<string | null>(null);
	const [isFilesLoading, setIsFilesLoading] = useState(false);
	const [streamedExecutionsByAgentId, setStreamedExecutionsByAgentId] =
		useState<TaskExecutionByAgentId>({});
	const eventSourceRef = useRef<EventSource | null>(null);
	const previousRunStatusRef = useRef<AgentRun["status"]>(initialRun.status);

	const closeEventSource = useCallback(() => {
		if (eventSourceRef.current) {
			eventSourceRef.current.close();
			eventSourceRef.current = null;
		}
	}, []);

	const refreshSummary = useCallback(async () => {
		try {
			const response = await fetch(API_ENDPOINTS.agentsTeamRunSummary(runId), {
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
			const response = await fetch(API_ENDPOINTS.agentsTeamRunFiles(runId), {
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
			closeEventSource();
		};
	}, [closeEventSource]);

	useEffect(() => {
		const shouldConnectStream = run.status === "running";
		if (!shouldConnectStream) {
			closeEventSource();
			return;
		}

		closeEventSource();
		const source = new EventSource(API_ENDPOINTS.agentsTeamRunStream(runId));
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
				setStreamedExecutionsByAgentId((previousByAgentId) =>
					applyExecutionUpdate(previousByAgentId, runEvent.update)
				);
				return;
			}

			if ("update" in runEvent && runEvent.update) {
				setStreamedExecutionsByAgentId((previousByAgentId) =>
					applyExecutionUpdate(previousByAgentId, runEvent.update as AgentExecutionUpdate)
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
			source.close();
			eventSourceRef.current = null;
		};

		return () => {
			source.close();
			if (eventSourceRef.current === source) {
				eventSourceRef.current = null;
			}
		};
	}, [closeEventSource, refreshSummaryAndFiles, run.status, runId]);

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

	const handleAppendTasks = useCallback(
		async (message: string) => {
			const normalizedMessage = message.trim();
			if (!normalizedMessage || isAppending) {
				return;
			}

			setAppendError(null);
			setIsAppending(true);
			setActiveTab("chat");

			try {
				const response = await fetch(API_ENDPOINTS.agentsTeamRunTasks(runId), {
					method: "POST",
					headers: {
						"Content-Type": "application/json",
					},
					body: JSON.stringify({
						prompt: normalizedMessage,
					}),
				});
				if (!response.ok) {
					const payload = (await response.json().catch(() => ({}))) as unknown;
					throw new Error(parseErrorMessage(payload));
				}

				const payload = (await response.json()) as { run?: AgentRun };
				if (payload.run) {
					setRun(payload.run);
					setStreamedExecutionsByAgentId({});
				}
			} catch (error) {
				setAppendError(toErrorMessage(error));
			} finally {
				setIsAppending(false);
			}
		},
		[isAppending, runId]
	);

	const taskStatusGroups = useMemo(
		() => computeTaskStatusGroupsFromRun(run.tasks),
		[run.tasks]
	);
	const taskExecutions = useMemo(() => {
		const baseExecutions = deriveTaskExecutionsFromRun(run);
		return mergeStreamedExecutions(baseExecutions, streamedExecutionsByAgentId);
	}, [run, streamedExecutionsByAgentId]);

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
			].join(":"),
		[genuiSummary?.createdAt, run.iteration, summary?.createdAt, visualSummary?.createdAt]
	);

	return (
		<div className="mx-auto flex min-h-svh w-full max-w-[1120px] flex-col gap-5 px-4 py-8 md:px-6">
			<div className="flex flex-wrap items-start justify-between gap-3">
				<div>
					<p className="text-xs uppercase tracking-wide text-text-subtlest">Agent run workspace</p>
					<h1 className="mt-1 text-xl font-semibold text-text">
						{run.plan.emoji ? `${run.plan.emoji} ` : ""}
						{run.plan.title}
					</h1>
					<p className="mt-1 text-sm text-text-subtle">
						Status: {run.status} · Iteration {run.iteration}
					</p>
				</div>
				<Link
					href="/agents-team"
					className="inline-flex h-9 items-center rounded-md border border-border px-3 text-sm text-text hover:bg-bg-neutral-subtle-hovered"
				>
					Back to agents team
				</Link>
			</div>

			<Tabs value={activeTab} onValueChange={setActiveTab}>
				<TabsList>
					<TabsTrigger value="chat">Chat</TabsTrigger>
					<TabsTrigger value="summary">Summary</TabsTrigger>
					<TabsTrigger value="files">Files</TabsTrigger>
				</TabsList>

				<TabsContent value="chat" className="mt-4">
					<div className="flex flex-col gap-4">
						{appendError ? (
							<p className="rounded-md border border-border bg-surface-raised px-3 py-2 text-sm text-text-danger">
								{appendError}
							</p>
						) : null}
						<div className="rounded-xl border border-border bg-surface-raised p-3">
							<TaskTrackerCard
								planTitle={run.plan.title}
								planEmoji={run.plan.emoji ?? "✌️"}
								taskStatusGroups={taskStatusGroups}
								runStatus={run.status}
								runCreatedAt={run.createdAt}
								runCompletedAt={run.completedAt}
							/>
						</div>
						<div className="h-[620px] min-h-[420px] overflow-hidden rounded-xl border border-border bg-surface">
							<ExecutionGridView
								taskExecutions={taskExecutions}
								onAddTask={handleAppendTasks}
							/>
						</div>
						<p className="text-xs text-text-subtlest">
							{isAppending
								? "Appending tasks to this run…"
								: "Use the input on the execution grid to append follow-up tasks to this same run."}
						</p>
					</div>
				</TabsContent>

				<TabsContent value="summary" className="mt-4">
					<div className="flex flex-col gap-4">
						<section className="rounded-xl border border-border bg-surface-raised p-5">
							<h2 className="text-base font-semibold text-text">Narrated summary</h2>
							<div className="mt-3">
								{latestAudioArtifact?.url ? (
									<AudioPlayer>
										<AudioPlayerElement src={latestAudioArtifact.url} />
										<AudioPlayerControlBar>
											<AudioPlayerPlayButton />
											<AudioPlayerTimeDisplay />
											<AudioPlayerTimeRange />
											<AudioPlayerDurationDisplay />
										</AudioPlayerControlBar>
									</AudioPlayer>
								) : (
									<p className="text-sm text-text-subtle">
										Audio summary has not been generated yet.
									</p>
								)}
							</div>
						</section>

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
						/>
					</div>
				</TabsContent>

				<TabsContent value="files" className="mt-4">
					<RunFilesTab artifacts={artifacts} isLoading={isFilesLoading} error={filesError} />
				</TabsContent>
			</Tabs>
		</div>
	);
}
