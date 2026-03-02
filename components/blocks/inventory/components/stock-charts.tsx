"use client";

import { useMemo } from "react";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Pie, PieChart } from "recharts";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import {
	ChartContainer,
	ChartTooltip,
	ChartTooltipContent,
	type ChartConfig,
} from "@/components/ui/chart";
import type { InventoryItem } from "@/lib/inventory-types";
import { getStockStatus, getStockStatusLabel, INVENTORY_CATEGORIES } from "@/lib/inventory-types";

interface StockChartsProps {
	items: InventoryItem[];
}

const barChartConfig = {
	totalQuantity: {
		label: "Total Units",
		color: "var(--color-chart-1)",
	},
	itemCount: {
		label: "Item Count",
		color: "var(--color-chart-2)",
	},
} satisfies ChartConfig;

const pieChartConfig = {
	count: {
		label: "Items",
	},
	"in-stock": {
		label: "In Stock",
		color: "var(--color-chart-1)",
	},
	"low-stock": {
		label: "Low Stock",
		color: "var(--color-chart-4)",
	},
	"out-of-stock": {
		label: "Out of Stock",
		color: "var(--color-chart-5)",
	},
} satisfies ChartConfig;

export function StockCharts({ items }: StockChartsProps) {
	const barData = useMemo(() => {
		return INVENTORY_CATEGORIES.map((category) => {
			const categoryItems = items.filter((item) => item.category === category);
			return {
				category,
				totalQuantity: categoryItems.reduce((sum, item) => sum + item.quantity, 0),
				itemCount: categoryItems.length,
			};
		});
	}, [items]);

	const pieData = useMemo(() => {
		const statusCounts = { "in-stock": 0, "low-stock": 0, "out-of-stock": 0 };
		for (const item of items) {
			statusCounts[getStockStatus(item)]++;
		}
		return Object.entries(statusCounts)
			.filter(([, count]) => count > 0)
			.map(([status, count]) => ({
				status,
				label: getStockStatusLabel(status as keyof typeof statusCounts),
				count,
				fill: `var(--color-${status})`,
			}));
	}, [items]);

	return (
		<div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
			<Card>
				<CardHeader>
					<CardTitle>Stock by Category</CardTitle>
					<CardDescription>Total units per inventory category</CardDescription>
				</CardHeader>
				<CardContent>
					<ChartContainer config={barChartConfig}>
						<BarChart accessibilityLayer data={barData}>
							<CartesianGrid vertical={false} />
							<XAxis
								dataKey="category"
								tickLine={false}
								tickMargin={10}
								axisLine={false}
								tickFormatter={(value) =>
									value.length > 10 ? `${value.slice(0, 10)}…` : value
								}
							/>
							<YAxis tickLine={false} axisLine={false} />
							<ChartTooltip
								cursor={false}
								content={<ChartTooltipContent />}
							/>
							<Bar
								dataKey="totalQuantity"
								fill="var(--color-totalQuantity)"
								radius={[4, 4, 0, 0]}
							/>
						</BarChart>
					</ChartContainer>
				</CardContent>
			</Card>

			<Card className="flex flex-col">
				<CardHeader className="items-center pb-0">
					<CardTitle>Stock Status</CardTitle>
					<CardDescription>Items by stock level</CardDescription>
				</CardHeader>
				<CardContent className="flex-1 pb-0">
					<ChartContainer
						config={pieChartConfig}
						className="mx-auto aspect-square max-h-[250px]"
					>
						<PieChart>
							<ChartTooltip
								cursor={false}
								content={<ChartTooltipContent hideLabel />}
							/>
							<Pie
								data={pieData}
								dataKey="count"
								nameKey="status"
								label={({ name, value }) => `${name}: ${value}`}
								labelLine={false}
							/>
						</PieChart>
					</ChartContainer>
				</CardContent>
			</Card>
		</div>
	);
}
