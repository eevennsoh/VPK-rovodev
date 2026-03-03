// ---------------------------------------------------------------------------
// Standup Summary — Types & JQL Helpers
// ---------------------------------------------------------------------------

// ── Status categories for Done / Doing / Blockers classification ────────────

export type StandupBucket = "done" | "doing" | "blockers";

export const STANDUP_BUCKETS: StandupBucket[] = ["done", "doing", "blockers"];

export const STANDUP_BUCKET_LABELS: Record<StandupBucket, string> = {
	done: "Done",
	doing: "In Progress",
	blockers: "Blockers",
};

export const STANDUP_BUCKET_LOZENGE_VARIANT: Record<
	StandupBucket,
	"success" | "information" | "danger"
> = {
	done: "success",
	doing: "information",
	blockers: "danger",
};

export const STANDUP_BUCKET_EMOJI: Record<StandupBucket, string> = {
	done: "✅",
	doing: "🔄",
	blockers: "🚫",
};

// ── Jira status → bucket classification ─────────────────────────────────────

/**
 * Map of lowercase Jira status names to standup buckets.
 *
 * Statuses not listed here fall through to `classifyStatusFallback`,
 * which uses a keyword heuristic. Extend this map for project-specific
 * statuses that the heuristic cannot handle.
 */
const STATUS_TO_BUCKET: Record<string, StandupBucket> = {
	// Done bucket
	done: "done",
	"🎉 done": "done",
	closed: "done",
	resolved: "done",
	released: "done",
	shipped: "done",
	merged: "done",
	completed: "done",
	"internal prod access granted": "done",

	// Doing bucket
	"in progress": "doing",
	"in review": "doing",
	"in development": "doing",
	"code review": "doing",
	"in testing": "doing",
	"🎨 ready for ux": "doing",
	"ready for review": "doing",
	"ready for dev": "doing",
	"ready for qa": "doing",
	"in flight": "doing",
	active: "doing",
	open: "doing",

	// Blockers bucket
	blocked: "blockers",
	"needs refinement": "blockers",
	"on hold": "blockers",
	impediment: "blockers",
	waiting: "blockers",
	"waiting for support": "blockers",
	"waiting for customer": "blockers",
	escalated: "blockers",
};

/**
 * Keyword-based fallback when the exact status is not in the map.
 * Checks for common substrings in the lowercased status string.
 */
function classifyStatusFallback(status: string): StandupBucket {
	const lower = status.toLowerCase();
	if (
		lower.includes("done") ||
		lower.includes("closed") ||
		lower.includes("resolved") ||
		lower.includes("complete") ||
		lower.includes("merged") ||
		lower.includes("released") ||
		lower.includes("shipped")
	) {
		return "done";
	}
	if (
		lower.includes("block") ||
		lower.includes("hold") ||
		lower.includes("impediment") ||
		lower.includes("wait") ||
		lower.includes("escalat")
	) {
		return "blockers";
	}
	// Default: treat unknown statuses as in-progress
	return "doing";
}

/**
 * Classify a Jira status string into a standup bucket.
 *
 * 1. Exact match (case-insensitive) against `STATUS_TO_BUCKET`
 * 2. Keyword heuristic via `classifyStatusFallback`
 */
export function classifyStatus(status: string): StandupBucket {
	const normalized = status.toLowerCase().trim();
	return STATUS_TO_BUCKET[normalized] ?? classifyStatusFallback(normalized);
}

// ── Standup item & summary types ────────────────────────────────────────────

export interface StandupItem {
	key: string;
	summary: string;
	status: string;
	bucket: StandupBucket;
	priority: string;
	type: string;
	assignee: string;
	url: string;
	updatedAt: string;
}

export interface StandupMetrics {
	total: number;
	done: number;
	doing: number;
	blockers: number;
}

export interface StandupSummary {
	siteUrl: string;
	generatedAt: string;
	timeWindowHours: number;
	metrics: StandupMetrics;
	items: StandupItem[];
	buckets: Record<StandupBucket, StandupItem[]>;
}

// ── Priority → Badge variant mapping ────────────────────────────────────────

export type PriorityBadgeVariant =
	| "destructive"
	| "warning"
	| "neutral"
	| "information"
	| "secondary";

