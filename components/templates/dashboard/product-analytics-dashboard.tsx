"use client";

import { ProductKpiCards } from "@/components/blocks/dashboard/components/product-kpi-cards";
import { ChartActiveUsers } from "@/components/blocks/dashboard/components/chart-active-users";
import { ChartFeatureAdoption } from "@/components/blocks/dashboard/components/chart-feature-adoption";
import { ChartUserSegments } from "@/components/blocks/dashboard/components/chart-user-segments";

// ---------------------------------------------------------------------------
// ProductAnalyticsDashboard
// ---------------------------------------------------------------------------

/**
 * ProductAnalyticsDashboard template component
 *
 * Composes:
 * - Page header with title and description
 * - KPI metrics row (4 cards: Active Users, New Signups, Retention Rate, Feature Adoption)
 * - Full-width line chart (monthly active users trend)
 * - Side-by-side bar chart (feature adoption) and pie chart (user segments)
 */
export function ProductAnalyticsDashboard() {
	return (
		<div className="@container/main flex flex-col gap-6 py-6">
			{/* Page Header */}
			<div className="flex flex-col gap-2 px-4 lg:px-6">
				<h1 className="text-2xl font-semibold text-text">
					Product Analytics
				</h1>
				<p className="text-sm text-text-subtle">
					Active users, signups, retention, and feature adoption metrics
				</p>
			</div>

			{/* KPI Metrics Row */}
			<ProductKpiCards />

			{/* Active Users Trend — full width */}
			<div className="grid grid-cols-1 gap-4 px-4 lg:px-6">
				<ChartActiveUsers />
			</div>

			{/* Feature Adoption + User Segments — side by side */}
			<div className="grid grid-cols-1 gap-4 px-4 lg:grid-cols-2 lg:px-6">
				<ChartFeatureAdoption />
				<ChartUserSegments />
			</div>
		</div>
	);
}
