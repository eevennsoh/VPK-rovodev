// ---------------------------------------------------------------------------
// Ticket Classifier — Types, Classification Maps & Helpers
// ---------------------------------------------------------------------------

// ── Ticket categories ───────────────────────────────────────────────────────

export type TicketCategory =
	| "billing"
	| "account"
	| "technical"
	| "onboarding"
	| "api-integration"
	| "documentation";

export const TICKET_CATEGORIES: TicketCategory[] = [
	"billing",
	"account",
	"technical",
	"onboarding",
	"api-integration",
	"documentation",
];

export const CATEGORY_LABELS: Record<TicketCategory, string> = {
	billing: "Billing",
	account: "Account",
	technical: "Technical",
	onboarding: "Onboarding",
	"api-integration": "API / Integration",
	documentation: "Documentation",
};

export const CATEGORY_DESCRIPTIONS: Record<TicketCategory, string> = {
	billing: "Invoices, payments, charges, subscriptions, refunds, pricing",
	account: "Login, passwords, SSO, permissions, access, profiles, MFA",
	technical: "Bugs, errors, crashes, performance, timeouts, outages",
	onboarding: "Setup, getting started, tutorials, first-time configuration",
	"api-integration": "API, webhooks, REST, endpoints, SDKs, OAuth, integrations",
	documentation: "Docs, guides, how-tos, instructions, FAQs",
};

// ── Category → Lozenge variant mapping ──────────────────────────────────────

export const CATEGORY_LOZENGE_VARIANT: Record<
	TicketCategory,
	| "neutral"
	| "success"
	| "danger"
	| "information"
	| "discovery"
	| "warning"
	| "accent-teal"
	| "accent-purple"
> = {
	billing: "warning",
	account: "discovery",
	technical: "danger",
	onboarding: "success",
	"api-integration": "accent-teal",
	documentation: "information",
};

// ── Category → emoji mapping ────────────────────────────────────────────────

export const CATEGORY_EMOJI: Record<TicketCategory, string> = {
	billing: "💳",
	account: "🔐",
	technical: "🐛",
	onboarding: "🚀",
	"api-integration": "🔌",
	documentation: "📄",
};

// ── Priority levels ─────────────────────────────────────────────────────────

export type TicketPriority = "P1" | "P2" | "P3" | "P4";

export const TICKET_PRIORITIES: TicketPriority[] = ["P1", "P2", "P3", "P4"];

export const PRIORITY_LABELS: Record<TicketPriority, string> = {
	P1: "Critical",
	P2: "High",
	P3: "Medium",
	P4: "Low",
};

export const PRIORITY_BADGE_VARIANT: Record<
	TicketPriority,
	"destructive" | "warning" | "neutral" | "secondary"
> = {
	P1: "destructive",
	P2: "warning",
	P3: "neutral",
	P4: "secondary",
};

// ── Team routing ────────────────────────────────────────────────────────────

export interface TeamRoute {
	team: string;
	emoji: string;
	description: string;
}

export const CATEGORY_TEAM_ROUTES: Record<TicketCategory, TeamRoute> = {
	billing: {
		team: "Finance Ops",
		emoji: "💰",
		description: "Handles billing inquiries, refunds, and subscription changes",
	},
	account: {
		team: "Identity Team",
		emoji: "🛡️",
		description: "Manages authentication, access control, and user profiles",
	},
	technical: {
		team: "Engineering",
		emoji: "⚙️",
		description: "Investigates bugs, performance issues, and technical failures",
	},
	onboarding: {
		team: "Customer Success",
		emoji: "🎯",
		description: "Guides new users through setup and initial configuration",
	},
	"api-integration": {
		team: "Platform Team",
		emoji: "🔧",
		description: "Supports API usage, webhooks, and third-party integrations",
	},
	documentation: {
		team: "Content Team",
		emoji: "✍️",
		description: "Maintains docs, guides, and knowledge base articles",
	},
};

// ── Keyword dictionaries for classification ─────────────────────────────────

/**
 * Each category has an array of keyword patterns. During classification,
 * the ticket's summary and description are scanned against these patterns.
 * Matches are counted and weighted to determine the best category.
 *
 * Patterns are lowercase strings; the classifier lowercases input before
 * matching. Multi-word patterns (e.g. "getting started") match as substrings.
 */
