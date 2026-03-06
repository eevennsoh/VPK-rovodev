import type { AgentRunListItem } from "@/lib/make-run-types";

interface RunTimingInput
	extends Pick<AgentRunListItem, "status" | "completedAt" | "updatedAt">,
		Partial<Pick<AgentRunListItem, "summary" | "genuiSummary">> {}

function toTimestamp(value: string | null | undefined): number {
	if (!value) {
		return Number.NaN;
	}

	return Date.parse(value);
}

export function resolveRunCompletedAtForDisplay(run: RunTimingInput): string | null {
	if (run.status === "running") {
		return run.completedAt;
	}

	const candidates = [
		run.completedAt,
		run.summary?.createdAt,
		run.genuiSummary?.createdAt,
		run.updatedAt,
	];

	let latestTimestamp = Number.NaN;
	let latestValue: string | null = run.completedAt;
	for (const candidate of candidates) {
		const candidateTimestamp = toTimestamp(candidate);
		if (!Number.isFinite(candidateTimestamp)) {
			continue;
		}

		if (!Number.isFinite(latestTimestamp) || candidateTimestamp > latestTimestamp) {
			latestTimestamp = candidateTimestamp;
			latestValue = candidate ?? null;
		}
	}

	return latestValue;
}
