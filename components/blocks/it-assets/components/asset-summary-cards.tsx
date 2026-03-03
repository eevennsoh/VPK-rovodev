"use client";

import { useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import {
	Card,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import {
	MonitorIcon,
	UserCheckIcon,
	PackageCheckIcon,
	WrenchIcon,
} from "lucide-react";
import type { ITAsset } from "@/lib/it-asset-types";

interface AssetSummaryCardsProps {
	assets: ITAsset[];
}

export function AssetSummaryCards({ assets }: AssetSummaryCardsProps) {
	const stats = useMemo(() => {
		const total = assets.length;
		const assigned = assets.filter((a) => a.status === "assigned").length;
		const available = assets.filter((a) => a.status === "in-stock").length;
		const inRepair = assets.filter((a) => a.status === "in-repair").length;
		const procurement = assets.filter(
			(a) => a.status === "procurement",
		).length;
		const decommissioned = assets.filter(
			(a) => a.status === "decommissioned",
		).length;
		const disposed = assets.filter((a) => a.status === "disposed").length;
		const hardware = assets.filter(
			(a) => a.category === "Hardware",
		).length;
		const software = assets.filter(
			(a) => a.category === "Software",
		).length;

		return {
			total,
			assigned,
			available,
			inRepair,
			procurement,
			decommissioned,
			disposed,
			hardware,
			software,
		};
	}, [assets]);

	const cards = [
		{
			title: "Total Assets",
			value: stats.total.toLocaleString(),
			icon: MonitorIcon,
			badge: `${stats.hardware} HW · ${stats.software} SW`,
			footer: `${stats.procurement} in procurement, ${stats.decommissioned + stats.disposed} retired`,
			variant: "outline" as const,
		},
		{
			title: "Assigned",
			value: stats.assigned.toLocaleString(),
			icon: UserCheckIcon,
			badge: `${stats.total > 0 ? Math.round((stats.assigned / stats.total) * 100) : 0}% utilization`,
			footer: "Currently checked out to employees",
			variant: "outline" as const,
		},
		{
			title: "Available",
			value: stats.available.toLocaleString(),
			icon: PackageCheckIcon,
			badge: "In Stock",
			footer: "Ready for assignment",
			variant: stats.available === 0 ? ("destructive" as const) : ("outline" as const),
		},
		{
			title: "In Repair",
			value: stats.inRepair.toLocaleString(),
			icon: WrenchIcon,
			badge: stats.inRepair > 0 ? "Needs attention" : "All clear",
			footer: "Assets currently being serviced",
			variant: stats.inRepair > 0 ? ("warning" as const) : ("outline" as const),
		},
	];

	return (
		<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
			{cards.map((card) => {
				const IconComponent = card.icon;
				return (
					<Card key={card.title}>
						<CardHeader className="relative">
							<CardDescription>{card.title}</CardDescription>
							<CardTitle className="text-2xl font-semibold tabular-nums xl:text-3xl">
								{card.value}
							</CardTitle>
							<div className="absolute right-4 top-4">
								<Badge
									variant={card.variant === "outline" ? "outline" : card.variant}
									className="flex gap-1 rounded-lg text-xs"
								>
									<IconComponent className="size-3" />
									{card.badge}
								</Badge>
							</div>
						</CardHeader>
						<CardFooter className="text-muted-foreground text-sm">
							{card.footer}
						</CardFooter>
					</Card>
				);
			})}
		</div>
	);
}