export const CATEGORY_KEYWORDS: Record<TicketCategory, string[]> = {
	billing: [
		"invoice",
		"payment",
		"charge",
		"subscription",
		"refund",
		"pricing",
		"billing",
		"credit card",
		"plan upgrade",
		"plan downgrade",
		"renewal",
		"discount",
		"coupon",
		"receipt",
		"cost",
		"fee",
		"overcharge",
		"prorate",
		"trial",
		"cancellation",
	],
	account: [
		"login",
		"password",
		"sso",
		"permissions",
		"access",
		"profile",
		"mfa",
		"two-factor",
		"2fa",
		"authentication",
		"sign in",
		"sign up",
		"register",
		"account",
		"locked out",
		"reset password",
		"email change",
		"username",
		"deactivate",
		"role",
		"admin access",
	],
	technical: [
		"bug",
		"error",
		"crash",
		"performance",
		"timeout",
		"500",
		"404",
		"stack trace",
		"exception",
		"broken",
		"not working",
		"slow",
		"latency",
		"outage",
		"downtime",
		"failure",
		"regression",
		"fix",
		"issue",
		"memory leak",
		"cpu",
		"load",
		"unresponsive",
		"hang",
		"freeze",
	],
	onboarding: [
		"setup",
		"getting started",
		"tutorial",
		"first time",
		"configuration",
		"onboarding",
		"new user",
		"quickstart",
		"walkthrough",
		"initial setup",
		"install",
		"installation",
		"getting going",
		"beginner",
		"welcome",
		"trial setup",
		"provision",
	],
	"api-integration": [
		"api",
		"webhook",
		"rest",
		"endpoint",
		"sdk",
		"integration",
		"oauth",
		"token",
		"rate limit",
		"api key",
		"graphql",
		"swagger",
		"openapi",
		"callback",
		"payload",
		"request",
		"response code",
		"curl",
		"postman",
		"third-party",
		"connect",
		"plugin",
	],
	documentation: [
		"docs",
		"documentation",
		"guide",
		"how to",
		"instructions",
		"faq",
		"knowledge base",
		"article",
		"help page",
		"readme",
		"changelog",
		"release notes",
		"manual",
		"reference",
		"example",
		"sample code",
		"tutorial doc",
		"wiki",
	],
};

// ── Priority keyword signals ────────────────────────────────────────────────

/**
 * Keywords that signal urgency, used to adjust the inferred priority.
 * These are checked independently of category classification.
 */
export const URGENCY_KEYWORDS = {
	critical: [
		"urgent",
		"critical",
		"emergency",
		"production down",
		"p1",
		"sev1",
		"outage",
		"data loss",
		"security breach",
		"blocker",
		"showstopper",
	],
	high: [
		"important",
		"high priority",
		"asap",
		"p2",
		"sev2",
		"major",
		"impacting",
		"affecting multiple",
		"widespread",
	],
	low: [
		"low priority",
		"minor",
		"cosmetic",
		"nice to have",
		"when you get a chance",
		"no rush",
		"p4",
		"trivial",
	],
} as const;

// ── Jira priority → TicketPriority mapping ──────────────────────────────────

const JIRA_PRIORITY_MAP: Record<string, TicketPriority> = {
	blocker: "P1",
	critical: "P1",
	highest: "P1",
	high: "P2",
	medium: "P3",
	low: "P4",
	lowest: "P4",
	minor: "P4",
	trivial: "P4",
};

/**
 * Map a Jira priority name to a TicketPriority.
 * Falls back to P3 (Medium) for unknown priorities.
 */
export function mapJiraPriority(priority: string): TicketPriority {
	return JIRA_PRIORITY_MAP[priority.toLowerCase().trim()] ?? "P3";
}

// ── Confidence thresholds ───────────────────────────────────────────────────

export const CONFIDENCE_THRESHOLDS = {
	/** Below this value, show a "low confidence" warning */
	low: 0.5,
	/** Above this value, the classification is considered strong */
	high: 0.8,
} as const;

