"use client";

import { AnalyticsKpiCards } from "@/components/blocks/dashboard/components/analytics-kpi-cards";
import { ChartEngagementTrend } from "@/components/blocks/dashboard/components/chart-engagement-trend";
import { ChartFeatureComparison } from "@/components/blocks/dashboard/components/chart-feature-comparison";
import { ChartUserDistribution } from "@/components/blocks/dashboard/components/chart-user-distribution";

// ---------------------------------------------------------------------------
// AnalyticsKpiDashboard
// ---------------------------------------------------------------------------

/**
 * AnalyticsKpiDashboard template component
 *
 * Composes:
 * - Page header with title and description
 * - KPI metrics row (4 cards: Active Users, Feature Adoption, Retention Rate, Avg Session)
 * - Full-width area chart (engagement trend — DAU vs WAU)
 * - Side-by-side bar chart (feature comparison) and pie chart (user distribution)
 */
export function AnalyticsKpiDashboard() {
	return (
		<div className="@container/main flex flex-col gap-6 py-6">
			{/* Page Header */}
			<div className="flex flex-col gap-2 px-4 lg:px-6">
				<h1 className="text-2xl font-semibold text-text">
					Analytics Dashboard
				</h1>
				<p className="text-sm text-text-subtle">
					Key product metrics, engagement trends, and user distribution
				</p>
			</div>

			{/* KPI Metrics Row */}
			<AnalyticsKpiCards />

			{/* Engagement Trend — full width */}
			<div className="grid grid-cols-1 gap-4 px-4 lg:px-6">
				<ChartEngagementTrend />
			</div>

			{/* Feature Comparison + User Distribution — side by side */}
			<div className="grid grid-cols-1 gap-4 px-4 lg:grid-cols-2 lg:px-6">
				<ChartFeatureComparison />
				<ChartUserDistribution />
			</div>
		</div>
	);
}
