"use client";

import { useState, useCallback } from "react";
import { useInventoryStorage } from "@/hooks/use-inventory-storage";
import { SummaryCards } from "@/components/blocks/inventory/components/summary-cards";
import { InventoryTable } from "@/components/blocks/inventory/components/inventory-table";
import { StockCharts } from "@/components/blocks/inventory/components/stock-charts";
import { ActivityLog } from "@/components/blocks/inventory/components/activity-log";
import { ItemDialog } from "@/components/blocks/inventory/components/item-dialog";
import {
	Tabs,
	TabsContent,
	TabsList,
	TabsTrigger,
} from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
	WarehouseIcon,
	RotateCcwIcon,
	ChevronDownIcon,
	ActivityIcon,
} from "lucide-react";
import type { InventoryItem } from "@/lib/inventory-types";

export function InventoryDashboard() {
	const {
		items,
		activityLog,
		isLoading,
		addItem,
		updateItem,
		deleteItem,
		bulkDelete,
		reset,
	} = useInventoryStorage();

	const [dialogOpen, setDialogOpen] = useState(false);
	const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
	const [activityOpen, setActivityOpen] = useState(true);

	const handleAdd = useCallback(() => {
		setEditingItem(null);
		setDialogOpen(true);
	}, []);

	const handleEdit = useCallback((item: InventoryItem) => {
		setEditingItem(item);
		setDialogOpen(true);
	}, []);

	const handleDelete = useCallback(
		(id: string) => {
			deleteItem(id);
		},
		[deleteItem],
	);

	const handleBulkDelete = useCallback(
		(ids: string[]) => {
			bulkDelete(ids);
		},
		[bulkDelete],
	);

	if (isLoading) {
		return (
			<div className="flex min-h-[400px] items-center justify-center">
				<Spinner size="lg" />
			</div>
		);
	}

	return (
		<div className="flex flex-col gap-6 p-4 lg:p-6">
			{/* Header */}
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-3">
					<WarehouseIcon className="text-icon-subtle size-6" />
					<div>
						<h1 className="text-2xl font-bold tracking-tight">
							Inventory Tracker
						</h1>
						<p className="text-muted-foreground text-sm">
							Manage warehouse stock, monitor alerts, and track activity
						</p>
					</div>
				</div>
				<Button variant="outline" size="sm" onClick={reset}>
					<RotateCcwIcon data-icon="inline-start" />
					Reset Data
				</Button>
			</div>

			{/* Summary Cards */}
			<SummaryCards items={items} />

			{/* Main Content Tabs */}
			<Tabs defaultValue="table" className="flex flex-col gap-4">
				<TabsList className="w-fit">
					<TabsTrigger value="table">Inventory Table</TabsTrigger>
					<TabsTrigger value="charts">
						Analytics <Badge className="ml-1">{items.length}</Badge>
					</TabsTrigger>
				</TabsList>

				<TabsContent value="table">
					<InventoryTable
						items={items}
						onEdit={handleEdit}
						onDelete={handleDelete}
						onBulkDelete={handleBulkDelete}
						onAdd={handleAdd}
					/>
				</TabsContent>

				<TabsContent value="charts">
					<StockCharts items={items} />
				</TabsContent>
			</Tabs>

			{/* Activity Log (Collapsible) */}
			<Collapsible open={activityOpen} onOpenChange={setActivityOpen}>
				<CollapsibleTrigger
					render={<Button variant="ghost" className="flex w-full justify-between" />}
				>
					<div className="flex items-center gap-2">
						<ActivityIcon className="size-4" />
						<span>Activity Log</span>
						<Badge variant="outline" className="text-xs">
							{activityLog.length}
						</Badge>
					</div>
					<ChevronDownIcon
						className={`size-4 transition-transform ${activityOpen ? "rotate-180" : ""}`}
					/>
				</CollapsibleTrigger>
				<CollapsibleContent className="mt-2">
					<ActivityLog entries={activityLog} />
				</CollapsibleContent>
			</Collapsible>

			{/* Add/Edit Dialog */}
			<ItemDialog
				open={dialogOpen}
				onOpenChange={setDialogOpen}
				item={editingItem}
				onSave={addItem}
				onUpdate={updateItem}
			/>
		</div>
	);
}
