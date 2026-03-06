"use client";

import { PerformanceCards } from "@/components/blocks/dashboard/components/performance-cards";
import { ChartVelocity } from "@/components/blocks/dashboard/components/chart-velocity";
import { ChartCompletion } from "@/components/blocks/dashboard/components/chart-completion";

// ---------------------------------------------------------------------------
// AnalyticsDashboard
// ---------------------------------------------------------------------------

/**
 * AnalyticsDashboard template component
 *
 * Composes:
 * - Page header with title and description
 * - KPI metrics row (4 cards: Avg Velocity, Completion Rate, Open Issues, Cycle Time)
 * - Chart grid with line chart (sprint velocity) and bar chart (task completion)
 */
export function AnalyticsDashboard() {
	return (
		<div className="@container/main flex flex-col gap-6 py-6">
			{/* Page Header */}
			<div className="flex flex-col gap-2 px-4 lg:px-6">
				<h1 className="text-2xl font-semibold text-text">
					Performance Dashboard
				</h1>
				<p className="text-sm text-text-subtle">
					Sprint velocity, task completion, and team performance metrics
				</p>
			</div>

			{/* KPI Metrics Row */}
			<PerformanceCards />

			{/* Charts Grid */}
			<div className="grid grid-cols-1 gap-4 px-4 lg:grid-cols-2 lg:px-6">
				<ChartVelocity />
				<ChartCompletion />
			</div>
		</div>
	);
}
