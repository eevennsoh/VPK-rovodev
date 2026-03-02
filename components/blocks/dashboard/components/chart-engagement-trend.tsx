"use client";

import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";

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
	ENGAGEMENT_TREND_CHART_CONFIG,
	ENGAGEMENT_TREND_DATA,
	formatKpiUserCount,
} from "@/app/data/dashboard-kpi-analytics";

const chartConfig = {
	...ENGAGEMENT_TREND_CHART_CONFIG,
} satisfies ChartConfig;

export function ChartEngagementTrend() {
	return (
		<Card className="@container/card">
			<CardHeader>
				<CardTitle>Engagement Trend</CardTitle>
				<CardDescription>
					Daily and weekly active users over the last 12 months
				</CardDescription>
			</CardHeader>
			<CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
				<ChartContainer
					config={chartConfig}
					className="aspect-auto h-[280px] w-full"
				>
					<AreaChart
						data={ENGAGEMENT_TREND_DATA}
						margin={{ left: 12, right: 12 }}
					>
						<defs>
							<linearGradient id="fillDailyActive" x1="0" y1="0" x2="0" y2="1">
								<stop
									offset="5%"
									stopColor="var(--color-dailyActive)"
									stopOpacity={0.8}
								/>
								<stop
									offset="95%"
									stopColor="var(--color-dailyActive)"
									stopOpacity={0.1}
								/>
							</linearGradient>
							<linearGradient id="fillWeeklyActive" x1="0" y1="0" x2="0" y2="1">
								<stop
									offset="5%"
									stopColor="var(--color-weeklyActive)"
									stopOpacity={0.8}
								/>
								<stop
									offset="95%"
									stopColor="var(--color-weeklyActive)"
									stopOpacity={0.1}
								/>
							</linearGradient>
						</defs>
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
						<Area
							dataKey="weeklyActive"
							type="monotone"
							fill="url(#fillWeeklyActive)"
							stroke="var(--color-weeklyActive)"
							stackId="a"
						/>
						<Area
							dataKey="dailyActive"
							type="monotone"
							fill="url(#fillDailyActive)"
							stroke="var(--color-dailyActive)"
							stackId="b"
						/>
					</AreaChart>
				</ChartContainer>
			</CardContent>
		</Card>
	);
}
