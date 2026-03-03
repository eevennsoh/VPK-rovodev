import { useEffect, useState, useCallback } from "react";
import type {
	ITAsset,
	ITAssetState,
	ITAssetStatus,
	ITAssetActivityEntry,
	ITAssetActivityAction,
	AssignmentRecord,
	ITDepartment,
} from "@/lib/it-asset-types";
import {
	getAssetCategory,
	getITAssetStatusLabel,
	isValidStatusTransition,
} from "@/lib/it-asset-types";
import { SEED_IT_ASSET_STATE } from "@/lib/it-asset-seed-data";

const STORAGE_KEY = "it-asset-state";
const MAX_LOG_ENTRIES = 100;

function getInitialState(): ITAssetState {
	return {
		assets: SEED_IT_ASSET_STATE.assets,
		activityLog: SEED_IT_ASSET_STATE.activityLog,
	};
}

function generateId(): string {
	return `ita-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function generateLogId(): string {
	return `act-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function generateRecordId(): string {
	return `ar-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function createActivityEntry(
	action: ITAssetActivityAction,
	asset: { id: string; name: string },
	details: string,
): ITAssetActivityEntry {
	return {
		id: generateLogId(),
		action,
		assetId: asset.id,
		assetName: asset.name,
		details,
		timestamp: new Date().toISOString(),
	};
}

/**
 * Custom hook for managing IT asset state with localStorage persistence.
 *
 * Features:
 * - Automatically persists state to localStorage on updates
 * - Hydrates from localStorage on mount
 * - Falls back to seed data if storage is empty or corrupted
 * - Provides type-safe CRUD methods with automatic activity logging
 * - Check-in / check-out with assignment history tracking
 * - Status transition validation
 * - Bulk operations (delete)
 * - Handles SSR (no localStorage access on server)
 */
export function useITAssetStorage() {
	const [state, setState] = useState<ITAssetState | null>(null);
	const [isLoading, setIsLoading] = useState(true);

	// Initialize state from localStorage or fallback to seed data
	if (state === null && isLoading) {
		let initialState = getInitialState();

		if (typeof window !== "undefined") {
			const stored = localStorage.getItem(STORAGE_KEY);
			if (stored) {
				try {
					const parsed = JSON.parse(stored) as ITAssetState;
					if (
						Array.isArray(parsed.assets) &&
						Array.isArray(parsed.activityLog)
					) {
						initialState = parsed;
					}
				} catch (parseError) {
					console.warn(
						"Failed to parse stored IT asset state, using defaults:",
						parseError,
					);
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
			console.error(
				"Error persisting IT asset state to localStorage:",
				err,
			);
		}
	}, [state, isLoading]);

	// ── Add asset ───────────────────────────────────────────────────────

	const addAsset = useCallback(
		(
			asset: Omit<ITAsset, "id" | "createdAt" | "updatedAt" | "assignmentHistory" | "category">,
		) => {
			const now = new Date().toISOString();
			const newAsset: ITAsset = {
				...asset,
				id: generateId(),
				category: getAssetCategory(asset.type),
				assignmentHistory: [],
				createdAt: now,
				updatedAt: now,
			};

			setState((prev) => {
				if (!prev) return prev;
				const entry = createActivityEntry(
					"created",
					newAsset,
					`New ${newAsset.category.toLowerCase()} asset added: ${newAsset.name}`,
				);
				return {
					assets: [...prev.assets, newAsset],
					activityLog: [entry, ...prev.activityLog].slice(
						0,
						MAX_LOG_ENTRIES,
					),
				};
			});

			return newAsset.id;
		},
		[],
	);

	// ── Update asset ────────────────────────────────────────────────────

	const updateAsset = useCallback(
		(
			id: string,
			updates: Partial<
				Omit<ITAsset, "id" | "createdAt" | "assignmentHistory" | "category">
			>,
		) => {
			setState((prev) => {
				if (!prev) return prev;
				const now = new Date().toISOString();
				const existing = prev.assets.find((a) => a.id === id);
				if (!existing) return prev;

				const updatedAsset: ITAsset = {
					...existing,
					...updates,
					// Re-derive category if type changed
					category: updates.type
						? getAssetCategory(updates.type)
						: existing.category,
					updatedAt: now,
				};

				const changes: string[] = [];
				if (updates.name && updates.name !== existing.name) {
					changes.push(`Name changed to "${updates.name}"`);
				}
				if (updates.status && updates.status !== existing.status) {
					changes.push(
						`Status changed from ${getITAssetStatusLabel(existing.status)} to ${getITAssetStatusLabel(updates.status)}`,
					);
				}
				if (
					updates.assigneeName !== undefined &&
					updates.assigneeName !== existing.assigneeName
				) {
					changes.push(
						updates.assigneeName
							? `Assigned to ${updates.assigneeName}`
							: "Assignee removed",
					);
				}
				if (updates.location && updates.location !== existing.location) {
					changes.push(`Location changed to ${updates.location}`);
				}

				const detail =
					changes.length > 0
						? changes.join(", ")
						: "Asset details updated";

				const entry = createActivityEntry("updated", updatedAsset, detail);

				return {
					assets: prev.assets.map((a) =>
						a.id === id ? updatedAsset : a,
					),
					activityLog: [entry, ...prev.activityLog].slice(
						0,
						MAX_LOG_ENTRIES,
					),
				};
			});
		},
		[],
	);

	// ── Change status ───────────────────────────────────────────────────

	const changeStatus = useCallback(
		(id: string, newStatus: ITAssetStatus): boolean => {
			let success = false;

			setState((prev) => {
				if (!prev) return prev;
				const asset = prev.assets.find((a) => a.id === id);
				if (!asset) return prev;

				if (!isValidStatusTransition(asset.status, newStatus)) {
					return prev;
				}

				success = true;
				const now = new Date().toISOString();
				const updatedAsset: ITAsset = {
					...asset,
					status: newStatus,
					// Clear assignee when moving to non-assigned status
					...(newStatus !== "assigned" && {
						assigneeName: undefined,
						assigneeAvatar: undefined,
						department: asset.department,
					}),
					updatedAt: now,
				};

				const entry = createActivityEntry(
					"status-changed",
					updatedAsset,
					`Status changed from ${getITAssetStatusLabel(asset.status)} to ${getITAssetStatusLabel(newStatus)}`,
				);

				return {
					assets: prev.assets.map((a) =>
						a.id === id ? updatedAsset : a,
					),
					activityLog: [entry, ...prev.activityLog].slice(
						0,
						MAX_LOG_ENTRIES,
					),
				};
			});

			return success;
		},
		[],
	);

	// ── Check out (assign to person) ────────────────────────────────────

	const checkOut = useCallback(
		(
			id: string,
			assignee: {
				name: string;
				avatar?: string;
				department: ITDepartment;
			},
			notes?: string,
		) => {
			setState((prev) => {
				if (!prev) return prev;
				const asset = prev.assets.find((a) => a.id === id);
				if (!asset) return prev;

				const now = new Date().toISOString();

				const record: AssignmentRecord = {
					id: generateRecordId(),
					action: "check-out",
					assigneeName: assignee.name,
					assigneeAvatar: assignee.avatar,
					department: assignee.department,
					timestamp: now,
					notes,
				};

				const updatedAsset: ITAsset = {
					...asset,
					status: "assigned",
					assigneeName: assignee.name,
					assigneeAvatar: assignee.avatar,
					department: assignee.department,
					assignmentHistory: [...asset.assignmentHistory, record],
					updatedAt: now,
				};

				const entry = createActivityEntry(
					"checked-out",
					updatedAsset,
					`Checked out to ${assignee.name} (${assignee.department})`,
				);

				return {
					assets: prev.assets.map((a) =>
						a.id === id ? updatedAsset : a,
					),
					activityLog: [entry, ...prev.activityLog].slice(
						0,
						MAX_LOG_ENTRIES,
					),
				};
			});
		},
		[],
	);

	// ── Check in (return from person) ───────────────────────────────────

	const checkIn = useCallback((id: string, notes?: string) => {
		setState((prev) => {
			if (!prev) return prev;
			const asset = prev.assets.find((a) => a.id === id);
			if (!asset) return prev;

			const now = new Date().toISOString();

			const record: AssignmentRecord = {
				id: generateRecordId(),
				action: "check-in",
				assigneeName: asset.assigneeName ?? "Unknown",
				assigneeAvatar: asset.assigneeAvatar,
				department: asset.department ?? "IT",
				timestamp: now,
				notes,
			};

			const updatedAsset: ITAsset = {
				...asset,
				status: "in-stock",
				assigneeName: undefined,
				assigneeAvatar: undefined,
				assignmentHistory: [...asset.assignmentHistory, record],
				updatedAt: now,
			};

			const entry = createActivityEntry(
				"checked-in",
				updatedAsset,
				`Checked in from ${record.assigneeName} (${record.department})`,
			);

			return {
				assets: prev.assets.map((a) =>
					a.id === id ? updatedAsset : a,
				),
				activityLog: [entry, ...prev.activityLog].slice(
					0,
					MAX_LOG_ENTRIES,
				),
			};
		});
	}, []);

	// ── Delete asset ────────────────────────────────────────────────────

	const deleteAsset = useCallback((id: string) => {
		setState((prev) => {
			if (!prev) return prev;
			const asset = prev.assets.find((a) => a.id === id);
			if (!asset) return prev;

			const entry = createActivityEntry(
				"deleted",
				asset,
				`Asset removed: ${asset.name} (${asset.assetTag})`,
			);

			return {
				assets: prev.assets.filter((a) => a.id !== id),
				activityLog: [entry, ...prev.activityLog].slice(
					0,
					MAX_LOG_ENTRIES,
				),
			};
		});
	}, []);

	// ── Bulk delete ─────────────────────────────────────────────────────

	const bulkDelete = useCallback((ids: string[]) => {
		setState((prev) => {
			if (!prev) return prev;
			const now = new Date().toISOString();
			const deletedAssets = prev.assets.filter((a) =>
				ids.includes(a.id),
			);

			const entries: ITAssetActivityEntry[] = deletedAssets.map(
				(asset) => ({
					id: generateLogId(),
					action: "deleted" as const,
					assetId: asset.id,
					assetName: asset.name,
					details: `Asset removed (bulk delete): ${asset.name} (${asset.assetTag})`,
					timestamp: now,
				}),
			);

			return {
				assets: prev.assets.filter((a) => !ids.includes(a.id)),
				activityLog: [...entries, ...prev.activityLog].slice(
					0,
					MAX_LOG_ENTRIES,
				),
			};
		});
	}, []);

	// ── Reset to seed data ──────────────────────────────────────────────

	const reset = useCallback(() => {
		try {
			if (typeof window !== "undefined") {
				localStorage.removeItem(STORAGE_KEY);
			}
			setState(getInitialState());
		} catch (err) {
			console.error("Error resetting IT asset state:", err);
		}
	}, []);

	// ── Return ──────────────────────────────────────────────────────────

	return {
		assets: state?.assets ?? [],
		activityLog: state?.activityLog ?? [],
		isLoading,
		addAsset,
		updateAsset,
		changeStatus,
		checkOut,
		checkIn,
		deleteAsset,
		bulkDelete,
		reset,
	};
}
