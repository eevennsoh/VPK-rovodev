/**
 * Inventory Tracking System Types
 * Data models for warehouse inventory management with CRUD, alerts, and analytics
 */

export type InventoryCategory =
	| "Electronics"
	| "Hardware"
	| "Safety"
	| "Packaging"
	| "Office Supplies";

export const INVENTORY_CATEGORIES: InventoryCategory[] = [
	"Electronics",
	"Hardware",
	"Safety",
	"Packaging",
	"Office Supplies",
];

export type StockStatus = "in-stock" | "low-stock" | "out-of-stock";

export interface InventoryItem {
	id: string;
	name: string;
	sku: string;
	category: InventoryCategory;
	quantity: number;
	minStock: number;
	location: string;
	unit: string;
	price: number;
	lastUpdated: string;
	createdAt: string;
}

export type ActivityAction = "added" | "updated" | "deleted";

export interface ActivityLogEntry {
	id: string;
	action: ActivityAction;
	itemName: string;
	details: string;
	timestamp: string;
}

export interface InventoryState {
	items: InventoryItem[];
	activityLog: ActivityLogEntry[];
}

/** Derive stock status from an item's quantity relative to its minStock threshold */
export function getStockStatus(item: InventoryItem): StockStatus {
	if (item.quantity === 0) return "out-of-stock";
	if (item.quantity <= item.minStock) return "low-stock";
	return "in-stock";
}

/** Get a human-readable label for a stock status */
export function getStockStatusLabel(status: StockStatus): string {
	switch (status) {
		case "in-stock":
			return "In Stock";
		case "low-stock":
			return "Low Stock";
		case "out-of-stock":
			return "Out of Stock";
	}
}
