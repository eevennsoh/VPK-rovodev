"use client";

import Image from "next/image";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { token } from "@/lib/tokens";
import ChevronLeftIcon from "@atlaskit/icon/core/chevron-left";
import ShowMoreHorizontalIcon from "@atlaskit/icon/core/show-more-horizontal";
import ShareIcon from "@atlaskit/icon/core/share";
import SidebarExpandIcon from "@atlaskit/icon/core/sidebar-expand";
import { Globe } from "lucide-react";

interface SummaryTitleRowProps {
	title: string;
	sidebarOpen: boolean;
	sidebarHovered: boolean;
	onExpandSidebar: () => void;
	onHoverEnter: () => void;
	onHoverLeave: () => void;
	onBack?: () => void;
}

export default function SummaryTitleRow({
	title,
	sidebarOpen,
	sidebarHovered,
	onExpandSidebar,
	onHoverEnter,
	onHoverLeave,
	onBack,
}: Readonly<SummaryTitleRowProps>) {
	return (
		<div className="flex h-12 items-center justify-between border-b border-border px-4">
			<div
				className={cn(
					"flex shrink-0 items-center gap-1 overflow-hidden text-icon-subtle transition-all duration-200 ease-[var(--ease-in-out)]",
					sidebarOpen || sidebarHovered ? "pointer-events-none mr-0 w-0 opacity-0" : "mr-3",
				)}
				onMouseEnter={onHoverEnter}
				onMouseLeave={onHoverLeave}
			>
				<Button aria-label="Expand sidebar" size="icon" variant="ghost" onClick={onExpandSidebar}>
					<SidebarExpandIcon label="" />
				</Button>
				<div className="flex items-center gap-2 p-1">
					<Image src="/1p/rovo.svg" alt="" width={20} height={20} aria-hidden />
					<span style={{ font: token("font.heading.xsmall") }} className="text-text">
						Rovo
					</span>
				</div>
				<div className="mx-1 h-5 w-px shrink-0 bg-border" />
			</div>

			<div className="flex min-w-0 flex-1 items-center gap-2">
				<Button aria-label="Go back" size="icon" variant="ghost" onClick={onBack}>
					<ChevronLeftIcon label="" />
				</Button>
				<p style={{ font: token("font.heading.xsmall") }} className="truncate text-text" title={title}>
					{title}
				</p>
			</div>

			<div className="ml-3 flex shrink-0 items-center gap-2">
				<Button aria-label="More options" size="icon" variant="outline">
					<ShowMoreHorizontalIcon label="" />
				</Button>
				<Button variant="outline">
					<ShareIcon label="" />
					Share
				</Button>
				<Button>
					<Globe />
					Publish
				</Button>
			</div>
		</div>
	);
}
