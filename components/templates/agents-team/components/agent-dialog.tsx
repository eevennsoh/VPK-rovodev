"use client";

import { useCallback, useState } from "react";
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import type {
	PlanAgent,
	PlanAgentInput,
	PlanSkill,
} from "@/lib/agents-team-config-types";

const MODEL_OPTIONS = [
	{ value: "sonnet", label: "Sonnet" },
	{ value: "opus", label: "Opus" },
	{ value: "haiku", label: "Haiku" },
] as const;

interface AgentDialogProps {
	open: boolean;
	agent: PlanAgent | null;
	availableSkills: PlanSkill[];
	onOpenChange: (open: boolean) => void;
	onSave: (data: PlanAgentInput) => Promise<unknown>;
	onDelete?: (id: string) => Promise<unknown>;
}

export default function AgentDialog({
	open,
	agent,
	availableSkills,
	onOpenChange,
	onSave,
	onDelete,
}: Readonly<AgentDialogProps>) {
	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent size="lg" showCloseButton>
				{open ? (
					<AgentDialogForm
						agent={agent}
						availableSkills={availableSkills}
						onOpenChange={onOpenChange}
						onSave={onSave}
						onDelete={onDelete}
					/>
				) : null}
			</DialogContent>
		</Dialog>
	);
}

interface AgentDialogFormProps {
	agent: PlanAgent | null;
	availableSkills: PlanSkill[];
	onOpenChange: (open: boolean) => void;
	onSave: (data: PlanAgentInput) => Promise<unknown>;
	onDelete?: (id: string) => Promise<unknown>;
}

