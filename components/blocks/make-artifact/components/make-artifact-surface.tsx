"use client";

import { useMemo, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Icon } from "@/components/ui/icon";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { token } from "@/lib/tokens";
import { useTheme } from "@/components/utils/theme-wrapper";
import type { AgentRun } from "@/lib/make-run-types";
import type { ParsedPlanWidgetPayload } from "@/components/templates/shared/lib/plan-widget";
import {
	derivePlanEmojiFromTitle,
	resolvePlanDisplayTitle,
} from "@/components/templates/shared/lib/plan-identity";
import EyeOpenIcon from "@atlaskit/icon/core/eye-open";
import ClipboardIcon from "@atlaskit/icon/core/clipboard";
import PaintPaletteIcon from "@atlaskit/icon/core/paint-palette";
import AiChatIcon from "@atlaskit/icon/core/ai-chat";
import TerminalSwitchPanel from "@/components/blocks/terminal-switch/page";
import { MessageResponse } from "@/components/ui-ai/message";
import { GUI } from "@/components/utils/gui";
import { JsonRenderView } from "@/lib/json-render/renderer";

type ArtifactRightPanelMode = "design" | "chat";
type ArtifactLeftPanelMode = "preview" | "plan";

interface DisplayPlanTask {
	id: string;
	label: string;
	agentName: string | null;
	blockedBy: string[];
}

interface DisplayPlan {
	source: "run" | "chat-draft";
	resolvedTitle: string;
	resolvedEmoji: string;
	description?: string;
	agents: string[];
	tasks: DisplayPlanTask[];
}

interface MakeArtifactSurfaceProps {
	run: AgentRun | null;
	fallbackPlan?: ParsedPlanWidgetPayload | null;
	isRunLoading?: boolean;
	className?: string;
}

function hasRenderableSpec(spec: unknown): spec is { root: string; elements: Record<string, unknown> } {
	if (!spec || typeof spec !== "object" || Array.isArray(spec)) {
		return false;
	}

	const root = (spec as { root?: unknown }).root;
	const elements = (spec as { elements?: unknown }).elements;
	return (
		typeof root === "string" &&
		root.trim().length > 0 &&
		typeof elements === "object" &&
		elements !== null &&
		!Array.isArray(elements) &&
		Object.keys(elements).length > 0
	);
}

function normalizeSummaryMarkdown(value: string): string {
	const trimmed = value.trim();
	if (!trimmed) {
		return "";
	}

	const preMatch = trimmed.match(/^<pre(?:\s[^>]*)?>([\s\S]*?)<\/pre>$/i);
	const preUnwrapped = (preMatch?.[1] ?? trimmed).trim();
	const codeMatch = preUnwrapped.match(/^<code(?:\s[^>]*)?>([\s\S]*?)<\/code>$/i);

	return (codeMatch?.[1] ?? preUnwrapped).trim();
}

function ContentTabBar({
	leftMode,
	onLeftModeChange,
	panelMode,
	onPanelModeChange,
}: Readonly<{
	leftMode: ArtifactLeftPanelMode;
	onLeftModeChange: (nextMode: ArtifactLeftPanelMode) => void;
	panelMode: ArtifactRightPanelMode;
	onPanelModeChange: (nextMode: ArtifactRightPanelMode) => void;
}>) {
	return (
		<div className="flex items-start justify-between">
			<ToggleGroup
				value={[leftMode]}
				onValueChange={(newValue: string[]) => {
					if (newValue.length > 0) {
						onLeftModeChange(newValue[0] as ArtifactLeftPanelMode);
					}
				}}
				variant="outline"
				spacing={0}
			>
				<ToggleGroupItem value="preview">
					<Icon render={<EyeOpenIcon label="" />} label="Preview" />
					Preview
				</ToggleGroupItem>
				<ToggleGroupItem value="plan">
					<Icon render={<ClipboardIcon label="" />} label="Plan" />
					Plan
				</ToggleGroupItem>
			</ToggleGroup>

			<ToggleGroup
				value={[panelMode]}
				onValueChange={(newValue: string[]) => {
					if (newValue.length > 0) {
						onPanelModeChange(newValue[0] as ArtifactRightPanelMode);
					}
				}}
				variant="outline"
				spacing={0}
			>
				<ToggleGroupItem value="design">
					<Icon render={<PaintPaletteIcon label="" />} label="Design" />
					Design
				</ToggleGroupItem>
				<ToggleGroupItem value="chat">
					<Icon render={<AiChatIcon label="" />} label="Chat" />
					Chat
				</ToggleGroupItem>
			</ToggleGroup>
		</div>
	);
}

