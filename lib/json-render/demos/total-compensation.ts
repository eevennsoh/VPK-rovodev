import type { Spec } from "@json-render/react";

/**
 * Q1 Demo: "How is my total compensation and benefits package structured?"
 *
 * Tabbed UI with distinct tab content, at least one chart + one table.
 * Uses Tabs, TabContent, PieChart, BarChart, Table components.
 */
export const totalCompensationSpec: Spec = {
	root: "root",
	state: {
		compensationData: [
			{ category: "Base Salary", amount: 130000 },
			{ category: "Annual Bonus", amount: 26000 },
			{ category: "Equity (RSUs)", amount: 40000 },
			{ category: "Health Benefits", amount: 12000 },
			{ category: "Retirement Match", amount: 6500 },
			{ category: "Other Benefits", amount: 5500 },
		],
		benefitsBreakdown: [
			{ benefit: "Medical Insurance", coverage: "Employee + Family", monthlyValue: 650, annualValue: 7800 },
			{ benefit: "Dental Insurance", coverage: "Employee + Family", monthlyValue: 85, annualValue: 1020 },
			{ benefit: "Vision Insurance", coverage: "Employee", monthlyValue: 25, annualValue: 300 },
			{ benefit: "Life Insurance", coverage: "2x Salary", monthlyValue: 45, annualValue: 540 },
			{ benefit: "Disability Insurance", coverage: "60% Salary", monthlyValue: 65, annualValue: 780 },
			{ benefit: "Wellness Stipend", coverage: "Annual", monthlyValue: 130, annualValue: 1560 },
		],
		equitySchedule: [
			{ year: "Year 1", vested: 10000, cumulative: 10000 },
			{ year: "Year 2", vested: 10000, cumulative: 20000 },
			{ year: "Year 3", vested: 10000, cumulative: 30000 },
			{ year: "Year 4", vested: 10000, cumulative: 40000 },
		],
	},
	elements: {
		root: {
			type: "Stack",
			props: { direction: "vertical", gap: "lg" },
			children: ["heading", "description", "summaryMetrics", "tabs"],
		},
		heading: {
			type: "Heading",
			props: { text: "Total Compensation Overview", level: "h2" },
		},
		description: {
			type: "Text",
			props: {
				content: "Your total compensation package is valued at $220,000 annually, including base salary, bonus, equity, and benefits.",
			},
		},
		summaryMetrics: {
			type: "Stack",
			props: { direction: "horizontal", gap: "md" },
			children: ["metricTotal", "metricBase", "metricEquity"],
		},
		metricTotal: {
			type: "Metric",
			props: { label: "Total Compensation", value: "$220,000", detail: "Annual package value", trend: null },
		},
		metricBase: {
			type: "Metric",
			props: { label: "Base Salary", value: "$130,000", detail: "59% of total", trend: null },
		},
		metricEquity: {
			type: "Metric",
			props: { label: "Equity (4-yr)", value: "$40,000", detail: "$10,000 vesting annually", trend: "up" },
		},
		tabs: {
			type: "Tabs",
			props: {
				tabs: [
					{ value: "breakdown", label: "Compensation Breakdown" },
					{ value: "benefits", label: "Benefits Details" },
					{ value: "equity", label: "Equity Schedule" },
				],
				defaultValue: "breakdown",
			},
			children: ["breakdownTab", "benefitsTab", "equityTab"],
		},
		breakdownTab: {
			type: "TabContent",
			props: { value: "breakdown" },
			children: ["breakdownContent"],
		},
		breakdownContent: {
			type: "Stack",
			props: { direction: "vertical", gap: "md" },
			children: ["breakdownChart", "breakdownTable"],
		},
		breakdownChart: {
			type: "PieChart",
			props: {
				title: "Compensation Distribution",
				data: { $state: "/compensationData" } as unknown as Record<string, unknown>[],
				nameKey: "category",
				valueKey: "amount",
			},
		},
		breakdownTable: {
			type: "Table",
			props: {
				data: { $state: "/compensationData" } as unknown as Record<string, unknown>[],
				columns: [
					{ key: "category", label: "Category" },
					{ key: "amount", label: "Annual Amount ($)" },
				],
			},
		},
		benefitsTab: {
			type: "TabContent",
			props: { value: "benefits" },
			children: ["benefitsContent"],
		},
		benefitsContent: {
			type: "Stack",
			props: { direction: "vertical", gap: "md" },
			children: ["benefitsChart", "benefitsTable"],
		},
		benefitsChart: {
			type: "BarChart",
			props: {
				title: "Monthly Benefits Value",
				data: { $state: "/benefitsBreakdown" } as unknown as Record<string, unknown>[],
				xKey: "benefit",
				yKey: "monthlyValue",
			},
		},
		benefitsTable: {
			type: "Table",
			props: {
				data: { $state: "/benefitsBreakdown" } as unknown as Record<string, unknown>[],
				columns: [
					{ key: "benefit", label: "Benefit" },
					{ key: "coverage", label: "Coverage" },
					{ key: "monthlyValue", label: "Monthly ($)" },
					{ key: "annualValue", label: "Annual ($)" },
				],
			},
		},
		equityTab: {
			type: "TabContent",
			props: { value: "equity" },
			children: ["equityContent"],
		},
		equityContent: {
			type: "Stack",
			props: { direction: "vertical", gap: "md" },
			children: ["equityChart", "equityTable"],
		},
		equityChart: {
			type: "BarChart",
			props: {
				title: "Cumulative Equity Vesting",
				data: { $state: "/equitySchedule" } as unknown as Record<string, unknown>[],
				xKey: "year",
				yKey: "cumulative",
				color: "var(--color-chart-3)",
			},
		},
		equityTable: {
			type: "Table",
			props: {
				data: { $state: "/equitySchedule" } as unknown as Record<string, unknown>[],
				columns: [
					{ key: "year", label: "Year" },
					{ key: "vested", label: "Vested ($)" },
					{ key: "cumulative", label: "Cumulative ($)" },
				],
			},
		},
	},
};
