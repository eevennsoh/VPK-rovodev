"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { token } from "@/lib/tokens";
import { cn } from "@/lib/utils";
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
import { Spinner } from "@/components/ui/spinner";
import type { MakeSkill, MakeAgent } from "@/lib/make-config-types";
import type { MakeSidebarAppItem } from "@/components/projects/make/lib/make-artifact-items";

interface SidebarFooterProps {
	apps: MakeSidebarAppItem[];
	skills: MakeSkill[];
	agents: MakeAgent[];
	onEditSkill: (skill: MakeSkill) => void;
	onNewSkill: () => void;
	onEditAgent: (agent: MakeAgent) => void;
	onNewAgent: () => void;
	onExportSkill: (name: string) => void;
	onExportAgent: (name: string) => void;
	onSelectApp?: (runId: string) => void;
}

function focusComposerInput() {
	requestAnimationFrame(() => {
		const textarea = document.querySelector<HTMLTextAreaElement>(
			'textarea[aria-label="Chat message input"]'
		);
		textarea?.focus();
	});
}

export default function SidebarFooter({
	apps,
	skills,
	agents,
	onEditSkill,
	onNewSkill,
	onEditAgent,
	onNewAgent,
	onExportSkill,
	onExportAgent,
	onSelectApp,
}: Readonly<SidebarFooterProps>) {
	const [skillsOpen, setSkillsOpen] = useState(false);
	const [agentsOpen, setAgentsOpen] = useState(false);
	const [appsOpen, setAppsOpen] = useState(false);
	const [automationOpen, setAutomationOpen] = useState(false);

	const sortedSkills = useMemo(() => [...skills].sort((a, b) => a.name.localeCompare(b.name)), [skills]);
	const sortedAgents = useMemo(() => [...agents].sort((a, b) => a.name.localeCompare(b.name)), [agents]);
	const sortedApps = useMemo(
		() =>
			[...apps].sort(
				(leftApp, rightApp) =>
					Date.parse(rightApp.updatedAt) - Date.parse(leftApp.updatedAt),
			),
		[apps],
	);

	const handleNewSkill = () => {
		onNewSkill();
		focusComposerInput();
	};

	const handleNewAgent = () => {
		onNewAgent();
		focusComposerInput();
	};

	return (
		<div className="flex h-full flex-col">
			<div className="flex-1 overflow-y-auto border-t border-border [&>*:first-child]:border-t-0">
				{/* Apps section */}
				<CollapsibleSection
					title="Apps"
					badge={sortedApps.length}
					open={appsOpen}
					onToggle={() => setAppsOpen((prev) => !prev)}
				>
					{sortedApps.length > 0 ? (
						sortedApps.map((app) => (
							<SidebarAppItemRow
								key={app.runId}
								name={app.title}
								status={app.status}
								onSelect={onSelectApp ? () => onSelectApp(app.runId) : undefined}
							/>
						))
					) : (
						<SectionEmptyState
							title="No apps yet"
							description="Build and publish apps to see them here."
						/>
					)}
				</CollapsibleSection>

				{/* Agents section */}
				<CollapsibleSection
					title="Agents"
					badge={sortedAgents.length}
					open={agentsOpen}
					onToggle={() => setAgentsOpen((prev) => !prev)}
					onAdd={handleNewAgent}
				>
					{sortedAgents.length > 0 ? (
						sortedAgents.map((agent) => (
							<SidebarItemRow
								key={agent.name}
								name={agent.name}
								isBuiltIn={agent.isBuiltIn}
								onEdit={() => onEditAgent(agent)}
								onExport={() => onExportAgent(agent.name)}
							/>
						))
					) : (
						<SectionEmptyState
							title="No agents yet"
							description="Create an agent to give Make specialized capabilities."
						/>
					)}
				</CollapsibleSection>

				{/* Automation section */}
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

				{/* Skills section */}
				<CollapsibleSection
					title="Skills"
					badge={sortedSkills.length}
					open={skillsOpen}
					onToggle={() => setSkillsOpen((prev) => !prev)}
					onAdd={handleNewSkill}
				>
					{sortedSkills.length > 0 ? (
						sortedSkills.map((skill) => (
							<SidebarItemRow
								key={skill.name}
								name={skill.name}
								isBuiltIn={skill.isBuiltIn}
								onEdit={() => onEditSkill(skill)}
								onExport={() => onExportSkill(skill.name)}
							/>
						))
					) : (
						<SectionEmptyState
							title="No skills yet"
							description="Create a skill to teach Make new reusable actions."
						/>
					)}
				</CollapsibleSection>
			</div>

			{/* View all link — always pinned */}
			<div className="shrink-0 border-t border-border">
				<Link
					href="/make/artifacts"
					className="flex h-10 w-full items-center justify-center text-xs text-text-subtlest no-underline transition-colors hover:bg-bg-neutral hover:no-underline"
				>
					View all artifacts
				</Link>
			</div>
		</div>
	);
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function CollapsibleSection({
	title,
	badge,
	open,
	onToggle,
	onAdd,
	children,
}: Readonly<{
	title: string;
	badge?: number;
	open: boolean;
	onToggle: () => void;
	onAdd?: () => void;
	children?: React.ReactNode;
}>) {
	return (
		<div className="group/section border-t border-border">
			<div className="flex h-10 shrink-0 w-full items-center justify-between px-4 pr-3 text-left transition-colors hover:bg-bg-neutral">
				<button
					type="button"
					className="min-w-0 flex-1 text-left"
					onClick={onToggle}
					aria-expanded={open}
					aria-label={`${open ? "Collapse" : "Expand"} ${title}`}
				>
					<span
						style={{ font: token("font.heading.xxsmall"), lineHeight: 1 }}
						className="text-text-subtlest"
					>
						{title}
					</span>
				</button>
				<div className="flex items-center gap-1">
					{typeof badge === "number" && badge > 0 ? (
						<span className="inline-flex min-w-[24px] items-center justify-center rounded-xs bg-bg-neutral px-1 text-xs text-text transition-[margin] duration-normal ease-out group-hover/section:mr-0" style={{ height: 16 }}>
							{badge}
						</span>
					) : null}
					<div
						className="w-0 overflow-hidden opacity-0 transition-all duration-normal ease-out group-hover/section:w-5 group-hover/section:opacity-100"
					>
						<button
							type="button"
							tabIndex={-1}
							className="flex size-5 items-center justify-center rounded text-icon-subtle transition-colors hover:bg-bg-neutral-hovered hover:text-text"
							onClick={onAdd}
							aria-label={`Add ${title.toLowerCase()}`}
						>
							<AddIcon label="" size="small" />
						</button>
					</div>
					<button
						type="button"
						tabIndex={-1}
						className="flex size-5 items-center justify-center rounded text-icon-subtle"
						onClick={onToggle}
						aria-label={`${open ? "Collapse" : "Expand"} ${title}`}
					>
						{open ? (
							<ChevronDownIcon label="" color="currentColor" size="small" />
						) : (
							<ChevronRightIcon label="" color="currentColor" size="small" />
						)}
					</button>
				</div>
			</div>
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
	onEdit,
	onExport,
}: Readonly<{
	name: string;
	isBuiltIn: boolean;
	onEdit: () => void;
	onExport: () => void;
}>) {
	return (
		<div className="group flex w-full items-center gap-1 rounded-md px-2 py-1.5 text-left text-sm text-text transition-colors hover:bg-bg-neutral">
			<button
				type="button"
				className={cn(
					"flex-1 truncate text-left",
					isBuiltIn ? "cursor-default" : "cursor-pointer"
				)}
				onClick={isBuiltIn ? undefined : onEdit}
			>
				{name}
			</button>
			{isBuiltIn ? (
				<span className="shrink-0 text-xs text-text-subtlest">Built-in</span>
			) : null}
			<button
				type="button"
				className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity text-text-subtlest hover:text-text"
				onClick={(e) => {
					e.stopPropagation();
					onExport();
				}}
				title={`Download ${name}`}
			>
				<DownloadIcon label="Download" size="small" />
			</button>
		</div>
	);
}

function SidebarAppItemRow({
	name,
	status,
	onSelect,
}: Readonly<{
	name: string;
	status: "running" | "completed";
	onSelect?: () => void;
}>) {
	return (
		<div className="group flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm text-text transition-colors hover:bg-bg-neutral">
			<button
				type="button"
				className={cn(
					"min-w-0 flex-1 truncate text-left",
					onSelect ? "cursor-pointer" : "cursor-default",
				)}
				onClick={onSelect}
				title={name}
			>
				{name}
			</button>
			{status === "running" ? (
				<Spinner size="xs" label="Running" className="text-text-subtlest" />
			) : null}
		</div>
	);
}

function SectionEmptyState({ title, description }: Readonly<{ title: string; description: string }>) {
	return (
		<Empty width="narrow" className="gap-3 px-2 pt-4 pb-2">
			<EmptyHeader>
				<EmptyTitle headingSize="xsmall">{title}</EmptyTitle>
				<EmptyDescription>{description}</EmptyDescription>
			</EmptyHeader>
		</Empty>
	);
}
