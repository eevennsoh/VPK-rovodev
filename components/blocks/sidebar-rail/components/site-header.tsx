"use client";

import { Button } from "@/components/ui/button";
import { JiraIcon } from "@/components/ui/logo";
import { token } from "@/lib/tokens";
import AppSwitcherIcon from "@atlaskit/icon/core/app-switcher";
import SidebarCollapseIcon from "@atlaskit/icon/core/sidebar-collapse";
import SidebarExpandIcon from "@atlaskit/icon/core/sidebar-expand";

interface SiteHeaderProps {
	isPinned?: boolean;
	onTogglePin?: () => void;
	onHoverEnter?: () => void;
	onHoverLeave?: () => void;
}

export function SiteHeader({
	isPinned,
	onTogglePin,
	onHoverEnter,
	onHoverLeave,
}: Readonly<SiteHeaderProps>) {
	return (
		<header className="sticky top-0 z-50 flex h-(--header-height) w-full items-center border-b border-border bg-surface px-2">
			{/* Left section — position-swapping elements */}
			<div className="relative flex h-full items-center" style={{ minWidth: "200px" }}>
				{/* Sidebar toggle */}
				<div
					className="absolute flex h-full items-center"
					style={{
						left: isPinned ? "180px" : "0",
						transition: "left var(--duration-medium) var(--ease-in-out)",
					}}
				>
					<Button
						aria-label={isPinned ? "Collapse sidebar" : "Expand sidebar"}
						size="icon"
						variant="ghost"
						onClick={onTogglePin}
						onMouseEnter={onHoverEnter}
						onMouseLeave={onHoverLeave}
					>
						{isPinned ? (
							<SidebarCollapseIcon label="" />
						) : (
							<SidebarExpandIcon label="" />
						)}
					</Button>
				</div>

				{/* App switcher */}
				<div
					className="absolute flex h-full items-center"
					style={{
						left: isPinned ? "0" : "40px",
						transition: "left var(--duration-medium) var(--ease-in-out)",
					}}
				>
					<Button aria-label="Switch apps" size="icon" variant="ghost">
						<AppSwitcherIcon label="" />
					</Button>
				</div>

				{/* Logo */}
				<div
					className="absolute flex h-full items-center"
					style={{
						left: isPinned ? "40px" : "80px",
						transition: "left var(--duration-medium) var(--ease-in-out)",
						marginLeft: token("space.050"),
					}}
				>
					<div className="flex items-center gap-1.5">
						<JiraIcon size="small" />
						<span
							style={{ font: token("font.heading.xsmall") }}
							className="text-text"
						>
							Jira
						</span>
					</div>
				</div>
			</div>

			{/* Center section */}
			<div className="flex flex-1" />

			{/* Right section */}
			<div className="flex items-center gap-1" />
		</header>
	);
}