function DesignPanel() {
	const [canvasScale, setCanvasScale] = useState(82);
	const [cornerRadius, setCornerRadius] = useState(18);
	const [motionEnabled, setMotionEnabled] = useState(true);
	const [palette, setPalette] = useState<"info" | "success">("info");
	return (
		<div className="flex h-full min-h-0 flex-col overflow-hidden rounded-xl border border-border bg-surface">
			<div className="flex h-11 items-center border-border border-b px-4">
				<span style={{ font: token("font.heading.xsmall") }} className="text-text">
					Design
				</span>
			</div>
			<div className="min-h-0 flex-1 overflow-auto p-4">
				<GUI.Panel
					title="GUI controls"
					values={{ canvasScale, cornerRadius, motionEnabled, palette }}
				>
					<GUI.Control
						id="make-artifact-canvas-scale"
						label="Canvas scale"
						description="Controls the preview block size."
						value={canvasScale}
						defaultValue={82}
						min={55}
						max={100}
						step={1}
						unit="%"
						onChange={setCanvasScale}
					/>
					<GUI.Control
						id="make-artifact-corner-radius"
						label="Corner radius"
						description="Adjusts the preview corner radius."
						value={cornerRadius}
						defaultValue={18}
						min={0}
						max={32}
						step={1}
						unit="px"
						onChange={setCornerRadius}
					/>
					<GUI.Toggle
						id="make-artifact-motion"
						label="Motion"
						description="Adds elevation and slight lift to the preview."
						checked={motionEnabled}
						onChange={setMotionEnabled}
					/>
					<GUI.Select
						id="make-artifact-palette"
						label="Palette"
						description="Switches between two semantic palettes."
						value={palette}
						options={[
							{ value: "info", label: "Info" },
							{ value: "success", label: "Success" },
						]}
						onChange={setPalette}
					/>
				</GUI.Panel>
			</div>
		</div>
	);
}

function LoadingPanel({
	title,
}: Readonly<{
	title: string;
}>) {
	return (
		<div className="flex h-full w-full flex-col items-center justify-center gap-3 rounded-xl border border-border bg-surface p-6 text-center">
			<div className="size-5 animate-spin rounded-full border border-border border-t-text-subtle" />
			<p className="text-sm text-text-subtle">{title}</p>
		</div>
	);
}

function EmptyPanel({
	title,
	description,
}: Readonly<{
	title: string;
	description: string;
}>) {
	return (
		<div className="flex h-full w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-surface p-6 text-center">
			<p style={{ font: token("font.heading.xsmall") }} className="text-text">
				{title}
			</p>
			<p className="max-w-md text-sm text-text-subtle">{description}</p>
		</div>
	);
}

function GeneratingPanel() {
	const { actualTheme } = useTheme();
	const loadingAnimationSrc =
		actualTheme === "dark"
			? "/loading/rovo-create-dark.gif"
			: "/loading/rovo-create-light.gif";

	return (
		<div className="flex h-full w-full flex-col items-center justify-center gap-3 rounded-xl border border-border bg-surface p-6 text-center">
			<Image
				alt=""
				className="h-28 w-auto"
				height={280}
				src={loadingAnimationSrc}
				unoptimized
				width={442}
			/>
			<p className="text-sm text-text-subtle">Generating output&hellip;</p>
		</div>
	);
}

