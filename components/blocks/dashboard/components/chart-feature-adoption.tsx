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
	ChartTooltip,
	ChartTooltipContent,
} from "@/components/ui/chart";
import {
	FEATURE_ADOPTION_CHART_CONFIG,
	FEATURE_ADOPTION_DATA,
	getAverageAdoptionRate,
} from "@/app/data/dashboard-product";

const chartConfig = {
	...FEATURE_ADOPTION_CHART_CONFIG,
} satisfies ChartConfig;

export function ChartFeatureAdoption() {
	const avgRate = getAverageAdoptionRate();

	return (
		<Card className="@container/card">
			<CardHeader>
				<CardTitle>Feature Adoption</CardTitle>
				<CardDescription>
					Adoption rate by feature — {avgRate}% average across all features
				</CardDescription>
			</CardHeader>
			<CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
				<ChartContainer
					config={chartConfig}
					className="aspect-auto h-[280px] w-full"
				>
					<BarChart
						data={FEATURE_ADOPTION_DATA}
						layout="vertical"
						margin={{ left: 24, right: 12 }}
					>
						<CartesianGrid horizontal={false} />
						<YAxis
							dataKey="feature"
							type="category"
							tickLine={false}
							axisLine={false}
							tickMargin={8}
							width={90}
						/>
						<XAxis
							type="number"
							tickLine={false}
							axisLine={false}
							tickMargin={8}
							tickFormatter={(value: number) => `${value}%`}
							domain={[0, 100]}
						/>
						<ChartTooltip
							cursor={false}
							content={
								<ChartTooltipContent
									hideLabel
									formatter={(value) => `${value}%`}
								/>
							}
						/>
						<Bar
							dataKey="adoptionRate"
							radius={[0, 4, 4, 0]}
							fill="var(--color-chart-1)"
						/>
					</BarChart>
				</ChartContainer>
			</CardContent>
		</Card>
	);
}
