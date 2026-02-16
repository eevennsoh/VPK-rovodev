import type { Spec } from "@json-render/react";

export const dataVizSpec: Spec = {
	root: "root",
	state: {
		barData: [
			{ category: "Electronics", q1: 4500, q2: 5200, q3: 4800, q4: 6100 },
			{ category: "Clothing", q1: 3200, q2: 3800, q3: 4100, q4: 3900 },
			{ category: "Food", q1: 2800, q2: 3100, q3: 2900, q4: 3400 },
			{ category: "Books", q1: 1200, q2: 1400, q3: 1300, q4: 1600 },
			{ category: "Home", q1: 2100, q2: 2500, q3: 2300, q4: 2800 },
		],
		lineData: [
			{ day: "Mon", pageViews: 1200, uniqueVisitors: 800, bounceRate: 42 },
			{ day: "Tue", pageViews: 1800, uniqueVisitors: 1100, bounceRate: 38 },
			{ day: "Wed", pageViews: 2200, uniqueVisitors: 1500, bounceRate: 35 },
			{ day: "Thu", pageViews: 1900, uniqueVisitors: 1200, bounceRate: 40 },
			{ day: "Fri", pageViews: 2500, uniqueVisitors: 1700, bounceRate: 32 },
			{ day: "Sat", pageViews: 1600, uniqueVisitors: 900, bounceRate: 45 },
			{ day: "Sun", pageViews: 1400, uniqueVisitors: 750, bounceRate: 48 },
		],
		pieData: [
			{ name: "Direct", value: 4000 },
			{ name: "Organic Search", value: 3200 },
			{ name: "Social Media", value: 2800 },
			{ name: "Email", value: 1800 },
			{ name: "Referral", value: 1200 },
		],
	},
	elements: {
		root: {
			type: "Stack",
			props: { direction: "vertical", gap: "lg" },
			children: ["heading", "description", "tabs"],
		},
		heading: {
			type: "Heading",
			props: { level: "h2", text: "Data Visualization Gallery" },
		},
		description: {
			type: "Text",
			props: {
				content: "Interactive charts rendered from JSON specs using Recharts. Switch tabs to explore different visualization types.",
			},
		},
		tabs: {
			type: "Tabs",
			props: {
				tabs: [
					{ value: "bar-chart", label: "Bar Chart" },
					{ value: "line-chart", label: "Line Chart" },
					{ value: "pie-chart", label: "Pie Chart" },
				],
				defaultValue: "bar-chart",
			},
			children: ["barTab", "lineTab", "pieTab"],
		},
		barTab: {
			type: "TabContent",
			props: { value: "bar-chart" },
			children: ["barCard"],
		},
		barCard: {
			type: "Card",
			props: { title: "Quarterly Sales by Category", description: "Grouped bar chart comparing Q1–Q4 performance" },
			children: ["barChart"],
		},
		barChart: {
			type: "BarChart",
			props: {
				data: { $state: "barData" } as unknown as Record<string, unknown>[],
				xKey: "category",
				yKey: "q1",
			},
		},
		lineTab: {
			type: "TabContent",
			props: { value: "line-chart" },
			children: ["lineCard"],
		},
		lineCard: {
			type: "Card",
			props: { title: "Weekly Traffic Trends", description: "Multi-line chart tracking page views, visitors, and bounce rate" },
			children: ["lineChart"],
		},
		lineChart: {
			type: "LineChart",
			props: {
				data: { $state: "lineData" } as unknown as Record<string, unknown>[],
				xKey: "day",
				yKey: "pageViews",
			},
		},
		pieTab: {
			type: "TabContent",
			props: { value: "pie-chart" },
			children: ["pieCard"],
		},
		pieCard: {
			type: "Card",
			props: { title: "Traffic Sources", description: "Distribution of site traffic by acquisition channel" },
			children: ["pieChart"],
		},
		pieChart: {
			type: "PieChart",
			props: {
				data: { $state: "pieData" } as unknown as { name: string; value: number }[],
				nameKey: "name",
				valueKey: "value",
			},
		},
	},
};