function AgentDialogForm({
	agent,
	availableSkills,
	onOpenChange,
	onSave,
	onDelete,
}: Readonly<AgentDialogFormProps>) {
	const [name, setName] = useState(agent?.name ?? "");
	const [description, setDescription] = useState(agent?.description ?? "");
	const [systemPrompt, setSystemPrompt] = useState(agent?.systemPrompt ?? "");
	const [model, setModel] = useState(agent?.model ?? "sonnet");
	const [allowedToolsText, setAllowedToolsText] = useState(agent?.allowedTools?.join(", ") ?? "");
	const [equippedSkillIds, setEquippedSkillIds] = useState<Set<string>>(
		() => new Set(agent?.equippedSkills ?? [])
	);
	const [maxTurns, setMaxTurns] = useState<string>(agent?.maxTurns ? String(agent.maxTurns) : "");
	const [isSaving, setIsSaving] = useState(false);

	const isEditing = agent !== null;

	const handleSkillToggle = useCallback((skillId: string, checked: boolean) => {
		setEquippedSkillIds((prev) => {
			const next = new Set(prev);
			if (checked) {
				next.add(skillId);
			} else {
				next.delete(skillId);
			}
			return next;
		});
	}, []);

	const handleSave = useCallback(async () => {
		if (!name.trim() || !description.trim()) return;

		const allowedTools = allowedToolsText
			.split(",")
			.map((t) => t.trim())
			.filter(Boolean);
		const parsedMaxTurns = maxTurns ? Number.parseInt(maxTurns, 10) : undefined;

		setIsSaving(true);
		await onSave({
			name: name.trim(),
			description: description.trim(),
			systemPrompt: systemPrompt.trim(),
			model,
			allowedTools,
			equippedSkills: Array.from(equippedSkillIds),
			maxTurns: parsedMaxTurns && parsedMaxTurns > 0 ? parsedMaxTurns : undefined,
		});
		setIsSaving(false);
		onOpenChange(false);
	}, [name, description, systemPrompt, model, allowedToolsText, equippedSkillIds, maxTurns, onSave, onOpenChange]);

	const handleDelete = useCallback(async () => {
		if (!agent || !onDelete) return;
		setIsSaving(true);
		await onDelete(agent.id);
		setIsSaving(false);
		onOpenChange(false);
	}, [agent, onDelete, onOpenChange]);

	return (
		<>
			<DialogHeader>
				<DialogTitle>{isEditing ? "Edit Agent" : "Create Agent"}</DialogTitle>
			</DialogHeader>

			<div className="flex flex-col gap-4">
				<div className="flex flex-col gap-1.5">
					<Label htmlFor="agent-name">Name</Label>
					<Input
						id="agent-name"
						placeholder="e.g. code-reviewer, debugger"
						value={name}
						onChange={(e) => setName(e.currentTarget.value)}
					/>
				</div>

				<div className="flex flex-col gap-1.5">
					<Label htmlFor="agent-description">Description</Label>
					<Input
						id="agent-description"
						placeholder="When Claude should delegate to this agent"
						value={description}
						onChange={(e) => setDescription(e.currentTarget.value)}
					/>
				</div>

				<div className="flex flex-col gap-1.5">
					<Label htmlFor="agent-system-prompt">System Prompt</Label>
					<Textarea
						id="agent-system-prompt"
						placeholder="System prompt that guides this agent's behavior..."
						value={systemPrompt}
						onChange={(e) => setSystemPrompt(e.currentTarget.value)}
						rows={8}
						isMonospaced
						className="min-h-[160px] max-h-[320px] overflow-y-auto"
					/>
				</div>

				<div className="grid grid-cols-2 gap-4">
					<div className="flex flex-col gap-1.5">
						<Label htmlFor="agent-model">Model</Label>
						<select
							id="agent-model"
							value={model}
							onChange={(e) => setModel(e.target.value)}
							className="h-8 w-full rounded-lg border border-input bg-bg-input px-2.5 text-sm outline-none transition-colors hover:bg-bg-input-hovered focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
						>
							{MODEL_OPTIONS.map((opt) => (
								<option key={opt.value} value={opt.value}>
									{opt.label}
								</option>
							))}
						</select>
					</div>

					<div className="flex flex-col gap-1.5">
						<Label htmlFor="agent-max-turns">Max Turns</Label>
						<Input
							id="agent-max-turns"
							type="number"
							placeholder="Optional"
							value={maxTurns}
							onChange={(e) => setMaxTurns(e.currentTarget.value)}
							min={1}
						/>
					</div>
				</div>

				<div className="flex flex-col gap-1.5">
					<Label htmlFor="agent-allowed-tools">Allowed Tools</Label>
					<Input
						id="agent-allowed-tools"
						placeholder="Read, Grep, Glob, Bash (comma-separated)"
						value={allowedToolsText}
						onChange={(e) => setAllowedToolsText(e.currentTarget.value)}
					/>
					<p className="text-xs text-text-subtlest">
						Comma-separated list. Leave empty to inherit all tools.
					</p>
				</div>

				{availableSkills.length > 0 ? (
					<div className="flex flex-col gap-1.5">
						<Label>Equipped Skills</Label>
						<div className="flex flex-col gap-2 rounded-lg border border-input p-3">
							{availableSkills.map((skill) => (
								<label
									key={skill.id}
									className="flex items-center gap-2 text-sm cursor-pointer"
								>
									<Checkbox
										checked={equippedSkillIds.has(skill.id)}
										onCheckedChange={(checked) =>
											handleSkillToggle(skill.id, checked === true)
										}
									/>
									<span className="text-text">{skill.name}</span>
									<span className="text-text-subtlest">— {skill.description}</span>
								</label>
							))}
						</div>
						<p className="text-xs text-text-subtlest">
							Equipped skill content is injected into task prompts at execution time.
						</p>
					</div>
				) : null}
			</div>

			<DialogFooter>
				{isEditing && onDelete && !agent?.isDefault ? (
					<Button
						variant="destructive"
						onClick={handleDelete}
						disabled={isSaving}
						className="mr-auto"
					>
						Delete
					</Button>
				) : null}
				{agent?.isDefault ? (
					<p className="mr-auto text-xs text-text-subtlest">
						Default agent — cannot be deleted
					</p>
				) : null}
				<Button
					variant="outline"
					onClick={() => onOpenChange(false)}
					disabled={isSaving}
				>
					Cancel
				</Button>
				<Button
					onClick={handleSave}
					disabled={isSaving || !name.trim() || !description.trim()}
				>
					{isEditing ? "Save" : "Create"}
				</Button>
			</DialogFooter>
		</>
	);
}
