"use client";

import { useSyncExternalStore } from "react";

/**
 * Hook that returns true after the component has mounted.
 * Useful for avoiding hydration mismatches in Next.js.
 */
export function useIsMounted(): boolean {
	return useSyncExternalStore(
		() => () => {},
		() => true,
		() => false
	);
}