/**
 * Get a human-readable label for a confidence score.
 */
export function getConfidenceLabel(
	confidence: number,
): "Low" | "Medium" | "High" {
	if (confidence < CONFIDENCE_THRESHOLDS.low) return "Low";
	if (confidence >= CONFIDENCE_THRESHOLDS.high) return "High";
	return "Medium";
}

/**
 * Get a Badge variant for a confidence level.
 */
export function getConfidenceBadgeVariant(
	confidence: number,
): "danger" | "warning" | "success" {
	if (confidence < CONFIDENCE_THRESHOLDS.low) return "danger";
	if (confidence >= CONFIDENCE_THRESHOLDS.high) return "success";
	return "warning";
}

// ── Core types for classified tickets ───────────────────────────────────────

export interface RawTicket {
	key: string;
	summary: string;
	description: string;
	status: string;
	priority: string;
	type: string;
	assignee: string;
	reporter: string;
	project: string;
	projectKey: string;
	url: string;
	createdAt: string;
	updatedAt: string;
	labels: string[];
	components: string[];
}

export interface ClassifiedTicket {
	/** Original ticket data */
	ticket: RawTicket;
	/** Assigned product area category */
	category: TicketCategory;
	/** Inferred priority level */
	priority: TicketPriority;
	/** Classification confidence score (0.0 – 1.0) */
	confidence: number;
	/** Suggested team for routing */
	suggestedTeam: TeamRoute;
	/** Category scores for all categories (for debugging/transparency) */
	allScores: Record<TicketCategory, number>;
}

export interface ClassificationResult {
	siteUrl: string;
	project: string;
	generatedAt: string;
	totalTickets: number;
	classified: ClassifiedTicket[];
	/** Distribution of tickets per category */
	distribution: Record<TicketCategory, number>;
	/** Distribution of tickets per priority */
	priorityDistribution: Record<TicketPriority, number>;
	/** Count of low-confidence classifications */
	lowConfidenceCount: number;
}

// ── JQL helpers ─────────────────────────────────────────────────────────────

export interface ClassifyJqlOptions {
	/** Jira project key (default: "SUPPORT") */
	project?: string;
	/** Only include tickets with these statuses. If empty, excludes Done. */
	excludeStatuses?: string[];
	/** Maximum results to fetch (default: 25, max: 100) */
	limit?: number;
}

const DEFAULT_PROJECT = "SUPPORT";
const DEFAULT_LIMIT = 25;

/**
 * Build a JQL query for fetching support tickets to classify.
 *
 * @example
 * ```ts
 * buildClassifyJql()
 * // → 'project = "SUPPORT" AND status != "Done" ORDER BY created DESC'
 *
 * buildClassifyJql({ project: "HELPDESK", limit: 10 })
 * // → 'project = "HELPDESK" AND status != "Done" ORDER BY created DESC'
 * ```
 */
export function buildClassifyJql(options: ClassifyJqlOptions = {}): string {
	const project = options.project || DEFAULT_PROJECT;
	const excludeStatuses = options.excludeStatuses ?? ["Done", "Closed", "Resolved"];

	const clauses: string[] = [`project = "${project}"`];

	if (excludeStatuses.length > 0) {
		const statusList = excludeStatuses.map((s) => `"${s}"`).join(", ");
		clauses.push(`status NOT IN (${statusList})`);
	}

	return `${clauses.join(" AND ")} ORDER BY created DESC`;
}

/**
 * Resolve the limit for a classification query.
 */
export function getClassifyLimit(options: ClassifyJqlOptions = {}): number {
	const limit = options.limit ?? DEFAULT_LIMIT;
	return Math.min(Math.max(Math.floor(limit), 1), 100);
}

// ── Builders ────────────────────────────────────────────────────────────────

/**
 * Build empty distribution maps for initialization.
 */
export function emptyDistribution(): Record<TicketCategory, number> {
	return {
		billing: 0,
		account: 0,
		technical: 0,
		onboarding: 0,
		"api-integration": 0,
		documentation: 0,
	};
}

export function emptyPriorityDistribution(): Record<TicketPriority, number> {
	return { P1: 0, P2: 0, P3: 0, P4: 0 };
}