const PRIORITY_VARIANT_MAP: Record<string, PriorityBadgeVariant> = {
	blocker: "destructive",
	critical: "destructive",
	highest: "destructive",
	high: "warning",
	medium: "neutral",
	minor: "information",
	low: "information",
	lowest: "secondary",
	trivial: "secondary",
};

/**
 * Map a Jira priority name to a Badge variant for UI rendering.
 */
export function getPriorityVariant(priority: string): PriorityBadgeVariant {
	return PRIORITY_VARIANT_MAP[priority.toLowerCase().trim()] ?? "neutral";
}

// ── JQL helpers ─────────────────────────────────────────────────────────────

export interface StandupJqlOptions {
	/** Time window in hours. Defaults to 24. */
	hoursAgo?: number;
	/** Jira project keys to filter by. If empty, searches all projects. */
	projects?: string[];
	/** Maximum results to fetch. Defaults to 50. */
	limit?: number;
}

const DEFAULT_HOURS_AGO = 24;
const DEFAULT_LIMIT = 50;

/**
 * Build a JQL query string for fetching standup activity.
 *
 * Returns issues assigned to the current user, updated within the
 * specified time window, ordered by most recently updated first.
 *
 * @example
 * ```ts
 * buildStandupJql() // all projects, last 24h
 * // → 'assignee = currentUser() AND updated >= -24h ORDER BY updated DESC'
 *
 * buildStandupJql({ hoursAgo: 48, projects: ["ASM", "SLTNS"] })
 * // → 'assignee = currentUser() AND project IN ("ASM", "SLTNS") AND updated >= -48h ORDER BY updated DESC'
 * ```
 */
export function buildStandupJql(options: StandupJqlOptions = {}): string {
	const hours = options.hoursAgo ?? DEFAULT_HOURS_AGO;
	const clauses: string[] = ["assignee = currentUser()"];

	if (options.projects && options.projects.length > 0) {
		const projectList = options.projects
			.map((p) => `"${p}"`)
			.join(", ");
		clauses.push(`project IN (${projectList})`);
	}

	clauses.push(`updated >= -${hours}h`);

	return `${clauses.join(" AND ")} ORDER BY updated DESC`;
}

/**
 * Resolve the limit for a standup query.
 */
export function getStandupLimit(options: StandupJqlOptions = {}): number {
	return Math.min(Math.max(options.limit ?? DEFAULT_LIMIT, 1), 100);
}

// ── Builders ────────────────────────────────────────────────────────────────

/**
 * Parse a raw Jira issue (from the MCP search result) into a StandupItem.
 *
 * The `siteUrl` is used to construct the browse URL if one is not
 * provided in the raw data.
 */
export function parseStandupItem(
	raw: {
		key?: string;
		summary?: string;
		status?: string;
		priority?: string;
		type?: string;
		assignee?: string;
		url?: string;
		updated?: string;
	},
	siteUrl: string,
): StandupItem {
	const status = raw.status ?? "Unknown";
	return {
		key: raw.key ?? "",
		summary: raw.summary ?? "",
		status,
		bucket: classifyStatus(status),
		priority: raw.priority ?? "Medium",
		type: raw.type ?? "Task",
		assignee: raw.assignee ?? "Unassigned",
		url: raw.url ?? `https://${siteUrl}/browse/${raw.key ?? ""}`,
		updatedAt: raw.updated ?? new Date().toISOString(),
	};
}

/**
 * Build a complete StandupSummary from a list of parsed items.
 */
export function buildStandupSummary(
	items: StandupItem[],
	siteUrl: string,
	timeWindowHours: number,
): StandupSummary {
	const buckets: Record<StandupBucket, StandupItem[]> = {
		done: [],
		doing: [],
		blockers: [],
	};

	for (const item of items) {
		buckets[item.bucket].push(item);
	}

	return {
		siteUrl,
		generatedAt: new Date().toISOString(),
		timeWindowHours,
		metrics: {
			total: items.length,
			done: buckets.done.length,
			doing: buckets.doing.length,
			blockers: buckets.blockers.length,
		},
		items,
		buckets,
	};
}
