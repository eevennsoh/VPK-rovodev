import { useEffect, useState, useCallback } from "react";
import type {
	AssetRequest,
	AssetRequestState,
	AssetRequestStatus,
} from "@/lib/asset-request-types";
import { SEED_ASSET_REQUESTS } from "@/lib/asset-request-seed-data";

const STORAGE_KEY = "asset-request-state";

function getInitialState(): AssetRequestState {
	return {
		requests: SEED_ASSET_REQUESTS,
	};
}

function generateId(): string {
	return `ar-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

/**
 * Custom hook for managing asset request state with localStorage persistence.
 *
 * Features:
 * - Automatically persists state to localStorage on updates
 * - Hydrates from localStorage on mount
 * - Falls back to seed data if storage is empty or corrupted
 * - Provides type-safe CRUD methods
 * - Handles SSR (no localStorage access on server)
 */
export function useAssetRequestStorage() {
	const [state, setState] = useState<AssetRequestState | null>(null);
	const [isLoading, setIsLoading] = useState(true);

	// Initialize state from localStorage or fallback to seed data
	if (state === null && isLoading) {
		let initialState = getInitialState();

		if (typeof window !== "undefined") {
			const stored = localStorage.getItem(STORAGE_KEY);
			if (stored) {
				try {
					const parsed = JSON.parse(stored) as AssetRequestState;
					if (Array.isArray(parsed.requests)) {
						initialState = parsed;
					}
				} catch (parseError) {
					console.warn(
						"Failed to parse stored asset request state, using defaults:",
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
				"Error persisting asset request state to localStorage:",
				err,
			);
		}
	}, [state, isLoading]);

	const addRequest = useCallback(
		(
			request: Omit<AssetRequest, "id" | "submittedAt" | "status">,
		) => {
			const now = new Date().toISOString();
			const newRequest: AssetRequest = {
				...request,
				id: generateId(),
				status: "submitted",
				submittedAt: now,
			};
			setState((prev) => {
				if (!prev) return prev;
				return {
					requests: [newRequest, ...prev.requests],
				};
			});
		},
		[],
	);

	const updateStatus = useCallback(
		(
			id: string,
			status: AssetRequestStatus,
			reviewNote?: string,
		) => {
			setState((prev) => {
				if (!prev) return prev;
				const now = new Date().toISOString();
				return {
					requests: prev.requests.map((r) =>
						r.id === id
							? { ...r, status, reviewedAt: now, reviewNote }
							: r,
					),
				};
			});
		},
		[],
	);

	const reset = useCallback(() => {
		try {
			if (typeof window !== "undefined") {
				localStorage.removeItem(STORAGE_KEY);
			}
			setState(getInitialState());
		} catch (err) {
			console.error("Error resetting asset request state:", err);
		}
	}, []);

	return {
		requests: state?.requests ?? [],
		isLoading,
		addRequest,
		updateStatus,
		reset,
	};
}
