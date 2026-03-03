"use client";

import { useState } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Sidebar, SidebarContent, SidebarFooter as SidebarFooterSlot, SidebarHeader, useSidebar } from "@/components/ui/sidebar";
import { ThemeToggle } from "@/components/utils/theme-wrapper";
import { token } from "@/lib/tokens";
import SidebarCollapseIcon from "@atlaskit/icon/core/sidebar-collapse";
import SidebarExpandIcon from "@atlaskit/icon/core/sidebar-expand";
import ChevronRightIcon from "@atlaskit/icon/core/chevron-right";
import ChevronDownIcon from "@atlaskit/icon/core/chevron-down";
import AddIcon from "@atlaskit/icon/core/add";
import AgentsProgress from "@/components/blocks/agent-progress/page";
import type { ProgressStatusGroups } from "@/components/blocks/agent-progress/data/mock-tasks";

interface AgentSummarySidebarProps extends React.ComponentProps<typeof Sidebar> {
	isOverlay?: boolean;
	onPinSidebar?: () => void;
}

const DEMO_COMPLETED_TASK_GROUPS: ProgressStatusGroups = {
	done: [
		{ id: "summary-task-1", label: "Audit summary flow", description: "Mapped summary routes, polling lifecycle, and artifact dependencies." },
		{ id: "summary-task-2", label: "Build summary layout", description: "Shipped final synthesis, interactive summary, and visual summary sections." },
		{ id: "summary-task-3", label: "Validate fallback states", description: "Confirmed loading, timeout, and manual refresh handling." },
	],
	inReview: [],
	inProgress: [],
	failed: [],
	todo: [],
};

export function AgentSummarySidebar({ isOverlay, onPinSidebar, ...props }: Readonly<AgentSummarySidebarProps>) {
	const { toggleSidebar } = useSidebar();

	return (
		<Sidebar collapsible="offcanvas" className="[&_[data-slot=sidebar-inner]]:relative [&_[data-slot=sidebar-inner]]:bg-bg-neutral-subtle" {...props}>
			<SidebarHeader className="h-14 bg-bg-neutral-subtle px-4 py-0">
				<div className="flex h-full items-center justify-between">
					<div className="flex items-center text-icon-subtle">
						<div className={cn("w-9 overflow-hidden transition-all duration-[var(--duration-normal)] ease-out", !isOverlay && "w-0 opacity-0")}>
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
					<div className="flex items-center text-icon-subtle">
						<ThemeToggle />
						<div className={cn("w-9 overflow-hidden transition-all duration-[var(--duration-normal)] ease-out", isOverlay && "w-0 opacity-0")}>
							<Button aria-label="Collapse sidebar" size="icon" variant="ghost" onClick={toggleSidebar}>
								<SidebarCollapseIcon label="" />
							</Button>
						</div>
					</div>
				</div>
			</SidebarHeader>
			<SidebarContent className="bg-bg-neutral-subtle pb-[7.5rem]">
				<div className="px-3 pt-3">
					<p style={{ font: token("font.heading.xxsmall") }} className="text-text-subtlest">
						Done
					</p>
					<div className="mt-2">
						<AgentsProgress
							runStatus="completed"
							planTitle="Flexible Friday Plan"
							planEmoji="✌️"
							taskStatusGroups={DEMO_COMPLETED_TASK_GROUPS}
							runCreatedAt="2026-02-17T15:18:00.000Z"
							runCompletedAt="2026-02-17T15:24:00.000Z"
						/>
					</div>
				</div>
			</SidebarContent>
			<SidebarFooterSlot className="absolute bottom-0 left-0 right-0 z-10 bg-surface p-0">
				<SidebarFooterContent />
			</SidebarFooterSlot>
		</Sidebar>
	);
}

function SidebarFooterContent() {
	const [skillsOpen, setSkillsOpen] = useState(false);
	const [agentsOpen, setAgentsOpen] = useState(false);

	return (
		<div className="flex flex-col">
			<div className="border-t border-border">
				<button type="button" className="flex h-10 w-full items-center justify-between px-4 pr-3 text-left transition-colors hover:bg-bg-neutral" onClick={() => setSkillsOpen((prev) => !prev)}>
					<span style={{ font: token("font.heading.xxsmall") }} className="text-text-subtlest">
						Skills
					</span>
					{skillsOpen ? <ChevronDownIcon label="" color="currentColor" size="small" /> : <ChevronRightIcon label="" color="currentColor" size="small" />}
				</button>
				{skillsOpen ? (
					<div className="flex flex-col gap-0.5 px-2 pb-2">
						<button type="button" className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm text-text transition-colors hover:bg-bg-neutral">
							<span className="truncate">Web search</span>
						</button>
						<button type="button" className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm text-text transition-colors hover:bg-bg-neutral">
							<span className="truncate">Code review</span>
						</button>
						<Button variant="ghost" size="sm" className="w-full justify-start gap-2 text-text-subtlest">
							<AddIcon label="" size="small" />
							Add skill
						</Button>
					</div>
				) : null}
			</div>

			<div className="border-t border-border">
				<button type="button" className="flex h-10 w-full items-center justify-between px-4 pr-3 text-left transition-colors hover:bg-bg-neutral" onClick={() => setAgentsOpen((prev) => !prev)}>
					<span style={{ font: token("font.heading.xxsmall") }} className="text-text-subtlest">
						Agents
					</span>
					{agentsOpen ? <ChevronDownIcon label="" color="currentColor" size="small" /> : <ChevronRightIcon label="" color="currentColor" size="small" />}
				</button>
				{agentsOpen ? (
					<div className="flex flex-col gap-0.5 px-2 pb-2">
						<button type="button" className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm text-text transition-colors hover:bg-bg-neutral">
							<span className="truncate">Researcher</span>
						</button>
						<button type="button" className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm text-text transition-colors hover:bg-bg-neutral">
							<span className="truncate">Product Manager</span>
						</button>
						<Button variant="ghost" size="sm" className="w-full justify-start gap-2 text-text-subtlest">
							<AddIcon label="" size="small" />
							Add agent
						</Button>
					</div>
				) : null}
			</div>

			<div className="flex items-center justify-center border-t border-border p-3">
				<span className="text-xs text-text-subtlest">Agent team • Concept</span>
			</div>
		</div>
	);
}
