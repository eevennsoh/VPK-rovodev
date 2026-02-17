"use client";

import Image from "next/image";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { token } from "@/lib/tokens";
import AddIcon from "@atlaskit/icon/core/add";
import ShareIcon from "@atlaskit/icon/core/share";
import SidebarExpandIcon from "@atlaskit/icon/core/sidebar-expand";

interface SummaryTitleRowProps {
	title: string;
	subtitle?: string;
	onNewChat: () => void;
	sidebarOpen: boolean;
	sidebarHovered: boolean;
	onExpandSidebar: () => void;
	onHoverEnter: () => void;
	onHoverLeave: () => void;
}

export default function SummaryTitleRow({ title, subtitle, onNewChat, sidebarOpen, sidebarHovered, onExpandSidebar, onHoverEnter, onHoverLeave }: Readonly<SummaryTitleRowProps>) {
	return (
		<div className="flex h-14 items-center justify-between border-b border-border px-4">
			{!sidebarOpen ? (
				<div
					className={cn("flex shrink-0 items-center gap-1 overflow-hidden text-icon-subtle transition-all duration-200 ease-[var(--ease-in-out)]", sidebarHovered ? "mr-0 w-0 opacity-0" : "mr-3")}
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
			) : null}
			<div className="min-w-0 flex-1">
				<p style={{ font: token("font.heading.xsmall") }} className="truncate text-text" title={title}>
					{title}
				</p>
				{subtitle ? <p className="text-xs text-text-subtlest">{subtitle}</p> : null}
			</div>
			<div className="ml-3 flex shrink-0 items-center gap-2">
				<Button variant="outline" className="hidden md:inline-flex">
					Re-run
				</Button>
				<Button variant="outline" className="hidden md:inline-flex">
					<span className="inline-flex size-3 items-center justify-center [&_svg]:size-3">
						<ShareIcon label="" size="small" />
					</span>
					<span>Share</span>
				</Button>
				<Button aria-label="New chat" variant="outline" onClick={onNewChat}>
					<span className="inline-flex size-3 items-center justify-center [&_svg]:size-3">
						<AddIcon label="" size="small" />
					</span>
					<span>New chat</span>
				</Button>
			</div>
		</div>
	);
}
