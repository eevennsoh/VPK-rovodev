"use client";

import { useState } from "react";

interface UrlParams {
	name: string | null;
}

/**
 * Hook that extracts URL parameters from the current page URL.
 * Specifically extracts the 'name' parameter used for Rovo agent names.
 */
export function useUrlParams(): UrlParams {
	const [params] = useState<UrlParams>(() => {
		if (typeof window === "undefined") {
			return { name: null };
		}
		const urlParams = new URLSearchParams(window.location.search);
		return { name: urlParams.get("name") };
	});

	return params;
}
