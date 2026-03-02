"use client";

import {
	CartesianGrid,
	Line,
	LineChart,
	ReferenceLine,
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
	SPRINT_VELOCITY_DATA,
	VELOCITY_CHART_CONFIG,
} from "@/app/data/dashboard-performance";

const chartConfig = {
	...VELOCITY_CHART_CONFIG,
} satisfies ChartConfig;

export function ChartVelocity() {
	return (
		<Card className="@container/card">
			<CardHeader>
				<CardTitle>Sprint Velocity</CardTitle>
				<CardDescription>
					Story points completed vs committed per sprint
				</CardDescription>
			</CardHeader>
			<CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
				<ChartContainer
					config={chartConfig}
					className="aspect-auto h-[280px] w-full"
				>
					<LineChart
						data={SPRINT_VELOCITY_DATA}
						margin={{ left: 12, right: 12 }}
					>
						<CartesianGrid vertical={false} />
						<XAxis
							dataKey="sprint"
							tickLine={false}
							axisLine={false}
							tickMargin={8}
							tickFormatter={(value: string) => value.replace("Sprint ", "S")}
						/>
						<YAxis
							tickLine={false}
							axisLine={false}
							tickMargin={8}
							domain={[20, "auto"]}
						/>
						<ChartTooltip
							cursor={false}
							content={<ChartTooltipContent indicator="line" />}
						/>
						<ChartLegend content={<ChartLegendContent />} />
						<ReferenceLine
							y={38}
							stroke="var(--color-target)"
							strokeDasharray="5 5"
							strokeOpacity={0.6}
							label={{
								value: "Target (38)",
								position: "insideTopRight",
								fontSize: 11,
								fill: "var(--color-muted-foreground)",
							}}
						/>
						<Line
							dataKey="committed"
							type="monotone"
							stroke="var(--color-committed)"
							strokeWidth={2}
							strokeDasharray="4 4"
							dot={false}
						/>
						<Line
							dataKey="completed"
							type="monotone"
							stroke="var(--color-completed)"
							strokeWidth={2}
							dot={{ fill: "var(--color-completed)", r: 4 }}
							activeDot={{ r: 6 }}
						/>
					</LineChart>
				</ChartContainer>
			</CardContent>
		</Card>
	);
}
