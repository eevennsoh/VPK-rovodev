"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ChevronDownIcon from "@atlaskit/icon/core/chevron-down";
import ChevronUpIcon from "@atlaskit/icon/core/chevron-up";
import LinkExternalIcon from "@atlaskit/icon/core/link-external";
import {
	AudioPlayer,
	AudioPlayerControlBar,
	AudioPlayerDurationDisplay,
	AudioPlayerElement,
	AudioPlayerPlayButton,
	AudioPlayerTimeDisplay,
	AudioPlayerTimeRange,
} from "@/components/ui-ai/audio-player";
import { Spinner } from "@/components/ui/spinner";
import type {
	AgentRun,
	AgentRunSummary,
	AgentRunVisualSummary,
	AgentRunGenuiSummary,
	AgentRunGenuiWidget,
} from "@/lib/maker-run-types";
import {
	derivePlanEmojiFromTitle,
	resolvePlanDisplayTitle,
} from "@/components/templates/shared/lib/plan-identity";
import { JsonRenderView } from "@/lib/json-render/renderer";

const POLL_INTERVAL_MS = 2000;
const MAX_POLL_DURATION_MS = 60000;
const WIDGET_SLOT_COUNT = 4;

type WidgetSlotStatus = "ready" | "failed" | "pending";

interface ResolvedWidgetSlot {
	id: string;
	title: string;
	spec: AgentRunGenuiWidget["spec"] | null;
	status: WidgetSlotStatus;
	error?: string;
}

interface RunSummaryResponse {
	run?: AgentRun;
	summary?: AgentRunSummary | null;
	visualSummary?: AgentRunVisualSummary | null;
	genuiSummary?: AgentRunGenuiSummary | null;
	error?: string;
}

interface RunSummarySectionProps {
	runId: string;
	initialRun: AgentRun;
	initialSummary: AgentRunSummary | null;
	initialVisualSummary: AgentRunVisualSummary | null;
	initialGenuiSummary: AgentRunGenuiSummary | null;
	audioSummaryUrl?: string | null;
	collapsible?: boolean;
	defaultCollapsed?: boolean;
}

function formatDateTime(value: string | null): string {
	if (!value) {
		return "-";
	}

	const parsedDate = new Date(value);
	if (Number.isNaN(parsedDate.valueOf())) {
		return value;
	}

	return new Intl.DateTimeFormat(undefined, {
		dateStyle: "medium",
		timeStyle: "short",
	}).format(parsedDate);
}

function parseSummaryErrorMessage(payload: unknown): string {
	if (!payload || typeof payload !== "object") {
		return "Failed to load run summary.";
	}

	const record = payload as { error?: unknown; details?: unknown };
	if (typeof record.error === "string" && record.error.trim()) {
		return record.error.trim();
	}
	if (typeof record.details === "string" && record.details.trim()) {
		return record.details.trim();
	}
	return "Failed to load run summary.";
}

function toErrorMessage(error: unknown): string {
	if (error instanceof Error && error.message.trim()) {
		return error.message.trim();
	}
	return "Failed to load run summary.";
}

function hasRenderableSpec(spec: AgentRunGenuiWidget["spec"] | null | undefined): boolean {
	if (!spec || typeof spec !== "object") {
		return false;
	}

	return (
		typeof spec.root === "string" &&
		spec.root.trim().length > 0 &&
		typeof spec.elements === "object" &&
		spec.elements !== null &&
		!Array.isArray(spec.elements) &&
		Object.keys(spec.elements).length > 0
	);
}

function createDefaultWidgetSlot(index: number): ResolvedWidgetSlot {
	return {
		id: `interactive-widget-${index + 1}`,
		title: `Interactive widget ${index + 1}`,
		spec: null,
		status: "pending",
	};
}

