import { ProductAnalyticsDashboard } from "@/components/templates/dashboard/product-analytics-dashboard";

export const metadata = {
	title: "Product Analytics",
	description:
		"Active users, signups, retention, and feature adoption metrics",
};

export default function DashboardPage() {
	return <ProductAnalyticsDashboard />;
}
