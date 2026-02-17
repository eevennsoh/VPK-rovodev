"use client";

import { useState, useCallback, useRef } from "react";
import type { Spec } from "@json-render/react";
import ArrowUpIcon from "@atlaskit/icon/core/arrow-up";
import {
	AudioPlayer,
	AudioPlayerControlBar,
	AudioPlayerDurationDisplay,
	AudioPlayerElement,
	AudioPlayerPlayButton,
	AudioPlayerTimeDisplay,
	AudioPlayerTimeRange,
} from "@/components/ui-ai/audio-player";
import {
	PromptInput,
	PromptInputBody,
	PromptInputSubmit,
	PromptInputTextarea,
} from "@/components/ui-ai/prompt-input";
import { SpeechInput } from "@/components/ui-ai/speech-input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import type { AgentRun, AgentRunSummary, AgentRunVisualSummary, AgentRunGenuiSummary } from "@/lib/agents-team-run-types";
import { token } from "@/lib/tokens";
import { AgentSummarySidebar } from "./components/agent-summary-sidebar";
import SummaryTitleRow from "./components/summary-title-row";

const MOCK_RUN_ID = "run_demo_agent_summary";
const MOCK_CREATED_AT = "2026-02-17T15:18:00.000Z";
const MOCK_COMPLETED_AT = "2026-02-17T15:24:00.000Z";
const SAMPLE_AUDIO =
	"https://interactive-examples.mdn.mozilla.net/media/cc0-audio/t-rex-roar.mp3";

const MOCK_MARKDOWN_SUMMARY = `## Executive summary
The agent team completed the scoped release preparation plan for the summary experience with no blocking issues.

## Key outcomes
- Implemented a run summary page with final synthesis, interactive summary, and visual summary sections.
- Added graceful loading states and polling while summary artifacts are generated.
- Preserved task-by-agent output visibility for auditability.

## Open risks and decisions
- Visual summary generation depends on HTML synthesis quality from the presenter model.
- Interactive summary generation fails safely when no renderable spec is returned.

## Recommended next actions
1. Add screenshot regression checks for the summary view.
2. Add persisted summary versioning to compare run revisions.
3. Track summary generation latency and fallback frequency.`;

const MOCK_VISUAL_SUMMARY_HTML = "";

const MOCK_GENUI_SPEC: Spec = {
	root: "root",
	state: {
		outcomes: [
			{
				name: "Completed tasks",
				value: "5/5",
				detail: "All planned execution steps finished",
			},
			{
				name: "Agent handoffs",
				value: "3",
				detail: "Cross-agent dependency transitions",
			},
			{
				name: "Failed tasks",
				value: "0",
				detail: "No blocked or failed executions",
			},
		],
		nextActions: [
			{
				owner: "QA",
				action: "Add visual snapshot regression suite for summary iframe content",
				priority: "High",
			},
			{
				owner: "Platform",
				action: "Track summary synthesis latency and fallback rates",
				priority: "Medium",
			},
			{
				owner: "Frontend",
				action: "Add export-to-markdown action in run summary header",
				priority: "Medium",
			},
		],
	},
	elements: {
		root: {
			type: "Stack",
			props: { direction: "vertical", gap: "md" },
			children: ["title", "metrics", "actions"],
		},
		title: {
			type: "PageHeader",
			props: {
				title: "Interactive summary dashboard",
				description: "Execution outcomes and follow-up actions for this run.",
			},
		},
		metrics: {
			type: "Grid",
			props: { columns: "3", gap: "md" },
			children: ["metricCompleted", "metricHandoffs", "metricFailures"],
		},
		metricCompleted: {
			type: "Metric",
			props: {
				label: "Completed tasks",
				value: "5/5",
				detail: "All tasks",
				trend: "up",
			},
		},
		metricHandoffs: {
			type: "Metric",
			props: {
				label: "Agent handoffs",
				value: "3",
				detail: "Dependency transitions",
				trend: "up",
			},
		},
		metricFailures: {
			type: "Metric",
			props: {
				label: "Failed tasks",
				value: "0",
				detail: "No failures",
				trend: "up",
			},
		},
		actions: {
			type: "Card",
			props: {
				title: "Recommended next actions",
			},
			children: ["actionsTable"],
		},
		actionsTable: {
			type: "Table",
			props: {
				data: {
					$state: "/nextActions",
				} as unknown as Array<Record<string, unknown>>,
				columns: [
					{ key: "owner", label: "Owner" },
					{ key: "action", label: "Action" },
					{ key: "priority", label: "Priority" },
				],
			},
		},
	},
};

const MOCK_SUMMARY: AgentRunSummary = {
	content: MOCK_MARKDOWN_SUMMARY,
	partial: false,
	createdAt: MOCK_COMPLETED_AT,
};

const MOCK_VISUAL_SUMMARY: AgentRunVisualSummary = {
	html: MOCK_VISUAL_SUMMARY_HTML,
	partial: false,
	createdAt: MOCK_COMPLETED_AT,
	agentName: "Visual Presenter",
	status: "ready",
};

