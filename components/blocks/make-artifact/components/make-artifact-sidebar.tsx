"use client";

import Image from "next/image";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sidebar, SidebarContent, SidebarFooter as SidebarFooterSlot, SidebarHeader, useSidebar } from "@/components/ui/sidebar";
import { token } from "@/lib/tokens";
import SidebarCollapseIcon from "@atlaskit/icon/core/sidebar-collapse";
import SidebarExpandIcon from "@atlaskit/icon/core/sidebar-expand";
import SearchIcon from "@atlaskit/icon/core/search";
import SidebarRunHistory from "@/components/projects/make/components/sidebar-run-history";
import type { AgentRunListItem } from "@/lib/make-run-types";
import { MakeSidebarFooter } from "./sidebar-footer";

interface MakeArtifactSidebarProps extends React.ComponentProps<typeof Sidebar> {
	isOverlay?: boolean;
	isHoverReveal?: boolean;
	onPinSidebar?: () => void;
	runs?: AgentRunListItem[];
	activeRunId?: string | null;
	onSelectRun?: (runId: string) => void;
	isRunsLoading?: boolean;
}

export function MakeArtifactSidebar({
	isOverlay,
	isHoverReveal,
	onPinSidebar,
	runs = [],
	activeRunId = null,
	onSelectRun,
	isRunsLoading = false,
	...props
}: Readonly<MakeArtifactSidebarProps>) {
	const { toggleSidebar } = useSidebar();

	return (
		<Sidebar collapsible="offcanvas" className="[&_[data-slot=sidebar-inner]]:relative [&_[data-slot=sidebar-inner]]:bg-bg-neutral-subtle" {...props}>
			<SidebarHeader className="h-14 bg-bg-neutral-subtle px-4 py-0">
				<div className="flex h-full items-center justify-between">
					<div className="flex items-center text-icon-subtle">
						<div
							className={cn(
								"w-9 overflow-hidden transition-all duration-normal ease-out",
								!isHoverReveal && !isOverlay && "w-0 opacity-0",
							)}
						>
							<Button aria-label="Pin sidebar" size="icon" variant="ghost" onClick={onPinSidebar}>
								<SidebarExpandIcon label="" />
							</Button>
						</div>
						<div className="flex items-center gap-2 p-1">
							<Image src="/1p/rovo.svg" alt="" width={20} height={20} aria-hidden />
							<span style={{ font: token("font.heading.xsmall") }} className="text-text">
								Rovo
							</span>
						</div>
					</div>
					<div
						className={cn(
							"w-9 overflow-hidden text-icon-subtle transition-all duration-normal ease-out",
							(isOverlay || isHoverReveal) && "w-0 opacity-0",
						)}
					>
						<Button aria-label="Collapse sidebar" size="icon" variant="ghost" onClick={toggleSidebar}>
							<SidebarCollapseIcon label="" />
						</Button>
					</div>
				</div>
			</SidebarHeader>

			<SidebarContent className="bg-bg-neutral-subtle">
				<div className="flex flex-col gap-3 px-3 pt-3">
					<div className="relative">
						<div className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-icon-subtle">
							<SearchIcon label="" size="small" />
						</div>
						<Input placeholder="Search" className="pl-9" />
					</div>

					<button
						type="button"
						className="flex min-h-8 w-full items-center justify-center rounded-full border border-dashed border-border px-3"
					>
						<span className="text-sm font-medium text-text-subtle">
							New chat
						</span>
					</button>
				</div>

				<div className="pt-3">
					{isRunsLoading ? (
						<div className="px-4 pb-3">
							<p style={{ font: token("font.heading.xxsmall") }} className="text-text-subtlest">
								Runs
							</p>
							<p className="pt-2 text-xs text-text-subtlest">Loading runs...</p>
						</div>
					) : runs.length > 0 ? (
						<SidebarRunHistory
							items={runs}
							activeRunId={activeRunId}
							onSelectRun={onSelectRun}
						/>
					) : (
						<div className="px-4 pb-3">
							<p style={{ font: token("font.heading.xxsmall") }} className="text-text-subtlest">
								Runs
							</p>
							<p className="pt-2 text-xs text-text-subtlest">
								No saved runs yet.
							</p>
						</div>
					)}
				</div>
			</SidebarContent>

			<SidebarFooterSlot className="max-h-[50%] overflow-y-auto bg-surface p-0">
				<MakeSidebarFooter />
			</SidebarFooterSlot>
		</Sidebar>
	);
}