function resolveWidgetSlots(genuiSummary: AgentRunGenuiSummary | null): ResolvedWidgetSlot[] {
	const slots = Array.from({ length: WIDGET_SLOT_COUNT }, (_, index) =>
		createDefaultWidgetSlot(index)
	);

	if (!genuiSummary) {
		return slots;
	}

	const widgets = Array.isArray(genuiSummary.widgets)
		? genuiSummary.widgets.slice(0, WIDGET_SLOT_COUNT)
		: [];

	if (widgets.length > 0) {
		for (const [index, widget] of widgets.entries()) {
			const hasSpec = hasRenderableSpec(widget.spec);
			const nextStatus: WidgetSlotStatus =
				widget.status === "ready" && hasSpec
					? "ready"
					: widget.status === "failed" || !hasSpec
						? "failed"
						: "pending";

			slots[index] = {
				id: widget.id || slots[index].id,
				title: widget.title || slots[index].title,
				spec: hasSpec ? widget.spec : null,
				status: nextStatus,
				error:
					typeof widget.error === "string" && widget.error.trim()
						? widget.error.trim()
						: undefined,
			};
		}

		return slots;
	}

	const legacySpecCandidate = genuiSummary.spec;
	const legacySpec =
		legacySpecCandidate && hasRenderableSpec(legacySpecCandidate)
			? legacySpecCandidate
			: null;
	slots[0] = {
		id: "interactive-widget-1",
		title: "Interactive widget 1",
		spec: legacySpec,
		status:
			legacySpec && genuiSummary.status === "ready"
				? "ready"
				: genuiSummary.status === "failed"
					? "failed"
					: "pending",
		error:
			typeof genuiSummary.error === "string" && genuiSummary.error.trim()
				? genuiSummary.error.trim()
				: undefined,
	};

	return slots;
}

