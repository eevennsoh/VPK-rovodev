import Link from "next/link";
import { headers } from "next/headers";
import type {
	AgentRun,
	AgentRunArtifact,
	AgentRunSummary,
	AgentRunVisualSummary,
	AgentRunGenuiSummary,
} from "@/lib/plan-run-types";
import { RunWorkspace } from "@/components/projects/plan/components/run-workspace";

interface RunResponse {
	run?: AgentRun;
	error?: string;
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

interface RunSummaryPageProps {
	params: Promise<{ runId: string }>;
}

interface HeaderLike {
	get(name: string): string | null;
}

interface FetchJsonResult<TPayload> {
	payload: TPayload | null;
	error: string | null;
}

function getRequestOrigin(headersList: HeaderLike): string {
	const forwardedHost = headersList.get("x-forwarded-host");
	const host = forwardedHost ?? headersList.get("host");
	if (!host) {
		const localPort = process.env.PORT ?? "3000";
		return `http://localhost:${localPort}`;
	}

	const forwardedProto = headersList.get("x-forwarded-proto");
	if (forwardedProto === "http" || forwardedProto === "https") {
		return `${forwardedProto}://${host}`;
	}

	const inferredProtocol =
		host.includes("localhost") || host.startsWith("127.0.0.1") ? "http" : "https";
	return `${inferredProtocol}://${host}`;
}

function getStringValue(value: unknown): string | null {
	return typeof value === "string" && value.trim() ? value.trim() : null;
}

function parseApiError(payload: unknown, fallbackMessage: string): string {
	if (!payload || typeof payload !== "object") {
		return fallbackMessage;
	}

	const record = payload as {
		error?: unknown;
		details?: unknown;
		message?: unknown;
	};

	return (
		getStringValue(record.error) ??
		getStringValue(record.details) ??
		getStringValue(record.message) ??
		fallbackMessage
	);
}

function parseFetchFailure(error: unknown, fallbackMessage: string): string {
	if (!(error instanceof Error) || !error.message.trim()) {
		return fallbackMessage;
	}

	const trimmedMessage = error.message.trim();
	if (trimmedMessage.toLowerCase().includes("fetch failed")) {
		return "Unable to reach the plan run service. Check that the frontend and backend dev servers are running.";
	}

	return trimmedMessage;
}

function resolveInitialNowMs(run: AgentRun): number | undefined {
	const updatedAtMs = Date.parse(run.updatedAt);
	if (Number.isFinite(updatedAtMs)) {
		return updatedAtMs;
	}

	const createdAtMs = Date.parse(run.createdAt);
	if (Number.isFinite(createdAtMs)) {
		return createdAtMs;
	}

	return undefined;
}

async function fetchJson<TPayload>(url: string, fallbackMessage: string): Promise<FetchJsonResult<TPayload>> {
	try {
		const response = await fetch(url, { cache: "no-store" });
		if (!response.ok) {
			const errorPayload = (await response.json().catch(() => null)) as unknown;
			return {
				payload: null,
				error: parseApiError(errorPayload, fallbackMessage),
			};
		}

		return {
			payload: (await response.json()) as TPayload,
			error: null,
		};
	} catch (error) {
		return {
			payload: null,
			error: parseFetchFailure(error, fallbackMessage),
		};
	}
}

export const dynamic = "force-dynamic";

export default async function PlanRunSummaryPage({ params }: Readonly<RunSummaryPageProps>) {
	const { runId } = await params;
	const headersList = await headers();
	const requestOrigin = getRequestOrigin(headersList);
	const encodedRunId = encodeURIComponent(runId);

	const [runResult, summaryResult, filesResult] = await Promise.all([
		fetchJson<RunResponse>(
			`${requestOrigin}/api/plan/runs/${encodedRunId}`,
			"Failed to load run data."
		),
		fetchJson<RunSummaryResponse>(
			`${requestOrigin}/api/plan/runs/${encodedRunId}/summary`,
			"Failed to load run summary."
		),
		fetchJson<RunFilesResponse>(
			`${requestOrigin}/api/plan/runs/${encodedRunId}/files`,
			"Failed to load run files."
		),
	]);

	const resolvedRun =
		runResult.payload?.run ?? summaryResult.payload?.run ?? filesResult.payload?.run ?? null;
	const errorMessage = runResult.error || summaryResult.error || filesResult.error;

	if (!resolvedRun) {
		return (
			<div className="mx-auto flex min-h-svh w-full max-w-[960px] flex-col gap-4 px-4 py-10">
				<div className="rounded-xl border border-border bg-surface p-6">
					<h1 className="text-lg font-semibold text-text">Run workspace unavailable</h1>
					<p className="mt-2 text-sm text-text-subtle">
						{errorMessage ?? "No run data found."}
					</p>
					<div className="mt-5">
						<Link
							href="/plan"
							className="inline-flex h-9 items-center rounded-md border border-border px-3 text-sm text-text hover:bg-bg-neutral-subtle-hovered"
						>
							Back to plan
						</Link>
					</div>
				</div>
			</div>
		);
	}

	const initialSummary =
		summaryResult.payload?.summary ?? resolvedRun.summary ?? null;
	const initialVisualSummary =
		summaryResult.payload?.visualSummary ?? resolvedRun.visualSummary ?? null;
	const initialGenuiSummary =
		summaryResult.payload?.genuiSummary ?? resolvedRun.genuiSummary ?? null;
	const initialArtifacts =
		filesResult.payload?.artifacts ?? resolvedRun.artifacts ?? [];
	const initialNowMs = resolveInitialNowMs(resolvedRun);

	return (
		<div className="bg-surface">
			<RunWorkspace
				runId={runId}
				initialRun={resolvedRun}
				initialNowMs={initialNowMs}
				initialSummary={initialSummary}
				initialVisualSummary={initialVisualSummary}
				initialGenuiSummary={initialGenuiSummary}
				initialArtifacts={initialArtifacts}
			/>
		</div>
	);
}
