"use client";

import { type ReactNode } from "react";
import { ThemeToggle } from "@/components/utils/theme-wrapper";

export interface WebsiteHeaderProps {
	/** Package name to display */
	packageName?: string;
	/** Version string */
	version?: string;
	/** Optional content displayed on the left side of the header */
	leftContent?: ReactNode;
}

/**
 * Sticky header with package info and theme toggle.
 * 56px height, positioned at top of main content area.
 */
export function WebsiteHeader({
	packageName = "@vpk",
	version = "1.0.0",
	leftContent,
}: Readonly<WebsiteHeaderProps>) {
	return (
		<header className="sticky top-0 z-10 flex h-14 items-center border-b border-border bg-surface">
			<div className="flex min-w-0 flex-1 items-center px-4">
				{leftContent}
			</div>
			{/* Right side - Package name, version, and theme toggle */}
			<div className="flex items-center gap-2 px-4">
				<div className="flex items-center gap-2 font-mono">
					<span className="text-xs text-text-subtle">
						{packageName}
					</span>
					<span className="rounded-md bg-bg-neutral py-0.5 px-2 text-xs font-medium text-text">
						v{version}
					</span>
				</div>
				<ThemeToggle />
			</div>
		</header>
	);
}
