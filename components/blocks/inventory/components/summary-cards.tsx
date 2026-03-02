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
	PackageIcon,
	AlertTriangleIcon,
	TagIcon,
	DollarSignIcon,
} from "lucide-react";
import type { InventoryItem } from "@/lib/inventory-types";
import { getStockStatus } from "@/lib/inventory-types";

interface SummaryCardsProps {
	items: InventoryItem[];
}

export function SummaryCards({ items }: SummaryCardsProps) {
	const stats = useMemo(() => {
		const totalItems = items.length;
		const lowStockCount = items.filter(
			(item) => getStockStatus(item) === "low-stock",
		).length;
		const outOfStockCount = items.filter(
			(item) => getStockStatus(item) === "out-of-stock",
		).length;
		const alertCount = lowStockCount + outOfStockCount;
		const categories = new Set(items.map((item) => item.category)).size;
		const totalValue = items.reduce(
			(sum, item) => sum + item.price * item.quantity,
			0,
		);

		return { totalItems, alertCount, lowStockCount, outOfStockCount, categories, totalValue };
	}, [items]);

	const cards = [
		{
			title: "Total Items",
			value: stats.totalItems.toLocaleString(),
			icon: PackageIcon,
			badge: `${items.reduce((sum, i) => sum + i.quantity, 0).toLocaleString()} units`,
			footer: "Unique SKUs in warehouse",
			variant: "default" as const,
		},
		{
			title: "Stock Alerts",
			value: stats.alertCount.toLocaleString(),
			icon: AlertTriangleIcon,
			badge: `${stats.outOfStockCount} out of stock`,
			footer: `${stats.lowStockCount} low stock, ${stats.outOfStockCount} out of stock`,
			variant: stats.alertCount > 0 ? ("destructive" as const) : ("default" as const),
		},
		{
			title: "Categories",
			value: stats.categories.toLocaleString(),
			icon: TagIcon,
			badge: "Active",
			footer: "Product categories tracked",
			variant: "default" as const,
		},
		{
			title: "Total Value",
			value: `$${stats.totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
			icon: DollarSignIcon,
			badge: "Inventory value",
			footer: "Based on current stock × unit price",
			variant: "default" as const,
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
									variant={card.variant === "destructive" ? "destructive" : "outline"}
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