const MOCK_GENUI_SUMMARY: AgentRunGenuiSummary = {
	spec: MOCK_GENUI_SPEC,
	partial: false,
	createdAt: MOCK_COMPLETED_AT,
	status: "ready",
};

const MOCK_RUN: AgentRun = {
	runId: MOCK_RUN_ID,
	status: "completed",
	error: null,
	createdAt: MOCK_CREATED_AT,
	updatedAt: MOCK_COMPLETED_AT,
	completedAt: MOCK_COMPLETED_AT,
	plan: {
		title: "Ship agents-team summary experience",
		description: "Synthesize multi-agent output into final markdown, interactive spec, and visual HTML.",
		emoji: "🧠",
		agents: ["Planner", "Frontend Engineer", "QA Engineer", "Visual Presenter"],
		tasks: [
			{ id: "T1", label: "Audit existing summary flow", agent: "Planner", blockedBy: [] },
			{
				id: "T2",
				label: "Implement summary page layout",
				agent: "Frontend Engineer",
				blockedBy: ["T1"],
			},
			{
				id: "T3",
				label: "Wire visual summary iframe",
				agent: "Frontend Engineer",
				blockedBy: ["T2"],
			},
			{
				id: "T4",
				label: "Validate fallback states and polling UX",
				agent: "QA Engineer",
				blockedBy: ["T2", "T3"],
			},
			{
				id: "T5",
				label: "Generate presentation-ready visual report",
				agent: "Visual Presenter",
				blockedBy: ["T4"],
			},
		],
	},
	tasks: [
		{
			id: "T1",
			label: "Audit existing summary flow",
			agentName: "Planner",
			agentId: "agent_planner",
			blockedBy: [],
			status: "done",
			attempts: 1,
			startedAt: "2026-02-17T15:18:00.000Z",
			completedAt: "2026-02-17T15:19:10.000Z",
			error: null,
			output: "Mapped routing, polling lifecycle, and artifact rendering boundaries for the run summary page.",
			outputSummary: "Mapped run summary architecture.",
		},
		{
			id: "T2",
			label: "Implement summary page layout",
			agentName: "Frontend Engineer",
			agentId: "agent_frontend",
			blockedBy: ["T1"],
			status: "done",
			attempts: 1,
			startedAt: "2026-02-17T15:19:15.000Z",
			completedAt: "2026-02-17T15:21:05.000Z",
			error: null,
			output: "Added top-level run header, final synthesis card, and grouped task output panels.",
			outputSummary: "Implemented page shell and output panels.",
		},
		{
			id: "T3",
			label: "Wire visual summary iframe",
			agentName: "Frontend Engineer",
			agentId: "agent_frontend",
			blockedBy: ["T2"],
			status: "done",
			attempts: 1,
			startedAt: "2026-02-17T15:21:05.000Z",
			completedAt: "2026-02-17T15:22:00.000Z",
			error: null,
			output: "Embedded presenter-generated HTML with iframe `srcDoc` and isolated sandbox rendering.",
			outputSummary: "Integrated visual summary iframe.",
		},
		{
			id: "T4",
			label: "Validate fallback states and polling UX",
			agentName: "QA Engineer",
			agentId: "agent_qa",
			blockedBy: ["T2", "T3"],
			status: "done",
			attempts: 1,
			startedAt: "2026-02-17T15:22:05.000Z",
			completedAt: "2026-02-17T15:23:20.000Z",
			error: null,
			output: "Verified loading placeholders, timeout messaging, and manual refresh for delayed summaries.",
			outputSummary: "Validated summary generation states.",
		},
		{
			id: "T5",
			label: "Generate presentation-ready visual report",
			agentName: "Visual Presenter",
			agentId: "agent_visual",
			blockedBy: ["T4"],
			status: "done",
			attempts: 1,
			startedAt: "2026-02-17T15:23:20.000Z",
			completedAt: "2026-02-17T15:24:00.000Z",
			error: null,
			output: "Produced a polished HTML summary with outcomes, highlights, and next-action guidance.",
			outputSummary: "Generated visual summary document.",
		},
	],
	agents: [
		{
			agentId: "agent_planner",
			agentName: "Planner",
			status: "idle",
			currentTaskId: null,
			currentTaskLabel: null,
			latestContent: "Analysis complete.",
			updatedAt: MOCK_COMPLETED_AT,
		},
		{
			agentId: "agent_frontend",
			agentName: "Frontend Engineer",
			status: "idle",
			currentTaskId: null,
			currentTaskLabel: null,
			latestContent: "Summary layout shipped.",
			updatedAt: MOCK_COMPLETED_AT,
		},
		{
			agentId: "agent_qa",
			agentName: "QA Engineer",
			status: "idle",
			currentTaskId: null,
			currentTaskLabel: null,
			latestContent: "Validation passed.",
			updatedAt: MOCK_COMPLETED_AT,
		},
		{
			agentId: "agent_visual",
			agentName: "Visual Presenter",
			status: "idle",
			currentTaskId: null,
			currentTaskLabel: null,
			latestContent: "Visual summary delivered.",
			updatedAt: MOCK_COMPLETED_AT,
		},
	],
	directives: [],
	summary: MOCK_SUMMARY,
	visualSummary: MOCK_VISUAL_SUMMARY,
	genuiSummary: MOCK_GENUI_SUMMARY,
	userPrompt: "Build and present a complete summary page for the latest agents-team run.",
	customInstruction: "Prioritize clarity, fallback safety, and presentable output.",
	conversationContext: [
		{
			type: "user",
			content: "Generate a final synthesis with interactive and visual outputs.",
		},
		{
			type: "assistant",
			content: "Plan accepted. Executing and preparing summary artifacts.",
		},
	],
	iteration: 1,
	artifacts: [],
	activeBatchId: null,
};

