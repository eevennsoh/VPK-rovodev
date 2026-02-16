"use client";

import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Shimmer } from "@/components/ui-ai/shimmer";
import { cn } from "@/lib/utils";
import { token } from "@/lib/tokens";
import AddIcon from "@atlaskit/icon/core/add";
import SidebarExpandIcon from "@atlaskit/icon/core/sidebar-expand";

interface ChatTitleRowProps {
	title: string | null;
	isTitlePending: boolean;
	onNewChat: () => void;
	sidebarOpen: boolean;
	sidebarHovered: boolean;
	onExpandSidebar: () => void;
	onHoverEnter: () => void;
	onHoverLeave: () => void;
}

export default function ChatTitleRow({
	title,
	isTitlePending,
	onNewChat,
	sidebarOpen,
	sidebarHovered,
	onExpandSidebar,
	onHoverEnter,
	onHoverLeave,
}: Readonly<ChatTitleRowProps>) {
	const displayTitle = title ?? "New chat";

	return (
		<div className="flex h-14 items-center justify-between border-b border-border px-4">
			{!sidebarOpen && (
				<div
					className={cn(
						"flex shrink-0 items-center gap-1 overflow-hidden text-icon-subtle transition-all duration-200 ease-[var(--ease-in-out)]",
						sidebarHovered ? "mr-0 w-0 opacity-0" : "mr-3",
					)}
					onMouseEnter={onHoverEnter}
					onMouseLeave={onHoverLeave}
				>
					<Button
						aria-label="Expand sidebar"
						size="icon"
						variant="ghost"
						onClick={onExpandSidebar}
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
					<div className="mx-1 h-5 w-px shrink-0 bg-border" />
				</div>
			)}
			<div
				className="min-w-0 flex-1"
				style={{ font: token("font.heading.xsmall") }}
				title={displayTitle}
			>
				{isTitlePending ? (
					<Shimmer
						key={displayTitle}
						as="span"
						duration={1}
						className="max-w-full truncate motion-safe:animate-[sd-blurIn_160ms_ease-out_both] motion-reduce:animate-none"
					>
						{displayTitle}
					</Shimmer>
				) : (
					<p
						key={displayTitle}
						className="truncate text-text motion-safe:animate-[sd-blurIn_160ms_ease-out_both] motion-reduce:animate-none"
						title={displayTitle}
					>
						{displayTitle}
					</p>
				)}
			</div>
			<Button aria-label="New chat" variant="outline" className="ml-3 shrink-0" onClick={onNewChat}>
				<span className="inline-flex size-3 items-center justify-center [&_svg]:size-3">
					<AddIcon label="" size="small" />
				</span>
				<span>New chat</span>
			</Button>
		</div>
	);
}
