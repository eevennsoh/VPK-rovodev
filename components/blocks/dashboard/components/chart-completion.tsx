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
	COMPLETION_CHART_CONFIG,
	TASK_COMPLETION_DATA,
	getTotalTasksCompleted,
} from "@/app/data/dashboard-performance";

const chartConfig = {
	...COMPLETION_CHART_CONFIG,
} satisfies ChartConfig;

export function ChartCompletion() {
	const totalTasks = getTotalTasksCompleted();

	return (
		<Card className="@container/card">
			<CardHeader>
				<CardTitle>Task Completion</CardTitle>
				<CardDescription>
					{totalTasks} tasks completed over 6 months by category
				</CardDescription>
			</CardHeader>
			<CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
				<ChartContainer
					config={chartConfig}
					className="aspect-auto h-[280px] w-full"
				>
					<BarChart
						data={TASK_COMPLETION_DATA}
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
						<YAxis tickLine={false} axisLine={false} tickMargin={8} />
						<ChartTooltip content={<ChartTooltipContent indicator="dot" />} />
						<ChartLegend content={<ChartLegendContent />} />
						<Bar
							dataKey="features"
							stackId="a"
							fill="var(--color-features)"
							radius={[0, 0, 0, 0]}
						/>
						<Bar
							dataKey="bugs"
							stackId="a"
							fill="var(--color-bugs)"
							radius={[0, 0, 0, 0]}
						/>
						<Bar
							dataKey="chores"
							stackId="a"
							fill="var(--color-chores)"
							radius={[4, 4, 0, 0]}
						/>
					</BarChart>
				</ChartContainer>
			</CardContent>
		</Card>
	);
}
