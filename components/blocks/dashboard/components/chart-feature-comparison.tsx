"use client";

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";

import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import {
	type ChartConfig,
	ChartContainer,
	ChartLegend,
	ChartLegendContent,
	ChartTooltip,
	ChartTooltipContent,
} from "@/components/ui/chart";
import {
	FEATURE_COMPARISON_CHART_CONFIG,
	FEATURE_COMPARISON_DATA,
	formatKpiUserCount,
} from "@/app/data/dashboard-kpi-analytics";

const chartConfig = {
	...FEATURE_COMPARISON_CHART_CONFIG,
} satisfies ChartConfig;

export function ChartFeatureComparison() {
	return (
		<Card className="@container/card">
			<CardHeader>
				<CardTitle>Feature Usage</CardTitle>
				<CardDescription>
					Current vs previous period usage by feature
				</CardDescription>
			</CardHeader>
			<CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
				<ChartContainer
					config={chartConfig}
					className="aspect-auto h-[280px] w-full"
				>
					<BarChart
						data={FEATURE_COMPARISON_DATA}
						margin={{ left: 12, right: 12 }}
					>
						<CartesianGrid vertical={false} />
						<XAxis
							dataKey="feature"
							tickLine={false}
							axisLine={false}
							tickMargin={8}
						/>
						<YAxis
							tickLine={false}
							axisLine={false}
							tickMargin={8}
							tickFormatter={(value: number) => formatKpiUserCount(value)}
						/>
						<ChartTooltip
							cursor={false}
							content={
								<ChartTooltipContent
									indicator="dot"
									formatter={(value) => formatKpiUserCount(value as number)}
								/>
							}
						/>
						<ChartLegend content={<ChartLegendContent />} />
						<Bar
							dataKey="previous"
							fill="var(--color-previous)"
							radius={[4, 4, 0, 0]}
						/>
						<Bar
							dataKey="current"
							fill="var(--color-current)"
							radius={[4, 4, 0, 0]}
						/>
					</BarChart>
				</ChartContainer>
			</CardContent>
		</Card>
	);
}
