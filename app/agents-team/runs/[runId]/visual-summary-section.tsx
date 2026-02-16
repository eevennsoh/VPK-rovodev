"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { AgentRunVisualSummary } from "@/lib/agents-team-run-types";
import { API_ENDPOINTS } from "@/lib/api-config";

const POLL_INTERVAL_MS = 3000;
const MAX_POLL_DURATION_MS = 120000;

interface VisualSummaryResponse {
	visualSummary: AgentRunVisualSummary | null;
	error?: string;
}

interface VisualSummarySectionProps {
	runId: string;
	initialVisualSummary: AgentRunVisualSummary | null;
	runStatus: string;
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

export function VisualSummarySection({
	runId,
	initialVisualSummary,
	runStatus,
}: Readonly<VisualSummarySectionProps>) {
	const [visualSummary, setVisualSummary] = useState<AgentRunVisualSummary | null>(initialVisualSummary);
	const [pollError, setPollError] = useState<string | null>(null);
	const [hasPollingTimedOut, setHasPollingTimedOut] = useState(false);
	const [pollAttemptKey, setPollAttemptKey] = useState(0);
	const pollingStartedAtRef = useRef<number | null>(null);
	const iframeRef = useRef<HTMLIFrameElement>(null);

	const fetchVisualSummary = useCallback(async (): Promise<"pending" | "ready" | "error"> => {
		try {
			const response = await fetch(
				API_ENDPOINTS.agentsTeamRunVisualSummary(runId),
				{ cache: "no-store" }
			);
			if (!response.ok) {
				setPollError("Failed to load visual summary.");
				return "error";
			}

			const payload = (await response.json()) as VisualSummaryResponse;
			if (payload.visualSummary) {
				setVisualSummary(payload.visualSummary);
				setPollError(null);
				setHasPollingTimedOut(false);
				return "ready";
			}

			return "pending";
		} catch (error) {
			setPollError(error instanceof Error ? error.message : "Failed to load visual summary.");
			return "error";
		}
	}, [runId]);

	useEffect(() => {
		const shouldPoll =
			runStatus !== "running" &&
			visualSummary === null &&
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

			const result = await fetchVisualSummary();
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
	}, [fetchVisualSummary, hasPollingTimedOut, pollAttemptKey, pollError, runStatus, visualSummary]);

	const restartPolling = useCallback(() => {
		pollingStartedAtRef.current = Date.now();
		setPollError(null);
		setHasPollingTimedOut(false);
		setPollAttemptKey((previous) => previous + 1);
	}, []);

	const isPolling =
		runStatus !== "running" &&
		visualSummary === null &&
		!pollError &&
		!hasPollingTimedOut;

	if (visualSummary) {
		return (
			<section className="rounded-xl border border-border bg-surface-raised p-5">
				<div className="flex items-center justify-between">
					<div>
						<h2 className="text-base font-semibold text-text">Visual summary</h2>
						<p className="mt-1 text-xs text-text-subtlest">
							Generated {formatDateTime(visualSummary.createdAt)}
							{visualSummary.hasImages ? " · With generated images" : ""}
						</p>
					</div>
				</div>
				<div className="mt-4 overflow-hidden rounded-lg border border-border">
					<iframe
						ref={iframeRef}
						srcDoc={visualSummary.html}
						title="Visual summary"
						className="w-full border-0"
						style={{ minHeight: "600px", height: "80vh", maxHeight: "1200px" }}
						sandbox=""
					/>
				</div>
			</section>
		);
	}

	// Show loading/polling state only if the run has completed
	if (runStatus === "running") {
		return null;
	}

	return (
		<section className="rounded-xl border border-border bg-surface-raised p-5">
			<h2 className="text-base font-semibold text-text">Visual summary</h2>
			<div className="mt-4 rounded-lg bg-surface-sunken p-4" aria-live="polite">
				<p className="text-sm text-text">Visual summary is being generated in the background.</p>
				{isPolling ? (
					<p className="mt-2 text-xs text-text-subtle">
						Checking for visual summary updates...
					</p>
				) : null}
				{hasPollingTimedOut ? (
					<p className="mt-2 text-xs text-text-subtle">
						Visual summary generation is taking longer than expected.
					</p>
				) : null}
				{pollError ? <p className="mt-2 text-xs text-text-danger">{pollError}</p> : null}
				{hasPollingTimedOut || pollError ? (
					<div className="mt-3">
						<button
							type="button"
							onClick={restartPolling}
							className="inline-flex h-8 items-center rounded-md border border-border px-3 text-sm text-text hover:bg-bg-neutral-subtle-hovered"
						>
							Refresh visual summary
						</button>
					</div>
				) : null}
			</div>
		</section>
	);
}
