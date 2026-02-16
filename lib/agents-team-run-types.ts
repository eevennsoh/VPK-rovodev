import type { AgentExecutionUpdate } from "@/lib/rovo-ui-messages";

export type AgentRunStatus = "running" | "completed" | "failed";

export type AgentRunTaskStatus =
	| "todo"
	| "in-progress"
	| "done"
	| "failed"
	| "blocked-failed";

export interface AgentRunPlanTask {
	id: string;
	label: string;
	agent: string;
	blockedBy: string[];
}

export interface AgentRunPlan {
	title: string;
	description?: string;
	emoji?: string;
	agents: string[];
	tasks: AgentRunPlanTask[];
}

export interface AgentRunTask {
	id: string;
	label: string;
	agentName: string;
	agentId: string;
	blockedBy: string[];
	status: AgentRunTaskStatus;
	attempts: number;
	startedAt: string | null;
	completedAt: string | null;
	error: string | null;
	output: string | null;
	outputSummary: string | null;
}

export interface AgentRunAgent {
	agentId: string;
	agentName: string;
	status: "idle" | "working" | "failed";
	currentTaskId: string | null;
	currentTaskLabel: string | null;
	latestContent: string;
	updatedAt: string;
}

export interface AgentRunDirective {
	id: string;
	agentId: string;
	agentName: string;
	message: string;
	createdAt: string;
}

export interface AgentRunSummary {
	content: string;
	partial: boolean;
	createdAt: string;
}

export interface AgentRun {
	runId: string;
	status: AgentRunStatus;
	error: string | null;
	createdAt: string;
	updatedAt: string;
	completedAt: string | null;
	plan: AgentRunPlan;
	tasks: AgentRunTask[];
	agents: AgentRunAgent[];
	directives: AgentRunDirective[];
	summary: AgentRunSummary | null;
	userPrompt: string;
	customInstruction?: string;
	conversationContext: Array<{ type: "user" | "assistant"; content: string }>;
}

export type AgentRunStreamEvent =
	| {
			type: "snapshot";
			timestamp: string;
			run: AgentRun;
	  }
	| {
			type:
				| "run.started"
				| "task.claimed"
				| "task.completed"
				| "task.failed"
				| "task.blocked"
				| "task.retrying"
				| "directive.recorded"
				| "run.completed"
				| "run.summary-ready"
				| "run.failed";
			timestamp: string;
			run: AgentRun;
			taskId?: string;
			error?: string;
			attempt?: number;
			directive?: AgentRunDirective;
			update?: AgentExecutionUpdate | null;
	  }
	| {
			type: "agent.update";
			timestamp: string;
			runId: string;
			update: AgentExecutionUpdate;
	  };

export function isAgentRunStreamEvent(value: unknown): value is AgentRunStreamEvent {
	if (!value || typeof value !== "object") {
		return false;
	}

	const type = (value as { type?: unknown }).type;
	return typeof type === "string";
}