function formatMetadataTimestamp(value: string | null): string {
	if (!value) return "-";
	const parsedDate = new Date(value);
	if (Number.isNaN(parsedDate.valueOf())) return value;

	return new Intl.DateTimeFormat(undefined, {
		dateStyle: "medium",
		timeStyle: "short",
	}).format(parsedDate);
}

function AgentSummaryMainContent() {
	return (
		<div className="flex flex-col gap-6">
			<div className="flex flex-col items-center gap-3 text-center">
				<div>
					<h1 style={{ font: token("font.heading.medium") }} className="text-text">
						{MOCK_RUN.plan.title}
					</h1>
						<div className="mt-3 w-full max-w-[520px]">
							<AudioPlayer>
								<AudioPlayerElement src={SAMPLE_AUDIO} />
								<AudioPlayerControlBar>
								<AudioPlayerPlayButton />
								<AudioPlayerTimeDisplay />
								<AudioPlayerTimeRange />
								<AudioPlayerDurationDisplay />
							</AudioPlayerControlBar>
						</AudioPlayer>
					</div>
					<p className="mt-2 text-sm text-text-subtle">
						{formatMetadataTimestamp(MOCK_RUN.createdAt)}
					</p>
				</div>
			</div>

			<section className="overflow-hidden rounded-xl border border-border bg-surface-raised">
				<div className="h-[620px] w-full bg-bg-neutral" />
			</section>
		</div>
	);
}

export default function AgentSummaryBlock() {
	const [isOpen, setIsOpen] = useState(true);
	const [isHovered, setIsHovered] = useState(false);
	const hoverTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

	return (
		<SidebarProvider
			open={isOpen || isHovered}
			onOpenChange={setIsOpen}
			style={
				{
					"--sidebar-width": "320px",
				} as React.CSSProperties
			}
			className={cn("[&_[data-slot=sidebar-gap]]:ease-[var(--ease-in-out)] [&_[data-slot=sidebar-container]]:ease-[var(--ease-in-out)]", !isOpen && isHovered && "[&_[data-slot=sidebar-gap]]:w-0!")}
		>
			<AgentSummarySidebar isOverlay={!isOpen && isHovered} onPinSidebar={handlePinSidebar} onMouseEnter={handleHoverEnter} onMouseLeave={handleHoverLeave} />
			<SidebarInset className="h-svh overflow-hidden">
				<div className="flex h-full min-h-0 flex-col">
						<SummaryTitleRow
							title="A longer name name name name name"
							subtitle="URL of this summary"
							onNewChat={() => {}}
							sidebarOpen={isOpen}
							sidebarHovered={isHovered}
						onExpandSidebar={() => setIsOpen(true)}
						onHoverEnter={handleHoverEnter}
						onHoverLeave={handleHoverLeave}
					/>
						<main className="relative min-h-0 flex-1 overflow-y-auto bg-surface">
							<div className="mx-auto flex w-full max-w-[860px] flex-col gap-5 px-3 pb-28 pt-6 md:px-4">
								<div className="flex justify-center">
									<Tabs defaultValue="summary">
										<TabsList>
											<TabsTrigger value="chat">Chat</TabsTrigger>
											<TabsTrigger value="summary">Summary</TabsTrigger>
											<TabsTrigger value="files">Files</TabsTrigger>
										</TabsList>
									</Tabs>
								</div>

								<AgentSummaryMainContent />
							</div>

						<div className="sticky bottom-0 z-20 flex justify-center px-4 pb-4 pt-6">
							<PromptInput
								variant="floating"
								onSubmit={() => {}}
								className="max-w-[800px]"
							>
								<PromptInputBody className="flex w-full items-center justify-between gap-2">
									<PromptInputTextarea
										placeholder="Ask, @mention, or / for actions"
										rows={1}
										className="min-h-0 flex-1 py-0"
									/>
									<div className="flex shrink-0 items-center gap-1">
										<SpeechInput aria-label="Voice" variant="ghost" />
										<PromptInputSubmit aria-label="Submit" disabled>
											<ArrowUpIcon label="" />
										</PromptInputSubmit>
									</div>
								</PromptInputBody>
							</PromptInput>
						</div>
					</main>
				</div>
			</SidebarInset>
		</SidebarProvider>
	);
}
