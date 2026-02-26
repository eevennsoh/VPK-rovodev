"use client";

import { useState } from "react";
import { token } from "@/lib/tokens";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import ChevronRightIcon from "@atlaskit/icon/core/chevron-right";
import ChevronDownIcon from "@atlaskit/icon/core/chevron-down";
import AddIcon from "@atlaskit/icon/core/add";
import DownloadIcon from "@atlaskit/icon/core/download";
import UploadIcon from "@atlaskit/icon/core/upload";
import type { PlanSkill, PlanAgent } from "@/lib/plan-config-types";

interface SidebarFooterProps {
	skills: PlanSkill[];
	agents: PlanAgent[];
	onEditSkill: (skill: PlanSkill) => void;
	onNewSkill: () => void;
	onEditAgent: (agent: PlanAgent) => void;
	onNewAgent: () => void;
	onExportSkill: (name: string) => void;
	onExportAgent: (name: string) => void;
	onImportSkill: () => void;
	onImportAgent: () => void;
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
	skills,
	agents,
	onEditSkill,
	onNewSkill,
	onEditAgent,
	onNewAgent,
	onExportSkill,
	onExportAgent,
	onImportSkill,
	onImportAgent,
}: Readonly<SidebarFooterProps>) {
	const [skillsOpen, setSkillsOpen] = useState(false);
	const [agentsOpen, setAgentsOpen] = useState(false);

	const sortedSkills = [...skills].sort((a, b) => a.name.localeCompare(b.name));
	const sortedAgents = [...agents].sort((a, b) => a.name.localeCompare(b.name));

	const handleNewSkill = () => {
		onNewSkill();
		focusComposerInput();
	};

	const handleNewAgent = () => {
		onNewAgent();
		focusComposerInput();
	};

	return (
		<div className="flex flex-col">
			{/* Skills section */}
			<CollapsibleSection
				title="Skills"
				open={skillsOpen}
				onToggle={() => setSkillsOpen((prev) => !prev)}
			>
				{sortedSkills.map((skill) => (
					<SidebarItemRow
						key={skill.name}
						name={skill.name}
						isBuiltIn={skill.isBuiltIn}
						onEdit={() => onEditSkill(skill)}
						onExport={() => onExportSkill(skill.name)}
					/>
				))}
				<div className="flex gap-1">
					<Button
						variant="ghost"
						size="sm"
						className="flex-1 justify-start gap-2 text-text-subtlest"
						onClick={handleNewSkill}
					>
						<AddIcon label="" size="small" />
						Add skill
					</Button>
					<Button
						variant="ghost"
						size="icon-sm"
						className="text-text-subtlest"
						onClick={onImportSkill}
						title="Import skill"
					>
						<UploadIcon label="Import" size="small" />
					</Button>
				</div>
			</CollapsibleSection>

			{/* Agents section */}
			<CollapsibleSection
				title="Agents"
				open={agentsOpen}
				onToggle={() => setAgentsOpen((prev) => !prev)}
			>
				{sortedAgents.map((agent) => (
					<SidebarItemRow
						key={agent.name}
						name={agent.name}
						isBuiltIn={agent.isBuiltIn}
						onEdit={() => onEditAgent(agent)}
						onExport={() => onExportAgent(agent.name)}
					/>
				))}
				<div className="flex gap-1">
					<Button
						variant="ghost"
						size="sm"
						className="flex-1 justify-start gap-2 text-text-subtlest"
						onClick={handleNewAgent}
					>
						<AddIcon label="" size="small" />
						Add agent
					</Button>
					<Button
						variant="ghost"
						size="icon-sm"
						className="text-text-subtlest"
						onClick={onImportAgent}
						title="Import agent"
					>
						<UploadIcon label="Import" size="small" />
					</Button>
				</div>
			</CollapsibleSection>

			{/* Bottom label */}
			<div className="flex items-center justify-center border-t border-border p-3">
				<span className="text-xs text-text-subtlest">
					Rovo • Concept
				</span>
			</div>
		</div>
	);
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function CollapsibleSection({
	title,
	open,
	onToggle,
	children,
}: Readonly<{
	title: string;
	open: boolean;
	onToggle: () => void;
	children: React.ReactNode;
}>) {
	return (
		<div className="border-t border-border">
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
				{open ? (
					<ChevronDownIcon label="" color="currentColor" size="small" />
				) : (
					<ChevronRightIcon label="" color="currentColor" size="small" />
				)}
			</button>
			{open ? (
				<div className="flex flex-col gap-0.5 px-2 pb-2">
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
