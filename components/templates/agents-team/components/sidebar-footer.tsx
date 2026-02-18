"use client";

import { token } from "@/lib/tokens";
import { Button } from "@/components/ui/button";
import ChevronRightIcon from "@atlaskit/icon/core/chevron-right";
import ChevronDownIcon from "@atlaskit/icon/core/chevron-down";
import AddIcon from "@atlaskit/icon/core/add";
import type { AgentsTeamSkill, AgentsTeamAgent } from "@/lib/agents-team-config-types";
import { useState } from "react";

interface SidebarFooterProps {
	skills: AgentsTeamSkill[];
	agents: AgentsTeamAgent[];
	onEditSkill: (skill: AgentsTeamSkill) => void;
	onNewSkill: () => void;
	onEditAgent: (agent: AgentsTeamAgent) => void;
	onNewAgent: () => void;
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
}: Readonly<SidebarFooterProps>) {
	const [skillsOpen, setSkillsOpen] = useState(false);
	const [agentsOpen, setAgentsOpen] = useState(false);

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
			<div className="border-t border-border">
				<button
					type="button"
					className="flex h-10 w-full items-center justify-between px-4 pr-3 text-left transition-colors hover:bg-bg-neutral"
					onClick={() => setSkillsOpen((prev) => !prev)}
				>
					<span
						style={{ font: token("font.heading.xxsmall") }}
						className="text-text-subtlest"
					>
						Skills
					</span>
					{skillsOpen ? (
						<ChevronDownIcon label="" color="currentColor" size="small" />
					) : (
						<ChevronRightIcon label="" color="currentColor" size="small" />
					)}
				</button>
				{skillsOpen ? (
					<div className="flex flex-col gap-0.5 px-2 pb-2">
						{skills.map((skill) => (
							<button
								key={skill.id}
								type="button"
								className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm text-text transition-colors hover:bg-bg-neutral"
								onClick={() => onEditSkill(skill)}
							>
								<span className="truncate">{skill.name}</span>
							</button>
						))}
						<Button
							variant="ghost"
							size="sm"
							className="w-full justify-start gap-2 text-text-subtlest"
							onClick={handleNewSkill}
						>
							<AddIcon label="" size="small" />
							Add skill
						</Button>
					</div>
				) : null}
			</div>

			{/* Agents section */}
			<div className="border-t border-border">
				<button
					type="button"
					className="flex h-10 w-full items-center justify-between px-4 pr-3 text-left transition-colors hover:bg-bg-neutral"
					onClick={() => setAgentsOpen((prev) => !prev)}
				>
					<span
						style={{ font: token("font.heading.xxsmall") }}
						className="text-text-subtlest"
					>
						Agents
					</span>
					{agentsOpen ? (
						<ChevronDownIcon label="" color="currentColor" size="small" />
					) : (
						<ChevronRightIcon label="" color="currentColor" size="small" />
					)}
				</button>
				{agentsOpen ? (
					<div className="flex flex-col gap-0.5 px-2 pb-2">
						{agents.map((agent) => (
							<button
								key={agent.id}
								type="button"
								className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm text-text transition-colors hover:bg-bg-neutral"
								onClick={() => onEditAgent(agent)}
							>
								<span className="truncate">{agent.name}</span>
							</button>
						))}
						<Button
							variant="ghost"
							size="sm"
							className="w-full justify-start gap-2 text-text-subtlest"
							onClick={handleNewAgent}
						>
							<AddIcon label="" size="small" />
							Add agent
						</Button>
					</div>
				) : null}
			</div>

			{/* Bottom label */}
			<div className="flex items-center justify-center border-t border-border p-3">
				<span className="text-xs text-text-subtlest">
					Rovo • Concept
				</span>
			</div>
		</div>
	);
}
