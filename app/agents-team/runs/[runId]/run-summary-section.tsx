"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import LinkExternalIcon from "@atlaskit/icon/core/link-external";
import type {
	AgentRun,
	AgentRunSummary,
	AgentRunVisualSummary,
	AgentRunGenuiSummary,
} from "@/lib/agents-team-run-types";
import { JsonRenderView } from "@/lib/json-render/renderer";

const POLL_INTERVAL_MS = 2000;
const MAX_POLL_DURATION_MS = 60000;

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

function isGenuiSpecRenderable(genuiSummary: AgentRunGenuiSummary | null): boolean {
	if (!genuiSummary || genuiSummary.status !== "ready") {
		return false;
	}

	const spec = genuiSummary.spec;
	return (
		typeof spec.root === "string" &&
		spec.root.length > 0 &&
		typeof spec.elements === "object" &&
		Object.keys(spec.elements).length > 0
	);
}

export function RunSummarySection({
	runId,
	initialRun,
	initialSummary,
	initialVisualSummary,
	initialGenuiSummary,
	collapsible = false,
	defaultCollapsed = false,
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
				`/api/agents-team/runs/${encodeURIComponent(runId)}/summary`,
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

	const hasRenderableGenuiSpec = isGenuiSpecRenderable(genuiSummary);

	return (
		<div className="flex flex-col gap-4">
			<section className="rounded-xl border border-border bg-surface-raised p-5">
				<div className={collapsible ? "flex items-center justify-between" : undefined}>
					<div>
						<h2 className="text-base font-semibold text-text">Final synthesis</h2>
						<p className="mt-1 text-xs text-text-subtlest">
							Generated {formatDateTime(summary?.createdAt ?? null)}
							{summary?.partial ? " · Partial completion" : ""}
						</p>
					</div>
					{collapsible ? (
						<button
							type="button"
							onClick={() => setIsCollapsed((prev) => !prev)}
							className="inline-flex h-8 items-center rounded-md border border-border px-3 text-sm text-text hover:bg-bg-neutral-subtle-hovered"
						>
							{isCollapsed ? "Show" : "Hide"}
						</button>
					) : null}
				</div>
				{!isCollapsed ? (
					<div className="mt-4 rounded-lg bg-surface-sunken p-4">
						{summary ? (
							<pre className="whitespace-pre-wrap text-sm text-text">{summary.content}</pre>
						) : (
							<div aria-live="polite" className="flex flex-col gap-3">
								<p className="text-sm text-text">Final synthesis is being generated in the background.</p>
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
				) : null}
			</section>

			<section className="rounded-xl border border-border bg-surface-raised p-5">
				<div>
					<h2 className="text-base font-semibold text-text">Interactive summary</h2>
					<p className="mt-1 text-xs text-text-subtlest">
						Generated {formatDateTime(genuiSummary?.createdAt ?? null)}
						{genuiSummary?.partial ? " · Partial completion" : ""}
					</p>
				</div>
				<div className="mt-4 rounded-lg bg-surface-sunken p-4">
					{hasRenderableGenuiSpec && genuiSummary ? (
						<div className="flex flex-col gap-2">
							{genuiSummary.status === "failed" ? (
								<p className="text-xs text-text-danger">
									{genuiSummary.error || "Failed to generate interactive summary."}
								</p>
							) : null}
							<JsonRenderView spec={genuiSummary.spec} />
						</div>
					) : genuiSummary?.status === "failed" ? (
						<div className="flex flex-col gap-2">
							<p className="text-xs text-text-danger">
								{genuiSummary.error || "Failed to generate interactive summary."}
							</p>
						</div>
					) : (
						<div aria-live="polite" className="flex flex-col gap-2">
							<p className="text-sm text-text">Interactive summary is being generated.</p>
							{isPolling ? (
								<p className="text-xs text-text-subtle">
									Checking for interactive summary updates every 2 seconds.
								</p>
							) : null}
						</div>
					)}
				</div>
			</section>

			<section className="rounded-xl border border-border bg-surface-raised p-5">
				<div className="flex items-center justify-between">
					<div>
						<h2 className="text-base font-semibold text-text">Visual summary</h2>
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
				<div className="mt-4 rounded-lg bg-surface-sunken p-3">
					{visualSummary ? (
						<div className="flex flex-col gap-2">
							{visualSummary.status === "failed" ? (
								<p className="text-xs text-text-danger">
									Visual presenter fallback used:{" "}
									{visualSummary.error || "Failed to generate visual summary."}
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
						<div aria-live="polite" className="flex flex-col gap-2">
							<p className="text-sm text-text">Visual summary page is being generated.</p>
							{isPolling ? (
								<p className="text-xs text-text-subtle">
									Checking for visual summary updates every 2 seconds.
								</p>
							) : null}
						</div>
					)}
				</div>
			</section>
		</div>
	);
}
