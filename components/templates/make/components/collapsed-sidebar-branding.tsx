"use client";

import Image from "next/image";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { token } from "@/lib/tokens";
import SidebarExpandIcon from "@atlaskit/icon/core/sidebar-expand";

interface CollapsedSidebarBrandingProps {
	isVisible: boolean;
	onExpandClick: () => void;
	onHoverEnter: () => void;
	onHoverLeave: () => void;
}

export function CollapsedSidebarBranding({
	isVisible,
	onExpandClick,
	onHoverEnter,
	onHoverLeave,
}: Readonly<CollapsedSidebarBrandingProps>) {
	return (
		<div
			className={cn(
				"absolute left-2 top-3 z-20 flex items-center gap-1 text-icon-subtle transition-opacity duration-[var(--duration-normal)] ease-out",
				isVisible ? "opacity-100" : "pointer-events-none opacity-0",
			)}
			onMouseEnter={onHoverEnter}
			onMouseLeave={onHoverLeave}
		>
			<Button
				aria-label="Expand sidebar"
				size="icon"
				variant="ghost"
				onClick={onExpandClick}
			>
				<SidebarExpandIcon label="" />
			</Button>
			<div className="flex items-center gap-2 p-1">
				<Image src="/1p/rovo.svg" alt="" width={20} height={20} aria-hidden />
				<span
					style={{ font: token("font.heading.xsmall") }}
					className="text-text"
				>
					Rovo
				</span>
			</div>
		</div>
	);
}
