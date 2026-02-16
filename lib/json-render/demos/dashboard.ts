import type { Spec } from "@json-render/react";

export const dashboardSpec: Spec = {
	root: "root",
	state: {
		metrics: {
			revenue: "$48,250",
			revenueChange: "+12.5%",
			users: "2,847",
			usersChange: "+8.2%",
			orders: "1,024",
			ordersChange: "-3.1%",
			conversion: "3.6%",
			conversionChange: "+0.4%",
		},
		salesData: [
			{ month: "Jan", sales: 4200, returns: 300 },
			{ month: "Feb", sales: 3800, returns: 280 },
			{ month: "Mar", sales: 5100, returns: 350 },
			{ month: "Apr", sales: 4700, returns: 420 },
			{ month: "May", sales: 5800, returns: 310 },
			{ month: "Jun", sales: 6200, returns: 290 },
		],
		recentOrders: [
			{ orderId: "#1001", customer: "Alice Johnson", plan: "Pro Plan", amount: "$99.00", status: "Completed" },
			{ orderId: "#1002", customer: "Bob Smith", plan: "Enterprise", amount: "$249.00", status: "Processing" },
			{ orderId: "#1003", customer: "Carol White", plan: "Starter", amount: "$29.00", status: "Completed" },
			{ orderId: "#1004", customer: "Dave Brown", plan: "Pro Plan", amount: "$99.00", status: "Pending" },
			{ orderId: "#1005", customer: "Eve Davis", plan: "Enterprise", amount: "$249.00", status: "Completed" },
		],
	},
	elements: {
		root: {
			type: "Stack",
			props: { direction: "vertical", gap: "lg" },
			children: ["heading", "metricsGrid", "chartCard", "tableCard"],
		},
		heading: {
			type: "Heading",
			props: { level: "h2", text: "Analytics Dashboard" },
		},
		metricsGrid: {
			type: "Grid",
			props: { columns: "4", gap: "md" },
			children: ["metricRevenue", "metricUsers", "metricOrders", "metricConversion"],
		},
		metricRevenue: {
			type: "Metric",
			props: {
				label: "Revenue",
				value: { $state: "/metrics/revenue" } as unknown as string,
				detail: { $state: "/metrics/revenueChange" } as unknown as string,
				trend: "up",
			},
		},
		metricUsers: {
			type: "Metric",
			props: {
				label: "Active Users",
				value: { $state: "/metrics/users" } as unknown as string,
				detail: { $state: "/metrics/usersChange" } as unknown as string,
				trend: "up",
			},
		},
		metricOrders: {
			type: "Metric",
			props: {
				label: "Orders",
				value: { $state: "/metrics/orders" } as unknown as string,
				detail: { $state: "/metrics/ordersChange" } as unknown as string,
				trend: "down",
			},
		},
		metricConversion: {
			type: "Metric",
			props: {
				label: "Conversion Rate",
				value: { $state: "/metrics/conversion" } as unknown as string,
				detail: { $state: "/metrics/conversionChange" } as unknown as string,
				trend: "up",
			},
		},
		chartCard: {
			type: "Card",
			props: { title: "Monthly Sales vs Returns" },
			children: ["barChart"],
		},
		barChart: {
			type: "BarChart",
			props: {
				data: { $state: "/salesData" } as unknown as Record<string, unknown>[],
				xKey: "month",
				yKey: "sales",
			},
		},
		tableCard: {
			type: "Card",
			props: { title: "Recent Orders" },
			children: ["ordersTable"],
		},
		ordersTable: {
			type: "Table",
			props: {
				data: { $state: "/recentOrders" } as unknown as Record<string, unknown>[],
				columns: [
					{ key: "orderId", label: "Order ID" },
					{ key: "customer", label: "Customer" },
					{ key: "plan", label: "Plan" },
					{ key: "amount", label: "Amount" },
					{ key: "status", label: "Status" },
				],
			},
		},
	},
};
