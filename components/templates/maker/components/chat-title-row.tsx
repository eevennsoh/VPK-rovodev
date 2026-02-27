"use client";

import type { ReactNode } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Shimmer } from "@/components/ui-ai/shimmer";
import { ConfluenceIcon } from "@/components/ui/logo";
import { cn } from "@/lib/utils";
import { token } from "@/lib/tokens";
import ShareIcon from "@atlaskit/icon/core/share";
import SidebarExpandIcon from "@atlaskit/icon/core/sidebar-expand";

interface ChatTitleRowProps {
	title: string | null;
	isTitlePending: boolean;
	leftSlot?: ReactNode;
	centerSlot?: ReactNode;
	sidebarOpen: boolean;
	sidebarHovered: boolean;
	onExpandSidebar: () => void;
	onHoverEnter: () => void;
	onHoverLeave: () => void;
	onShareToConfluence?: () => void;
	onShareToSlack?: () => void;
	shareDisabled?: boolean;
	isSharing?: boolean;
}

export default function ChatTitleRow({
	title,
	isTitlePending,
	leftSlot,
	centerSlot,
	sidebarOpen,
	sidebarHovered,
	onExpandSidebar,
	onHoverEnter,
	onHoverLeave,
	onShareToConfluence,
	onShareToSlack,
	shareDisabled = false,
	isSharing = false,
}: Readonly<ChatTitleRowProps>) {
	const displayTitle = title ?? "New chat";
	const canShare = Boolean(onShareToConfluence && onShareToSlack);
	const isShareButtonDisabled = shareDisabled || isSharing;

	return (
		<div className="grid h-14 grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center border-b border-border px-4">
			<div className="flex min-w-0 items-center">
				<div
					className={cn(
						"flex shrink-0 items-center gap-1 overflow-hidden text-icon-subtle transition-all duration-200 ease-[var(--ease-in-out)]",
						sidebarOpen || sidebarHovered ? "pointer-events-none mr-0 w-0 opacity-0" : "mr-3",
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
				{leftSlot}
				{title !== null ? (
					<div
						className="min-w-0 max-w-full"
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
				) : null}
			</div>
			<div className="justify-self-center">{centerSlot}</div>
			<div className="flex items-center gap-2 justify-self-end">
				{canShare ? (
					<DropdownMenu>
						<DropdownMenuTrigger
							render={(
								<Button
									aria-label="Share run summary"
									variant="outline"
									className="shrink-0"
									disabled={isShareButtonDisabled}
								>
									<span className="inline-flex size-3 items-center justify-center [&_svg]:size-3">
										<ShareIcon label="" size="small" />
									</span>
									<span>{isSharing ? "Sharing..." : "Share"}</span>
								</Button>
							)}
						/>
						<DropdownMenuContent align="end">
							<DropdownMenuGroup>
								<DropdownMenuItem
									onSelect={onShareToConfluence!}
									disabled={isShareButtonDisabled}
									description="Create a Confluence page from this summary."
									className="items-center"
									elemBefore={
										<span className="-mt-0.5 inline-flex size-6 items-center justify-center">
											<ConfluenceIcon
												label="Confluence"
												size="small"
											/>
										</span>
									}
								>
									Confluence
								</DropdownMenuItem>
								<DropdownMenuItem
									onSelect={onShareToSlack!}
									disabled={isShareButtonDisabled}
									description="Send this summary to your Slack DM."
									className="items-center"
									elemBefore={
										<span className="-mt-0.5 inline-flex size-6 items-center justify-center">
											<Image
												src="/3p/slack/16-borderless.svg"
												alt=""
												width={16}
												height={16}
												className="shrink-0"
												aria-hidden
											/>
										</span>
									}
								>
									Slack
								</DropdownMenuItem>
							</DropdownMenuGroup>
						</DropdownMenuContent>
					</DropdownMenu>
				) : null}
			</div>
		</div>
	);
}
