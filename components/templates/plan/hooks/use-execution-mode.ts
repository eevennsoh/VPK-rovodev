"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { API_ENDPOINTS } from "@/lib/api-config";
import type { AgentExecutionUpdate } from "@/lib/rovo-ui-messages";
import type {
	AgentRun,
	AgentRunStreamEvent,
} from "@/lib/plan-run-types";
import {
	computeTaskStatusGroupsFromRun,
	deriveTaskExecutionsFromRun,
	type TaskExecution,
	type TaskStatusGroups,
} from "../lib/execution-data";
import {
	applyExecutionUpdate,
	mergeStreamedExecutions,
	type TaskExecutionByTaskId,
} from "../lib/task-execution-stream";
import type { ParsedPlanWidgetPayload } from "@/components/templates/shared/lib/plan-widget";

export type ExecutionState = "idle" | "executing" | "completed" | "failed";

interface ConversationItem {
	role: "user" | "assistant";
	content: string;
}

interface StartExecutionOptions {
	plan: ParsedPlanWidgetPayload;
	userPrompt?: string;
	conversation?: ConversationItem[];
	customInstruction?: string;
}

export interface StartExecutionResult {
	runId: string;
}

interface SendDirectiveOptions {
	targetRunId?: string;
}

export type SendDirectiveResult =
	| {
			status: "sent";
			runId: string;
	  }
	| {
			status: "run-inactive";
			runId: string | null;
			message: string;
	  }
	| {
			status: "error";
			runId: string | null;
			message: string;
	  };

interface UseExecutionModeReturn {
	isExecuting: boolean;
	isExecutionActive: boolean;
	executionState: ExecutionState;
	runId: string | null;
	runStatus: AgentRun["status"] | null;
	runCreatedAt: string | null;
	runCompletedAt: string | null;
	taskExecutions: TaskExecution[];
	taskStatusGroups: TaskStatusGroups;
	executionPlan: ParsedPlanWidgetPayload | null;
	run: AgentRun | null;
	error: string | null;
	startExecution: (options: StartExecutionOptions) => Promise<StartExecutionResult>;
	sendDirective: (
		agentName: string,
		message: string,
		options?: SendDirectiveOptions
	) => Promise<SendDirectiveResult>;
}

const EMPTY_TASK_STATUS_GROUPS: TaskStatusGroups = {
	done: [],
	inReview: [],
	inProgress: [],
	failed: [],
	todo: [],
};

function toExecutionState(runStatus: AgentRun["status"]): ExecutionState {
	if (runStatus === "completed") {
		return "completed";
	}

	if (runStatus === "failed") {
		return "failed";
	}

	return "executing";
}

function isAgentRunStreamEvent(value: unknown): value is AgentRunStreamEvent {
	if (!value || typeof value !== "object") {
		return false;
	}

	return typeof (value as { type?: unknown }).type === "string";
}

function toExecutionPlan(run: AgentRun | null): ParsedPlanWidgetPayload | null {
	if (!run) {
		return null;
	}

	return {
		title: run.plan.title,
		description: run.plan.description,
		emoji: run.plan.emoji,
		tasks: run.plan.tasks,
		agents: run.plan.agents,
	};
}

function deriveTodoGroupsFromPlan(plan: ParsedPlanWidgetPayload): TaskStatusGroups {
	return {
		done: [],
		inReview: [],
		inProgress: [],
		failed: [],
		todo: plan.tasks.map((task) => ({
			id: task.id,
			label: task.label,
			status: "todo" as const,
			agentName: task.agent,
		})),
	};
}

function parseErrorMessage(value: unknown): string {
	if (!value || typeof value !== "object") {
		return "Request failed";
	}

	const record = value as { error?: unknown; details?: unknown };
	if (typeof record.error === "string" && record.error.trim()) {
		return record.error.trim();
	}

	if (typeof record.details === "string" && record.details.trim()) {
		return record.details.trim();
	}

	return "Request failed";
}