function PreviewOutputPanel({
	isRunLoading,
	run,
	hasDraftPlan,
}: Readonly<{
	isRunLoading: boolean;
	run: AgentRun | null;
	hasDraftPlan: boolean;
}>) {
	if (isRunLoading) {
		return <LoadingPanel title="Loading GenUI output..." />;
	}

	if (run) {
		const genuiSummary = run.genuiSummary;
		const primaryWidget = Array.isArray(genuiSummary?.widgets)
			? genuiSummary.widgets.find(
					(widget) =>
						widget?.status === "ready" &&
						hasRenderableSpec(widget.spec)
				)
			: null;
		const fallbackSpec =
			primaryWidget === null && hasRenderableSpec(genuiSummary?.spec)
				? genuiSummary.spec
				: null;
		const renderableSpec = primaryWidget?.spec ?? fallbackSpec ?? null;
		if (renderableSpec) {
			return (
				<div className="flex h-full w-full flex-col overflow-hidden rounded-xl border border-border bg-surface">
					<div className="border-b border-border px-4 py-3">
						<p style={{ font: token("font.heading.xsmall") }} className="text-text">
							{primaryWidget?.title || "Primary GenUI output"}
						</p>
					</div>
					<div className="min-h-0 flex-1 overflow-auto p-3">
						<JsonRenderView spec={renderableSpec} />
					</div>
				</div>
			);
		}

		if (run.status === "running") {
			return <GeneratingPanel />;
		}

		return (
			<EmptyPanel
				title="No GenUI output yet"
				description="This run does not have a renderable GenUI output yet."
			/>
		);
	}

	if (hasDraftPlan) {
		return (
			<EmptyPanel
				title="No GenUI output yet"
				description="A draft plan was found in chat history, but no saved make run output exists yet."
			/>
		);
	}

	return (
		<EmptyPanel
			title="No saved output"
			description="Start a make run to persist one plan and one output."
		/>
	);
}

function PlanPanel({
	isRunLoading,
	plan,
	summaryContent,
}: Readonly<{
	isRunLoading: boolean;
	plan: DisplayPlan | null;
	summaryContent: string;
}>) {
	if (isRunLoading) {
		return <LoadingPanel title="Loading plan..." />;
	}

	const normalizedSummaryContent = normalizeSummaryMarkdown(summaryContent);
	if (!plan && normalizedSummaryContent.length === 0) {
		return (
			<EmptyPanel
				title="No saved plan"
				description="No plan was found in saved runs or chat threads."
			/>
		);
	}

	return (
		<div className="flex h-full w-full flex-col overflow-hidden rounded-xl border border-border bg-surface">
			<Tabs defaultValue="summary" className="flex min-h-0 flex-1 flex-col !gap-0">
				<div className="pt-3">
					<TabsList variant="line" className="w-full justify-start px-4">
						<TabsTrigger value="summary" className="flex-initial">Summary</TabsTrigger>
						<TabsTrigger value="tasks" className="flex-initial">Tasks ({plan?.tasks.length ?? 0})</TabsTrigger>
					</TabsList>
				</div>
				<TabsContent value="summary" className="min-h-0 flex-1 overflow-auto px-4 py-4">
					{normalizedSummaryContent.length > 0 ? (
						<MessageResponse className="text-sm leading-6 text-text">
							{normalizedSummaryContent}
						</MessageResponse>
					) : (
						<p className="text-sm text-text-subtle">No markdown output yet.</p>
					)}
				</TabsContent>
				<TabsContent value="tasks" className="min-h-0 flex-1 overflow-auto px-4 py-4">
					{plan ? (
						<ol className="flex flex-col gap-0">
							{plan.tasks.map((task, index) => {
								const blockedByText = task.blockedBy.length > 0
									? `Blocked by ${task.blockedBy.map((id) => `#${id}`).join(", ")}`
									: undefined;
								return (
									<li
										key={task.id}
										className="flex min-h-8 shrink-0 items-center gap-4 rounded-lg bg-surface px-2 py-1.5"
									>
										<span className="inline-flex size-5 shrink-0 items-center justify-center rounded-[4px] border border-border bg-surface text-sm leading-5 font-medium text-text">
											{index + 1}
										</span>
										<div className="flex min-w-0 flex-1 flex-col gap-0.5">
											<span className="text-sm leading-5 text-text">{task.label}</span>
											{blockedByText ? (
												<span className="text-xs leading-4 text-text-subtlest">{blockedByText}</span>
											) : null}
										</div>
									</li>
								);
							})}
						</ol>
					) : (
						<p className="text-sm text-text-subtle">No plan available.</p>
					)}
				</TabsContent>
			</Tabs>
		</div>
	);
}

