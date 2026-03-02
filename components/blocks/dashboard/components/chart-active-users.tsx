"use client";

import {
	CartesianGrid,
	Line,
	LineChart,
	XAxis,
	YAxis,
} from "recharts";

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
	ACTIVE_USERS_CHART_CONFIG,
	ACTIVE_USERS_TREND_DATA,
	formatUserCount,
} from "@/app/data/dashboard-product";

const chartConfig = {
	...ACTIVE_USERS_CHART_CONFIG,
} satisfies ChartConfig;

export function ChartActiveUsers() {
	return (
		<Card className="@container/card">
			<CardHeader>
				<CardTitle>Monthly Active Users</CardTitle>
				<CardDescription>
					Active users over the last 12 months vs previous year
				</CardDescription>
			</CardHeader>
			<CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
				<ChartContainer
					config={chartConfig}
					className="aspect-auto h-[280px] w-full"
				>
					<LineChart
						data={ACTIVE_USERS_TREND_DATA}
						margin={{ left: 12, right: 12 }}
					>
						<CartesianGrid vertical={false} />
						<XAxis
							dataKey="month"
							tickLine={false}
							axisLine={false}
							tickMargin={8}
							tickFormatter={(value: string) => value.slice(0, 3)}
						/>
						<YAxis
							tickLine={false}
							axisLine={false}
							tickMargin={8}
							tickFormatter={(value: number) => formatUserCount(value)}
						/>
						<ChartTooltip
							cursor={false}
							content={
								<ChartTooltipContent
									indicator="line"
									formatter={(value) => formatUserCount(value as number)}
								/>
							}
						/>
						<ChartLegend content={<ChartLegendContent />} />
						<Line
							dataKey="previousYear"
							type="monotone"
							stroke="var(--color-previousYear)"
							strokeWidth={2}
							strokeDasharray="4 4"
							dot={false}
						/>
						<Line
							dataKey="activeUsers"
							type="monotone"
							stroke="var(--color-activeUsers)"
							strokeWidth={2}
							dot={{ fill: "var(--color-activeUsers)", r: 4 }}
							activeDot={{ r: 6 }}
						/>
					</LineChart>
				</ChartContainer>
			</CardContent>
		</Card>
	);
}