function isInactiveRunError(message: string): boolean {
	const normalizedMessage = message.toLowerCase();
	return (
		normalizedMessage.includes("run is not active") ||
		normalizedMessage.includes("run not found or not active")
	);
}

function getErrorMessage(error: unknown): string {
	if (error instanceof Error && error.message.trim()) {
		return error.message.trim();
	}

	return "Request failed";
}

export function useExecutionMode(): UseExecutionModeReturn {
	const [executionState, setExecutionState] = useState<ExecutionState>("idle");
	const [cachedPlan, setCachedPlan] = useState<ParsedPlanWidgetPayload | null>(null);
	const [run, setRun] = useState<AgentRun | null>(null);
	const [runId, setRunId] = useState<string | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [streamedExecutionsByTaskId, setStreamedExecutionsByTaskId] =
		useState<TaskExecutionByTaskId>({});
	const activeRunIdRef = useRef<string | null>(null);
	const eventSourceRef = useRef<EventSource | null>(null);
	const queuedExecutionUpdatesRef = useRef<AgentExecutionUpdate[]>([]);
	const scheduledFlushFrameRef = useRef<number | null>(null);

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

	const scheduleQueuedExecutionUpdatesFlush = useCallback(() => {
		if (scheduledFlushFrameRef.current !== null) {
			return;
		}

		scheduledFlushFrameRef.current = window.requestAnimationFrame(() => {
			scheduledFlushFrameRef.current = null;
			flushQueuedExecutionUpdates();
		});
	}, [flushQueuedExecutionUpdates]);

	const queueExecutionUpdate = useCallback(
		(update: AgentExecutionUpdate) => {
			queuedExecutionUpdatesRef.current.push(update);
			scheduleQueuedExecutionUpdatesFlush();
		},
		[scheduleQueuedExecutionUpdatesFlush]
	);

	const closeEventSource = useCallback(() => {
		if (eventSourceRef.current) {
			eventSourceRef.current.close();
			eventSourceRef.current = null;
		}
	}, []);

	const syncRunState = useCallback(
		(nextRun: AgentRun) => {
			if (activeRunIdRef.current !== nextRun.runId) {
				activeRunIdRef.current = nextRun.runId;
				clearQueuedExecutionUpdates();
				setStreamedExecutionsByTaskId({});
			}

			setRun(nextRun);
			setRunId(nextRun.runId);
			setExecutionState(toExecutionState(nextRun.status));
			if (nextRun.status !== "running") {
				flushQueuedExecutionUpdates();
				closeEventSource();
			}
		},
		[clearQueuedExecutionUpdates, closeEventSource, flushQueuedExecutionUpdates]
	);

	const handleRunEvent = useCallback(
		(event: AgentRunStreamEvent) => {
			if (event.type === "agent.update") {
				queueExecutionUpdate(event.update);
				return;
			}

			flushQueuedExecutionUpdates();
			if ("update" in event && event.update) {
				setStreamedExecutionsByTaskId((previousByTaskId) =>
					applyExecutionUpdate(previousByTaskId, event.update as AgentExecutionUpdate)
				);
			}

			syncRunState(event.run);
		},
		[flushQueuedExecutionUpdates, queueExecutionUpdate, syncRunState]
	);

	const connectToRunStream = useCallback(
		(nextRunId: string) => {
			closeEventSource();
			const source = new EventSource(API_ENDPOINTS.planRunStream(nextRunId));
			eventSourceRef.current = source;

			source.onmessage = (messageEvent) => {
				const parsedValue = (() => {
					try {
						return JSON.parse(messageEvent.data) as unknown;
					} catch {
						return null;
					}
				})();
				if (!isAgentRunStreamEvent(parsedValue)) {
					return;
				}

				handleRunEvent(parsedValue);
			};

			source.onerror = () => {
				flushQueuedExecutionUpdates();
				source.close();
				eventSourceRef.current = null;
			};
		},
		[closeEventSource, flushQueuedExecutionUpdates, handleRunEvent]
	);

	useEffect(() => {
		return () => {
			clearQueuedExecutionUpdates();
			closeEventSource();
		};
	}, [clearQueuedExecutionUpdates, closeEventSource]);

	const startExecution = useCallback(
		async (options: StartExecutionOptions) => {
			closeEventSource();
			clearQueuedExecutionUpdates();
			setError(null);
			setExecutionState("executing");
			setCachedPlan(options.plan);
			setRun(null);
			setRunId(null);
			setStreamedExecutionsByTaskId({});
			activeRunIdRef.current = null;

			const response = await fetch(API_ENDPOINTS.PLAN_RUNS, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					plan: options.plan,
					userPrompt: options.userPrompt,
					conversation: options.conversation,
					customInstruction: options.customInstruction,
				}),
			});
			if (!response.ok) {
				const payload = (await response.json().catch(() => ({}))) as unknown;
				const message = parseErrorMessage(payload);
				setExecutionState("idle");
				setError(message);
				throw new Error(message);
			}

			const payload = (await response.json()) as { run?: AgentRun };
			if (!payload.run) {
				const message = "Run creation response was missing run data.";
				setExecutionState("idle");
				setError(message);
				throw new Error(message);
			}

			syncRunState(payload.run);
			connectToRunStream(payload.run.runId);
			return { runId: payload.run.runId };
		},
		[clearQueuedExecutionUpdates, closeEventSource, connectToRunStream, syncRunState]
	);

	const sendDirective = useCallback(
		async (
			agentName: string,
			message: string,
			options?: SendDirectiveOptions
		): Promise<SendDirectiveResult> => {
			const targetRunId = options?.targetRunId ?? runId;
			if (!targetRunId) {
				return {
					status: "run-inactive",
					runId: null,
					message: "Run is not active.",
				};
			}

			setError(null);
			try {
				const response = await fetch(
					API_ENDPOINTS.planRunDirectives(targetRunId),
					{
						method: "POST",
						headers: {
							"Content-Type": "application/json",
						},
						body: JSON.stringify({
							agentName,
							message,
						}),
					}
				);
				if (!response.ok) {
					const payload = (await response.json().catch(() => ({}))) as unknown;
					const messageText = parseErrorMessage(payload);
					if (isInactiveRunError(messageText)) {
						return {
							status: "run-inactive",
							runId: targetRunId,
							message: messageText,
						};
					}

					setError(messageText);
					return {
						status: "error",
						runId: targetRunId,
						message: messageText,
					};
				}

				return {
					status: "sent",
					runId: targetRunId,
				};
			} catch (error) {
				const messageText = getErrorMessage(error);
				setError(messageText);
				return {
					status: "error",
					runId: targetRunId,
					message: messageText,
				};
			}
		},
		[runId]
	);

	const executionPlan = run ? toExecutionPlan(run) : cachedPlan;
	const taskStatusGroups = useMemo(() => {
		if (run) {
			return computeTaskStatusGroupsFromRun(run.tasks);
		}

		if (executionState !== "idle" && executionPlan) {
			return deriveTodoGroupsFromPlan(executionPlan);
		}

		return EMPTY_TASK_STATUS_GROUPS;
	}, [executionPlan, executionState, run]);
	const taskExecutions = useMemo(() => {
		let baseExecutions: TaskExecution[] = [];
		if (run) {
			baseExecutions = deriveTaskExecutionsFromRun(run);
		}

		return mergeStreamedExecutions(baseExecutions, streamedExecutionsByTaskId);
	}, [run, streamedExecutionsByTaskId]);

	const isExecuting = executionState === "executing";
	const isExecutionActive = executionState !== "idle";

	return {
		isExecuting,
		isExecutionActive,
		executionState,
		runId,
		runStatus: run?.status ?? null,
		runCreatedAt: run?.createdAt ?? null,
		runCompletedAt: run?.completedAt ?? null,
		taskExecutions,
		taskStatusGroups,
		executionPlan,
		run,
		error,
		startExecution,
		sendDirective,
	};
}
