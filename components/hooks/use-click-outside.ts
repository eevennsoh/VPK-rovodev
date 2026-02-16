"use client";

import { useEffect, RefObject } from "react";

/**
 * Hook that detects clicks outside of specified elements
 * @param refs - Array of refs to elements that should not trigger the callback
 * @param callback - Function to call when click outside is detected
 * @param enabled - Whether the hook is active (default: true)
 */
export function useClickOutside(
	refs: RefObject<HTMLElement | null>[],
	callback: () => void,
	enabled: boolean = true
): void {
	useEffect(() => {
		if (!enabled) return;

		const handleClickOutside = (event: MouseEvent) => {
			const target = event.target as Node;
			const isOutside = refs.every(
				(ref) => ref.current && !ref.current.contains(target)
			);
			if (isOutside) {
				callback();
			}
		};

		document.addEventListener("mousedown", handleClickOutside);
		return () => {
			document.removeEventListener("mousedown", handleClickOutside);
		};
	}, [refs, callback, enabled]);
}
