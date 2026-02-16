import Link from "next/link";
import { headers } from "next/headers";
import { token } from "@/lib/tokens";
import type { AgentRun, AgentRunSummary } from "@/lib/agents-team-run-types";
import { RunSummarySection } from "./run-summary-section";

interface RunSummaryResponse {
	run?: AgentRun;
	summary?: AgentRunSummary | null;
	error?: string;
}

interface RunSummaryPageProps {
	params: Promise<{ runId: string }>;
}

interface HeaderLike {
	get(name: string): string | null;
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

	const inferredProtocol = host.includes("localhost") || host.startsWith("127.0.0.1") ? "http" : "https";
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
		return "Unable to reach the run summary service. Check that the frontend and backend dev servers are running.";
	}

	return trimmedMessage;
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

function groupTasksByAgent(run: AgentRun) {
	const groups = new Map<
		string,
		{ agentId: string; agentName: string; tasks: AgentRun["tasks"] }
	>();

	for (const task of run.tasks) {
		const existingGroup = groups.get(task.agentId);
		if (existingGroup) {
			existingGroup.tasks.push(task);
			continue;
		}

		groups.set(task.agentId, {
			agentId: task.agentId,
			agentName: task.agentName,
			tasks: [task],
		});
	}

	return Array.from(groups.values());
}

export const dynamic = "force-dynamic";

export default async function AgentsTeamRunSummaryPage({ params }: Readonly<RunSummaryPageProps>) {
	const { runId } = await params;
	const headersList = await headers();
	const requestOrigin = getRequestOrigin(headersList);
	const summaryPath = `/api/agents-team/runs/${encodeURIComponent(runId)}/summary`;
	let payload: RunSummaryResponse | null = null;
	let errorMessage: string | null = null;

	try {
		const summaryResponse = await fetch(`${requestOrigin}${summaryPath}`, { cache: "no-store" });

		if (!summaryResponse.ok) {
			const errorPayload = (await summaryResponse.json().catch(() => null)) as unknown;
			errorMessage = parseApiError(errorPayload, "Failed to load run summary.");
		} else {
			payload = (await summaryResponse.json()) as RunSummaryResponse;
		}
	} catch (error) {
		errorMessage = parseFetchFailure(error, "Failed to load run summary.");
	}

	if (!payload?.run || errorMessage) {
		return (
			<div className="mx-auto flex min-h-svh w-full max-w-[960px] flex-col gap-4 px-4 py-10">
				<div className="rounded-xl border border-border bg-surface p-6">
					<h1 className="text-lg font-semibold text-text">Run summary unavailable</h1>
					<p className="mt-2 text-sm text-text-subtle">
						{errorMessage ?? payload?.error ?? "No data found."}
					</p>
					<div className="mt-5">
						<Link
							href="/agents-team"
							className="inline-flex h-9 items-center rounded-md border border-border px-3 text-sm text-text hover:bg-bg-neutral-subtle-hovered"
						>
							Back to agents team
						</Link>
					</div>
				</div>
			</div>
		);
	}

	const groupedOutputs = groupTasksByAgent(payload.run);

	return (
		<div className="bg-surface">
			<div className="mx-auto flex min-h-svh w-full max-w-[1040px] flex-col gap-6 px-4 py-8 md:px-6">
				<div className="flex flex-wrap items-start justify-between gap-3">
					<div>
						<p className="text-xs uppercase tracking-wide text-text-subtlest">Run summary</p>
						<h1
							style={{ font: token("font.heading.medium") }}
							className="mt-1 text-text"
						>
							{payload.run.plan.emoji ? `${payload.run.plan.emoji} ` : ""}
							{payload.run.plan.title}
						</h1>
						<p className="mt-1 text-sm text-text-subtle">
							Status: {payload.run.status} · Started {formatDateTime(payload.run.createdAt)} · Finished{" "}
							{formatDateTime(payload.run.completedAt)}
						</p>
					</div>
					<Link
						href="/agents-team"
						className="inline-flex h-9 items-center rounded-md border border-border px-3 text-sm text-text hover:bg-bg-neutral-subtle-hovered"
					>
						Back to agents team
					</Link>
				</div>

				<RunSummarySection
					runId={runId}
					initialRun={payload.run}
					initialSummary={payload.summary ?? null}
				/>

				<section className="rounded-xl border border-border bg-surface-raised p-5">
					<h2 className="text-base font-semibold text-text">Agent outputs</h2>
					<div className="mt-4 flex flex-col gap-4">
						{groupedOutputs.map((group) => (
							<div key={group.agentId} className="rounded-lg border border-border bg-surface p-4">
								<h3 className="text-sm font-semibold text-text">{group.agentName}</h3>
								<div className="mt-3 flex flex-col gap-3">
									{group.tasks.map((task) => (
										<div
											key={task.id}
											className="rounded-md border border-border bg-surface-sunken p-3"
										>
											<div className="flex flex-wrap items-center gap-2 text-xs text-text-subtle">
												<span className="rounded bg-bg-neutral px-1.5 py-0.5">{task.id}</span>
												<span>{task.status}</span>
												<span>Attempts: {task.attempts}</span>
											</div>
											<p className="mt-2 text-sm font-medium text-text">{task.label}</p>
											<pre className="mt-2 whitespace-pre-wrap text-sm text-text-subtle">
												{task.output || task.error || "No output recorded."}
											</pre>
										</div>
									))}
								</div>
							</div>
						))}
					</div>
				</section>
			</div>
		</div>
	);
}