export function RunSummarySection({
	runId,
	initialRun,
	initialSummary,
	initialVisualSummary,
	initialGenuiSummary,
	audioSummaryUrl = null,
	collapsible = true,
	defaultCollapsed = true,
}: Readonly<RunSummarySectionProps>) {
	const [run, setRun] = useState<AgentRun>(initialRun);
	const [summary, setSummary] = useState<AgentRunSummary | null>(initialSummary);
	const [visualSummary, setVisualSummary] =
		useState<AgentRunVisualSummary | null>(initialVisualSummary);
	const [genuiSummary, setGenuiSummary] =
		useState<AgentRunGenuiSummary | null>(initialGenuiSummary);
	const [pollError, setPollError] = useState<string | null>(null);
	const [hasPollingTimedOut, setHasPollingTimedOut] = useState(false);
	const [pollAttemptKey, setPollAttemptKey] = useState(0);
	const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);
	const pollingStartedAtRef = useRef<number | null>(null);

	const fetchSummary = useCallback(async (): Promise<"pending" | "ready" | "error"> => {
		try {
			const response = await fetch(
				`/api/maker/runs/${encodeURIComponent(runId)}/summary`,
				{
					cache: "no-store",
				}
			);
			if (!response.ok) {
				const errorPayload = (await response.json().catch(() => ({}))) as unknown;
				setPollError(parseSummaryErrorMessage(errorPayload));
				return "error";
			}

			const payload = (await response.json()) as RunSummaryResponse;
			if (!payload.run) {
				setPollError(payload.error ?? "Run summary response was missing run data.");
				return "error";
			}

			setRun(payload.run);
			const nextSummary = payload.summary ?? null;
			const nextVisualSummary = payload.visualSummary ?? null;
			const nextGenuiSummary = payload.genuiSummary ?? null;
			setSummary(nextSummary);
			setVisualSummary(nextVisualSummary);
			setGenuiSummary(nextGenuiSummary);
			if (nextSummary && nextVisualSummary && nextGenuiSummary) {
				setPollError(null);
				setHasPollingTimedOut(false);
				return "ready";
			}

			return "pending";
		} catch (error) {
			setPollError(toErrorMessage(error));
			return "error";
		}
	}, [runId]);

	useEffect(() => {
		const shouldPoll =
			run.status !== "running" &&
			(summary === null || visualSummary === null || genuiSummary === null) &&
			!pollError &&
			!hasPollingTimedOut;
		if (!shouldPoll) {
			return;
		}

		let isCancelled = false;
		let timeoutId: ReturnType<typeof setTimeout> | null = null;
		if (pollingStartedAtRef.current === null) {
			pollingStartedAtRef.current = Date.now();
		}

		const poll = async () => {
			const elapsedMs = Date.now() - (pollingStartedAtRef.current ?? Date.now());
			if (elapsedMs >= MAX_POLL_DURATION_MS) {
				if (!isCancelled) {
					setHasPollingTimedOut(true);
				}
				return;
			}

			const result = await fetchSummary();
			if (isCancelled || result !== "pending") {
				return;
			}

			timeoutId = setTimeout(() => {
				void poll();
			}, POLL_INTERVAL_MS);
		};

		void poll();

		return () => {
			isCancelled = true;
			if (timeoutId) {
				clearTimeout(timeoutId);
			}
		};
	}, [
		fetchSummary,
		genuiSummary,
		hasPollingTimedOut,
		pollAttemptKey,
		pollError,
		run.status,
		summary,
		visualSummary,
	]);

	const restartPolling = useCallback(() => {
		pollingStartedAtRef.current = Date.now();
		setPollError(null);
		setHasPollingTimedOut(false);
		setPollAttemptKey((previous) => previous + 1);
	}, []);

	const isPolling =
		run.status !== "running" &&
		(summary === null || visualSummary === null || genuiSummary === null) &&
		!pollError &&
		!hasPollingTimedOut;
	const widgetSlots = useMemo(() => resolveWidgetSlots(genuiSummary), [genuiSummary]);
	const runDisplayTitle = useMemo(() => {
		const resolvedTitle = resolvePlanDisplayTitle(run.plan.title, run.plan.tasks);
		const resolvedEmoji = derivePlanEmojiFromTitle(resolvedTitle);
		return `${resolvedEmoji} ${resolvedTitle}`;
	}, [run.plan.tasks, run.plan.title]);

	return (
		<div className="flex flex-col gap-4">
			<section className="my-6 flex flex-col items-center gap-3 px-1 text-center">
				<h1 className="text-3xl font-semibold text-text">{runDisplayTitle}</h1>
				<div className="w-full max-w-[440px]">
					{audioSummaryUrl ? (
						<AudioPlayer>
							<AudioPlayerElement src={audioSummaryUrl} />
							<AudioPlayerControlBar>
								<AudioPlayerPlayButton />
								<AudioPlayerTimeDisplay />
								<AudioPlayerTimeRange />
								<AudioPlayerDurationDisplay />
							</AudioPlayerControlBar>
						</AudioPlayer>
					) : (
						<div className="rounded-xl border border-border bg-surface-raised px-4 py-3 text-sm text-text-subtle">
							Audio summary has not been generated yet.
						</div>
					)}
				</div>
				<p className="text-sm text-text-subtle">{formatDateTime(run.createdAt)}</p>
			</section>

			<section className="overflow-hidden rounded-xl border border-border bg-surface-raised">
				<div className="flex items-center justify-between">
					<button
						type="button"
						onClick={
							collapsible
								? () => setIsCollapsed((previous) => !previous)
								: undefined
						}
						className="flex h-12 w-full items-center justify-between px-4 text-left"
					>
						<span className="text-sm font-semibold text-text">Final synthesis</span>
						{collapsible ? (
							isCollapsed ? (
								<ChevronDownIcon label="Expand final synthesis" size="small" />
							) : (
								<ChevronUpIcon label="Collapse final synthesis" size="small" />
							)
						) : null}
					</button>
				</div>
				{!isCollapsed ? (
					<div className="border-t border-border px-4 py-4">
						<p className="text-xs text-text-subtlest">
							Generated {formatDateTime(summary?.createdAt ?? null)}
							{summary?.partial ? " · Partial completion" : ""}
						</p>
						<div className="mt-3 rounded-lg bg-surface-sunken p-4">
							{summary ? (
								<pre className="whitespace-pre-wrap text-sm text-text">{summary.content}</pre>
							) : (
								<div aria-live="polite" className="flex flex-col gap-3">
									<p className="text-sm text-text">
										Final synthesis is being generated in the background.
									</p>
									{isPolling ? (
										<p className="text-xs text-text-subtle">
											Checking for summary updates every 2 seconds.
										</p>
									) : null}
									{hasPollingTimedOut ? (
										<p className="text-xs text-text-subtle">
											Summary generation is taking longer than expected.
										</p>
									) : null}
									{pollError ? <p className="text-xs text-text-danger">{pollError}</p> : null}
									{hasPollingTimedOut || pollError ? (
										<div>
											<button
												type="button"
												onClick={restartPolling}
												className="inline-flex h-8 items-center rounded-md border border-border px-3 text-sm text-text hover:bg-bg-neutral-subtle-hovered"
											>
												Refresh summary
											</button>
										</div>
									) : null}
								</div>
							)}
						</div>
					</div>
				) : null}
			</section>

			<section className="grid grid-cols-1 gap-4 md:grid-cols-2">
				{widgetSlots.map((widgetSlot, index) => (
					<div
						key={`${widgetSlot.id}:${index}`}
						className="min-h-[220px] rounded-xl border border-border bg-surface-raised p-3"
					>
						{widgetSlot.status === "ready" && widgetSlot.spec ? (
							<div className="h-full overflow-auto">
								<JsonRenderView spec={widgetSlot.spec} />
							</div>
							) : widgetSlot.status === "failed" ? (
								<div className="flex h-full items-center">
									<p className="text-sm text-text-danger">
										{widgetSlot.error || "Failed to generate interactive widget."}
									</p>
								</div>
							) : (
								<div aria-live="polite" className="flex h-full items-center justify-center">
									<Spinner
										size="lg"
										className="text-text-subtle"
										label="Generating interactive widget"
									/>
								</div>
							)}
						</div>
					))}
				</section>

			<section className="rounded-xl border border-border bg-surface-raised p-5">
				<div className="flex items-center justify-between gap-3">
					<div>
						<h2 className="text-base font-semibold text-text">Generated webpage</h2>
						<p className="mt-1 text-xs text-text-subtlest">
							Generated {formatDateTime(visualSummary?.createdAt ?? null)}
							{visualSummary?.partial ? " · Partial completion" : ""}
						</p>
					</div>
					{visualSummary?.html ? (
						<button
							type="button"
							onClick={() => {
								const blob = new Blob([visualSummary.html], { type: "text/html" });
								window.open(URL.createObjectURL(blob), "_blank");
							}}
							className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border px-3 text-sm text-text hover:bg-bg-neutral-subtle-hovered"
						>
							<LinkExternalIcon label="" size="small" />
							Open full page
						</button>
					) : null}
				</div>
				{visualSummary ? (
					<div className="mt-4 flex flex-col gap-2">
						{visualSummary.status === "failed" ? (
							<p className="text-xs text-text-danger">
								Visual presenter fallback used: {visualSummary.error || "Failed to generate visual summary."}
							</p>
						) : null}
						<iframe
							title="Run visual summary preview"
							className="h-[620px] w-full rounded-md border border-border bg-surface"
							sandbox=""
							srcDoc={visualSummary.html}
						/>
					</div>
				) : (
					<div aria-live="polite" className="mt-4 flex min-h-[420px] items-center justify-center">
						<Spinner size="xl" className="text-text-subtle" label="Preparing generated webpage" />
					</div>
				)}
			</section>
		</div>
	);
}
