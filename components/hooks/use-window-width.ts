"use client";

import { useState, useEffect } from "react";

/**
 * Hook that tracks window width and updates on resize.
 * Returns 0 during SSR to avoid hydration mismatches.
 */
export function useWindowWidth(): number {
	const [width, setWidth] = useState(0);

	useEffect(() => {
		const handleResize = () => setWidth(window.innerWidth);

		// Set initial value
		handleResize();

		window.addEventListener("resize", handleResize);
		return () => window.removeEventListener("resize", handleResize);
	}, []);

	return width;
}
