import { useEffect, useState, useCallback } from "react";
import type {
	InventoryItem,
	ActivityLogEntry,
	InventoryState,
} from "@/lib/inventory-types";
import {
	SAMPLE_INVENTORY_ITEMS,
	SAMPLE_ACTIVITY_LOG,
} from "@/components/blocks/inventory/data/sample-data";

const STORAGE_KEY = "inventory-state";
const MAX_LOG_ENTRIES = 50;

function getInitialState(): InventoryState {
	return {
		items: SAMPLE_INVENTORY_ITEMS,
		activityLog: SAMPLE_ACTIVITY_LOG,
	};
}

function generateId(): string {
	return `inv-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function generateLogId(): string {
	return `log-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

/**
 * Custom hook for managing inventory state with localStorage persistence.
 *
 * Features:
 * - Automatically persists state to localStorage on updates
 * - Hydrates from localStorage on mount
 * - Falls back to sample data if storage is empty or corrupted
 * - Provides type-safe CRUD methods with automatic activity logging
 * - Handles SSR (no localStorage access on server)
 */
export function useInventoryStorage() {
	const [state, setState] = useState<InventoryState | null>(null);
	const [isLoading, setIsLoading] = useState(true);
	const [error] = useState<string | null>(null);

	// Initialize state from localStorage or fallback to sample data
	if (state === null && isLoading) {
		let initialState = getInitialState();

		if (typeof window !== "undefined") {
			const stored = localStorage.getItem(STORAGE_KEY);
			if (stored) {
				try {
					const parsed = JSON.parse(stored) as InventoryState;
					if (Array.isArray(parsed.items) && Array.isArray(parsed.activityLog)) {
						initialState = parsed;
					}
				} catch (parseError) {
					console.warn("Failed to parse stored inventory state, using defaults:", parseError);
				}
			}
		}

		setState(initialState);
		setIsLoading(false);
	}

	// Persist state to localStorage whenever it changes
	useEffect(() => {
		if (state === null || isLoading) return;

		try {
			if (typeof window === "undefined") return;
			localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
		} catch (err) {
			console.error("Error persisting inventory state to localStorage:", err);
		}
	}, [state, isLoading]);

	const addItem = useCallback(
		(item: Omit<InventoryItem, "id" | "createdAt" | "lastUpdated">) => {
			const now = new Date().toISOString();
			const newItem: InventoryItem = {
				...item,
				id: generateId(),
				createdAt: now,
				lastUpdated: now,
			};
			setState((prev) => {
				if (!prev) return prev;
				const entry: ActivityLogEntry = {
					id: generateLogId(),
					action: "added",
					itemName: newItem.name,
					details: `New item added to ${newItem.category} category`,
					timestamp: now,
				};
				return {
					items: [...prev.items, newItem],
					activityLog: [entry, ...prev.activityLog].slice(0, MAX_LOG_ENTRIES),
				};
			});
		},
		[],
	);

	const updateItem = useCallback(
		(id: string, updates: Partial<Omit<InventoryItem, "id" | "createdAt">>) => {
			setState((prev) => {
				if (!prev) return prev;
				const now = new Date().toISOString();
				const existingItem = prev.items.find((item) => item.id === id);
				if (!existingItem) return prev;

				const updatedItem = { ...existingItem, ...updates, lastUpdated: now };

				const changes: string[] = [];
				if (updates.quantity !== undefined && updates.quantity !== existingItem.quantity) {
					changes.push(`Quantity changed from ${existingItem.quantity} to ${updates.quantity}`);
				}
				if (updates.name !== undefined && updates.name !== existingItem.name) {
					changes.push(`Name changed to "${updates.name}"`);
				}
				if (updates.location !== undefined && updates.location !== existingItem.location) {
					changes.push(`Location changed to ${updates.location}`);
				}
				if (updates.price !== undefined && updates.price !== existingItem.price) {
					changes.push(`Price changed to $${updates.price.toFixed(2)}`);
				}
				if (updates.category !== undefined && updates.category !== existingItem.category) {
					changes.push(`Category changed to ${updates.category}`);
				}

				const detail = changes.length > 0 ? changes.join(", ") : "Item details updated";

				const entry: ActivityLogEntry = {
					id: generateLogId(),
					action: "updated",
					itemName: updatedItem.name,
					details: detail,
					timestamp: now,
				};

				return {
					items: prev.items.map((item) => (item.id === id ? updatedItem : item)),
					activityLog: [entry, ...prev.activityLog].slice(0, MAX_LOG_ENTRIES),
				};
			});
		},
		[],
	);

	const deleteItem = useCallback((id: string) => {
		setState((prev) => {
			if (!prev) return prev;
			const item = prev.items.find((i) => i.id === id);
			if (!item) return prev;

			const entry: ActivityLogEntry = {
				id: generateLogId(),
				action: "deleted",
				itemName: item.name,
				details: `Item removed from inventory`,
				timestamp: new Date().toISOString(),
			};

			return {
				items: prev.items.filter((i) => i.id !== id),
				activityLog: [entry, ...prev.activityLog].slice(0, MAX_LOG_ENTRIES),
			};
		});
	}, []);

	const bulkDelete = useCallback((ids: string[]) => {
		setState((prev) => {
			if (!prev) return prev;
			const now = new Date().toISOString();
			const deletedItems = prev.items.filter((i) => ids.includes(i.id));
			const entries: ActivityLogEntry[] = deletedItems.map((item) => ({
				id: generateLogId(),
				action: "deleted" as const,
				itemName: item.name,
				details: "Item removed from inventory (bulk delete)",
				timestamp: now,
			}));

			return {
				items: prev.items.filter((i) => !ids.includes(i.id)),
				activityLog: [...entries, ...prev.activityLog].slice(0, MAX_LOG_ENTRIES),
			};
		});
	}, []);

	const reset = useCallback(() => {
		try {
			if (typeof window !== "undefined") {
				localStorage.removeItem(STORAGE_KEY);
			}
			setState(getInitialState());
		} catch (err) {
			console.error("Error resetting inventory state:", err);
		}
	}, []);

	return {
		items: state?.items ?? [],
		activityLog: state?.activityLog ?? [],
		isLoading,
		error,
		addItem,
		updateItem,
		deleteItem,
		bulkDelete,
		reset,
	};
}
