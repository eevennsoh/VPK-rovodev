"use client";

import { useState } from "react";
import { token } from "@/lib/tokens";
import {
	Empty,
	EmptyDescription,
	EmptyHeader,
	EmptyTitle,
} from "@/components/ui/empty";
import ChevronRightIcon from "@atlaskit/icon/core/chevron-right";
import ChevronDownIcon from "@atlaskit/icon/core/chevron-down";
import AddIcon from "@atlaskit/icon/core/add";
import DownloadIcon from "@atlaskit/icon/core/download";
import { cn } from "@/lib/utils";

interface SidebarItemData {
	name: string;
	isBuiltIn: boolean;
}

const DEMO_AGENTS: SidebarItemData[] = [
	{ name: "Code reviewer", isBuiltIn: true },
	{ name: "Sprint planner", isBuiltIn: false },
	{ name: "Test writer", isBuiltIn: false },
];

const DEMO_SKILLS: SidebarItemData[] = [
	{ name: "Summarize page", isBuiltIn: true },
	{ name: "Generate release notes", isBuiltIn: false },
];

export function MakeSidebarFooter() {
	const [appsOpen, setAppsOpen] = useState(false);
	const [agentsOpen, setAgentsOpen] = useState(false);
	const [automationOpen, setAutomationOpen] = useState(false);
	const [skillsOpen, setSkillsOpen] = useState(false);

	return (
		<div className="flex flex-col">
			<CollapsibleSection
				title="Apps"
				open={appsOpen}
				onToggle={() => setAppsOpen((prev) => !prev)}
			>
				<SectionEmptyState
					title="No apps yet"
					description="Build and publish apps to see them here."
				/>
			</CollapsibleSection>

			<CollapsibleSection
				title="Agents"
				badge={DEMO_AGENTS.length}
				open={agentsOpen}
				onToggle={() => setAgentsOpen((prev) => !prev)}
				showAdd
			>
				{DEMO_AGENTS.map((agent) => (
					<SidebarItemRow
						key={agent.name}
						name={agent.name}
						isBuiltIn={agent.isBuiltIn}
					/>
				))}
			</CollapsibleSection>

			<CollapsibleSection
				title="Automation"
				open={automationOpen}
				onToggle={() => setAutomationOpen((prev) => !prev)}
			>
				<SectionEmptyState
					title="No automations yet"
					description="Create automations to run tasks on a schedule."
				/>
			</CollapsibleSection>

			<CollapsibleSection
				title="Skills"
				badge={DEMO_SKILLS.length}
				open={skillsOpen}
				onToggle={() => setSkillsOpen((prev) => !prev)}
				showAdd
			>
				{DEMO_SKILLS.map((skill) => (
					<SidebarItemRow
						key={skill.name}
						name={skill.name}
						isBuiltIn={skill.isBuiltIn}
					/>
				))}
			</CollapsibleSection>

			<div className="flex items-center justify-center border-t border-border p-3">
				<span className="text-xs text-text-subtlest">
					Make • Concept
				</span>
			</div>
		</div>
	);
}

function CollapsibleSection({
	title,
	badge,
	open,
	onToggle,
	showAdd,
	children,
}: Readonly<{
	title: string;
	badge?: number;
	open: boolean;
	onToggle: () => void;
	showAdd?: boolean;
	children?: React.ReactNode;
}>) {
	return (
		<div className="group/section border-t border-border">
			<button
				type="button"
				className="flex h-10 w-full items-center justify-between px-4 pr-3 text-left transition-colors hover:bg-bg-neutral"
				onClick={onToggle}
			>
				<span
					style={{ font: token("font.heading.xxsmall") }}
					className="text-text-subtlest"
				>
					{title}
				</span>
				<div className="flex items-center gap-1">
					{typeof badge === "number" && badge > 0 ? (
						<span
							className="inline-flex min-w-[24px] items-center justify-center rounded-xs bg-bg-neutral px-1 text-xs text-text"
							style={{ height: 16 }}
						>
							{badge}
						</span>
					) : null}
					{showAdd ? (
						<div className="w-0 overflow-hidden opacity-0 transition-all duration-normal ease-out group-hover/section:w-5 group-hover/section:opacity-100">
							<span
								role="button"
								tabIndex={-1}
								className="flex size-5 items-center justify-center rounded text-icon-subtle transition-colors hover:bg-bg-neutral-hovered hover:text-text"
								onClick={(e) => {
									e.stopPropagation();
								}}
								aria-label={`Add ${title.toLowerCase()}`}
							>
								<AddIcon label="" size="small" />
							</span>
						</div>
					) : null}
					{open ? (
						<span className="flex size-5 items-center justify-center rounded text-icon-subtle">
							<ChevronDownIcon label="" color="currentColor" size="small" />
						</span>
					) : (
						<span className="flex size-5 items-center justify-center rounded text-icon-subtle">
							<ChevronRightIcon label="" color="currentColor" size="small" />
						</span>
					)}
				</div>
			</button>
			{open ? (
				<div className="flex max-h-48 flex-col gap-0.5 overflow-y-auto px-2 pb-2">
					{children}
				</div>
			) : null}
		</div>
	);
}

function SidebarItemRow({
	name,
	isBuiltIn,
}: Readonly<{
	name: string;
	isBuiltIn: boolean;
}>) {
	return (
		<div className="group flex w-full items-center gap-1 rounded-md px-2 py-1.5 text-left text-sm text-text transition-colors hover:bg-bg-neutral">
			<button
				type="button"
				className={cn(
					"flex-1 truncate text-left",
					isBuiltIn ? "cursor-default" : "cursor-pointer",
				)}
			>
				{name}
			</button>
			{isBuiltIn ? (
				<span className="shrink-0 text-xs text-text-subtlest">Built-in</span>
			) : null}
			<button
				type="button"
				className="shrink-0 text-text-subtlest opacity-0 transition-opacity hover:text-text group-hover:opacity-100"
				title={`Download ${name}`}
			>
				<DownloadIcon label="Download" size="small" />
			</button>
		</div>
	);
}

function SectionEmptyState({
	title,
	description,
}: Readonly<{ title: string; description: string }>) {
	return (
		<Empty width="narrow" className="gap-3 py-4">
			<EmptyHeader>
				<EmptyTitle headingSize="xsmall">{title}</EmptyTitle>
				<EmptyDescription>{description}</EmptyDescription>
			</EmptyHeader>
		</Empty>
	);
}
