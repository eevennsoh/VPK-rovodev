/**
 * Static sample data for the Analytics Dashboard
 * Contains KPI metrics, revenue trend time series, and revenue-by-segment breakdown
 */

// ---------------------------------------------------------------------------
// KPI types
// ---------------------------------------------------------------------------

export type TrendDirection = "up" | "down" | "flat";

export interface KpiMetric {
	/** Machine-readable key used for icon/color selection */
	key: string;
	/** Human-readable label shown above the value */
	label: string;
	/** Formatted display value (e.g. "$1.24M") */
	value: string;
	/** Raw numeric value for calculations */
	rawValue: number;
	/** Percentage change from previous period */
	changePercent: number;
	/** Direction of the trend */
	trend: TrendDirection;
	/** Description of the comparison period */
	periodLabel: string;
}

// ---------------------------------------------------------------------------
// Chart data types
// ---------------------------------------------------------------------------

export interface RevenueTrendPoint {
	/** Month label (e.g. "Jan 2025") */
	month: string;
	/** Total revenue in dollars */
	revenue: number;
	/** Previous year revenue for comparison */
	previousYear: number;
}

export interface RevenueSegment {
	/** Segment name used as nameKey */
	segment: string;
	/** Revenue value in dollars */
	revenue: number;
	/** Fill color variable reference */
	fill: string;
}

// ---------------------------------------------------------------------------
// KPI data
// ---------------------------------------------------------------------------

export const KPI_METRICS: KpiMetric[] = [
	{
		key: "revenue",
		label: "Total Revenue",
		value: "$1.24M",
		rawValue: 1_240_000,
		changePercent: 12.5,
		trend: "up",
		periodLabel: "vs last month",
	},
	{
		key: "customers",
		label: "Total Customers",
		value: "8,942",
		rawValue: 8_942,
		changePercent: 8.1,
		trend: "up",
		periodLabel: "vs last month",
	},
	{
		key: "conversion",
		label: "Conversion Rate",
		value: "3.24%",
		rawValue: 3.24,
		changePercent: -0.4,
		trend: "down",
		periodLabel: "vs last month",
	},
	{
		key: "mrr",
		label: "Monthly Recurring Revenue",
		value: "$892K",
		rawValue: 892_000,
		changePercent: 4.3,
		trend: "up",
		periodLabel: "vs last month",
	},
];

// ---------------------------------------------------------------------------
// Revenue trend data (12 months)
// ---------------------------------------------------------------------------

export const REVENUE_TREND_DATA: RevenueTrendPoint[] = [
	{ month: "Mar 2025", revenue: 820_000, previousYear: 680_000 },
	{ month: "Apr 2025", revenue: 870_000, previousYear: 720_000 },
	{ month: "May 2025", revenue: 910_000, previousYear: 750_000 },
	{ month: "Jun 2025", revenue: 960_000, previousYear: 790_000 },
	{ month: "Jul 2025", revenue: 940_000, previousYear: 810_000 },
	{ month: "Aug 2025", revenue: 1_010_000, previousYear: 830_000 },
	{ month: "Sep 2025", revenue: 1_050_000, previousYear: 860_000 },
	{ month: "Oct 2025", revenue: 1_080_000, previousYear: 890_000 },
	{ month: "Nov 2025", revenue: 1_120_000, previousYear: 920_000 },
	{ month: "Dec 2025", revenue: 1_150_000, previousYear: 950_000 },
	{ month: "Jan 2026", revenue: 1_180_000, previousYear: 780_000 },
	{ month: "Feb 2026", revenue: 1_240_000, previousYear: 820_000 },
];

// ---------------------------------------------------------------------------
// Revenue by segment data
// ---------------------------------------------------------------------------

export const REVENUE_SEGMENT_DATA: RevenueSegment[] = [
	{ segment: "enterprise", revenue: 520_000, fill: "var(--color-enterprise)" },
	{ segment: "smb", revenue: 340_000, fill: "var(--color-smb)" },
	{ segment: "startup", revenue: 230_000, fill: "var(--color-startup)" },
	{ segment: "selfServe", revenue: 150_000, fill: "var(--color-selfServe)" },
];

// ---------------------------------------------------------------------------
// Chart config constants (for shadcn ChartConfig)
// ---------------------------------------------------------------------------

export const REVENUE_TREND_CHART_CONFIG = {
	revenue: {
		label: "Revenue",
		color: "var(--color-chart-1)",
	},
	previousYear: {
		label: "Previous Year",
		color: "var(--color-chart-2)",
	},
} as const;

export const REVENUE_SEGMENT_CHART_CONFIG = {
	revenue: {
		label: "Revenue",
	},
	enterprise: {
		label: "Enterprise",
		color: "var(--color-chart-1)",
	},
	smb: {
		label: "SMB",
		color: "var(--color-chart-2)",
	},
	startup: {
		label: "Startup",
		color: "var(--color-chart-3)",
	},
	selfServe: {
		label: "Self-serve",
		color: "var(--color-chart-4)",
	},
} as const;

// ---------------------------------------------------------------------------
// Helper functions
// ---------------------------------------------------------------------------

/**
 * Returns total revenue across all segments
 */
export function getTotalSegmentRevenue(): number {
	return REVENUE_SEGMENT_DATA.reduce((sum, s) => sum + s.revenue, 0);
}

/**
 * Format a raw dollar amount to a compact display string (e.g. $1.24M)
 */
export function formatCurrency(value: number): string {
	if (value >= 1_000_000) {
		return `$${(value / 1_000_000).toFixed(2)}M`;
	}
	if (value >= 1_000) {
		return `$${(value / 1_000).toFixed(0)}K`;
	}
	return `$${value.toFixed(0)}`;
}

/**
 * Format a raw dollar amount for chart axis labels (e.g. $800K)
 */
export function formatAxisCurrency(value: number): string {
	if (value >= 1_000_000) {
		return `$${(value / 1_000_000).toFixed(1)}M`;
	}
	if (value >= 1_000) {
		return `$${(value / 1_000).toFixed(0)}K`;
	}
	return `$${value.toFixed(0)}`;
}
