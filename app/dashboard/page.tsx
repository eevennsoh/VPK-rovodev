import { AnalyticsKpiDashboard } from "@/components/templates/dashboard/analytics-kpi-dashboard";

export const metadata = {
	title: "Analytics Dashboard",
	description:
		"Key product metrics, engagement trends, and user distribution",
};

export default function DashboardPage() {
	return <AnalyticsKpiDashboard />;
}