function TwoPanelLayout({
	leftMode,
	panelMode,
	isRunLoading,
	plan,
	run,
	hasDraftPlan,
	summaryContent,
}: Readonly<{
	leftMode: ArtifactLeftPanelMode;
	panelMode: ArtifactRightPanelMode;
	isRunLoading: boolean;
	plan: DisplayPlan | null;
	run: AgentRun | null;
	hasDraftPlan: boolean;
	summaryContent: string;
}>) {
	const rightPanel =
		panelMode === "chat"
			? <TerminalSwitchPanel />
			: <DesignPanel />;

	return (
		<div className="flex min-h-0 flex-1 gap-4">
			<div className="min-h-0 w-[62%] shrink-0">
				{leftMode === "plan" ? (
					<PlanPanel
						isRunLoading={isRunLoading}
						plan={plan}
						summaryContent={summaryContent}
					/>
				) : (
					<PreviewOutputPanel
						isRunLoading={isRunLoading}
						run={run}
						hasDraftPlan={hasDraftPlan}
					/>
				)}
			</div>
			<div className="min-w-0 flex-1">
				{rightPanel}
			</div>
		</div>
	);
}

export function MakeArtifactSurface({
	run,
	fallbackPlan = null,
	isRunLoading = false,
	className,
}: Readonly<MakeArtifactSurfaceProps>) {
	const [panelMode, setPanelMode] = useState<ArtifactRightPanelMode>("chat");
	const [leftMode, setLeftMode] = useState<ArtifactLeftPanelMode>("preview");

	const previewSummaryContent = useMemo(() => {
		const runSummaryContent = run?.summary?.content;
		if (typeof runSummaryContent !== "string") {
			return "";
		}
		return runSummaryContent.trim();
	}, [run]);

	const displayPlan = useMemo<DisplayPlan | null>(() => {
		if (run) {
			const resolvedTitle = resolvePlanDisplayTitle(
				run.plan.title,
				run.plan.tasks,
			);
			const resolvedEmoji = run.plan.emoji ?? derivePlanEmojiFromTitle(resolvedTitle);
			return {
				source: "run",
				resolvedTitle,
				resolvedEmoji,
				description: run.plan.description,
				agents: run.plan.agents,
				tasks: run.plan.tasks.map((task) => ({
					id: task.id,
					label: task.label,
					agentName: task.agent,
					blockedBy: task.blockedBy,
				})),
			};
		}

		if (fallbackPlan) {
			const resolvedTitle = resolvePlanDisplayTitle(fallbackPlan.title, fallbackPlan.tasks);
			const resolvedEmoji = fallbackPlan.emoji ?? derivePlanEmojiFromTitle(resolvedTitle);
			return {
				source: "chat-draft",
				resolvedTitle,
				resolvedEmoji,
				description: fallbackPlan.description,
				agents: fallbackPlan.agents,
				tasks: fallbackPlan.tasks.map((task) => ({
					id: task.id,
					label: task.label,
					agentName: task.agent ?? null,
					blockedBy: task.blockedBy,
				})),
			};
		}

		return null;
	}, [fallbackPlan, run]);

	return (
		<div className={cn("flex h-full min-h-0 flex-col gap-4 bg-surface p-4", className)}>
			<ContentTabBar
				leftMode={leftMode}
				onLeftModeChange={setLeftMode}
				panelMode={panelMode}
				onPanelModeChange={setPanelMode}
			/>
			<TwoPanelLayout
				leftMode={leftMode}
				panelMode={panelMode}
				isRunLoading={isRunLoading}
				plan={displayPlan}
				run={run}
				hasDraftPlan={run === null && fallbackPlan !== null}
				summaryContent={previewSummaryContent}
			/>
		</div>
	);
}
