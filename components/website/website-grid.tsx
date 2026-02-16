"use client";

import { type ReactNode } from "react";

export interface WebsiteGridProps {
	children: ReactNode;
	className?: string;
}

/**
 * Responsive grid container for component demos.
 * Columns: 1 (mobile) → 2 (lg:1024px) → 3 (2xl:1536px) → 4 (min:1920px)
 */
export function WebsiteGrid({ children, className }: Readonly<WebsiteGridProps>) {
	return (
		<ul
			className={`grid grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3 min-[1920px]:grid-cols-4 list-none m-0 p-0 ${className ?? ""}`}
		>
			{children}
		</ul>
	);
}
