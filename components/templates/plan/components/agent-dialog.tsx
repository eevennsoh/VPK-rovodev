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
import CopyIcon from "@atlaskit/icon/core/copy";
import type {
	PlanAgent,
	PlanAgentInput,
	PlanSkill,
} from "@/lib/agents-team-config-types";
import {
	generateSlug,
	validateSkillName,
	validateSkillDescription,
	SKILLS_PER_AGENT_SOFT_LIMIT,
} from "@/lib/agents-team-config-types";

const MODEL_OPTIONS = [
	{ value: "inherit", label: "Inherit" },
	{ value: "sonnet", label: "Sonnet" },
	{ value: "opus", label: "Opus" },
	{ value: "haiku", label: "Haiku" },
] as const;

const PERMISSION_MODE_OPTIONS = [
	{ value: "default", label: "Default" },
	{ value: "acceptEdits", label: "Accept Edits" },
	{ value: "dontAsk", label: "Don't Ask" },
	{ value: "bypassPermissions", label: "Bypass Permissions" },
	{ value: "plan", label: "Plan" },
] as const;

interface AgentDialogProps {
	open: boolean;
	agent: PlanAgent | null;
	availableSkills: PlanSkill[];
	availableTools: string[];
	onOpenChange: (open: boolean) => void;
	onSave: (data: PlanAgentInput) => Promise<unknown>;
	onDelete?: (name: string) => void;
	onDuplicate?: (agent: PlanAgent) => void;
}

export default function AgentDialog({
	open,
	agent,
	availableSkills,
	availableTools,
	onOpenChange,
	onSave,
	onDelete,
	onDuplicate,
}: Readonly<AgentDialogProps>) {
	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent size="lg" showCloseButton>
				{open ? (
					<AgentDialogForm
						agent={agent}
						availableSkills={availableSkills}
						availableTools={availableTools}
						onOpenChange={onOpenChange}
						onSave={onSave}
						onDelete={onDelete}
						onDuplicate={onDuplicate}
					/>
				) : null}
			</DialogContent>
		</Dialog>
	);
}

interface AgentDialogFormProps {
	agent: PlanAgent | null;
	availableSkills: PlanSkill[];
	availableTools: string[];
	onOpenChange: (open: boolean) => void;
	onSave: (data: PlanAgentInput) => Promise<unknown>;
	onDelete?: (name: string) => void;
	onDuplicate?: (agent: PlanAgent) => void;
}

function AgentDialogForm({
	agent,
	availableSkills,
	availableTools,
	onOpenChange,
	onSave,
	onDelete,
	onDuplicate,
}: Readonly<AgentDialogFormProps>) {
	const [name, setName] = useState(agent?.name ?? "");
	const [description, setDescription] = useState(agent?.description ?? "");
	const [systemPrompt, setSystemPrompt] = useState(agent?.systemPrompt ?? "");
	const [model, setModel] = useState(agent?.model ?? "inherit");
	const [maxTurns, setMaxTurns] = useState<string>(agent?.maxTurns ? String(agent.maxTurns) : "");
	const [permissionMode, setPermissionMode] = useState(agent?.permissionMode ?? "default");
	const [disallowedToolsText, setDisallowedToolsText] = useState(
		agent?.disallowedTools?.join(", ") ?? ""
	);
	const [isSaving, setIsSaving] = useState(false);
	const [nameError, setNameError] = useState<string | null>(null);
	const [descError, setDescError] = useState<string | null>(null);

	// Tools state — use checkbox list if MCP tools available, fallback to text input
	const hasMcpTools = availableTools.length > 0;
	const [selectedTools, setSelectedTools] = useState<Set<string>>(
		() => new Set(agent?.tools ?? [])
	);
	const [toolsText, setToolsText] = useState(agent?.tools?.join(", ") ?? "");

	// Skills state
	const [equippedSkillNames, setEquippedSkillNames] = useState<Set<string>>(
		() => new Set(agent?.skills ?? [])
	);

	const isEditing = agent !== null;
	const slug = generateSlug(name);
	const skillCount = equippedSkillNames.size;

	const handleSkillToggle = useCallback((skillName: string, checked: boolean) => {
		setEquippedSkillNames((prev) => {
			const next = new Set(prev);
			if (checked) {
				next.add(skillName);
			} else {
				next.delete(skillName);
			}
			return next;
		});
	}, []);

	const handleToolToggle = useCallback((tool: string, checked: boolean) => {
		setSelectedTools((prev) => {
			const next = new Set(prev);
			if (checked) {
				next.add(tool);
			} else {
				next.delete(tool);
			}
			return next;
		});
	}, []);

	const handleSave = useCallback(async () => {
		const nameErr = validateSkillName(name);
		const descErr = validateSkillDescription(description);
		setNameError(nameErr);
		setDescError(descErr);
		if (nameErr || descErr) return;

		const tools = hasMcpTools
			? Array.from(selectedTools)
			: toolsText.split(",").map((t) => t.trim()).filter(Boolean);
		const disallowedTools = disallowedToolsText
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
			tools,
			skills: Array.from(equippedSkillNames),
			disallowedTools: disallowedTools.length > 0 ? disallowedTools : undefined,
			maxTurns: parsedMaxTurns && parsedMaxTurns > 0 ? parsedMaxTurns : undefined,
			permissionMode: permissionMode !== "default" ? permissionMode : undefined,
		});
		setIsSaving(false);
		onOpenChange(false);
	}, [
		name, description, systemPrompt, model, hasMcpTools,
		selectedTools, toolsText, equippedSkillNames, disallowedToolsText,
		maxTurns, permissionMode, onSave, onOpenChange,
	]);

	return (
		<>
			<DialogHeader>
				<DialogTitle>{isEditing ? "Edit Agent" : "Create Agent"}</DialogTitle>
			</DialogHeader>

			<div className="flex flex-col gap-4 max-h-[60vh] overflow-y-auto pr-1">
				<AgentNameField
					name={name}
					slug={slug}
					nameError={nameError}
					onChange={(v) => { setName(v); if (nameError) setNameError(null); }}
					onBlur={() => setNameError(validateSkillName(name))}
				/>

				<AgentDescriptionField
					description={description}
					descError={descError}
					onChange={(v) => { setDescription(v); if (descError) setDescError(null); }}
					onBlur={() => setDescError(validateSkillDescription(description))}
				/>

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

				<div className="grid grid-cols-3 gap-4">
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

					<div className="flex flex-col gap-1.5">
						<Label htmlFor="agent-permission-mode">Permission Mode</Label>
						<select
							id="agent-permission-mode"
							value={permissionMode}
							onChange={(e) => setPermissionMode(e.target.value)}
							className="h-8 w-full rounded-lg border border-input bg-bg-input px-2.5 text-sm outline-none transition-colors hover:bg-bg-input-hovered focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
						>
							{PERMISSION_MODE_OPTIONS.map((opt) => (
								<option key={opt.value} value={opt.value}>
									{opt.label}
								</option>
							))}
						</select>
					</div>
				</div>

				<AgentToolsField
					hasMcpTools={hasMcpTools}
					availableTools={availableTools}
					selectedTools={selectedTools}
					toolsText={toolsText}
					onToolToggle={handleToolToggle}
					onToolsTextChange={setToolsText}
				/>

				<div className="flex flex-col gap-1.5">
					<Label htmlFor="agent-disallowed-tools">Disallowed Tools</Label>
					<Input
						id="agent-disallowed-tools"
						placeholder="Tools to disallow (comma-separated)"
						value={disallowedToolsText}
						onChange={(e) => setDisallowedToolsText(e.currentTarget.value)}
					/>
					<p className="text-xs text-text-subtlest">
						Comma-separated list. These tools are explicitly blocked.
					</p>
				</div>

				<AgentSkillsField
					availableSkills={availableSkills}
					equippedSkillNames={equippedSkillNames}
					skillCount={skillCount}
					onSkillToggle={handleSkillToggle}
				/>
			</div>

			<DialogFooter>
				<div className="mr-auto flex gap-2">
					{isEditing && onDelete && !agent?.isBuiltIn ? (
						<Button
							variant="destructive"
							onClick={() => onDelete(agent.name)}
							disabled={isSaving}
						>
							Delete
						</Button>
					) : null}
					{isEditing && onDuplicate ? (
						<Button
							variant="outline"
							onClick={() => onDuplicate(agent)}
							disabled={isSaving}
						>
							<CopyIcon label="" size="small" />
							Duplicate
						</Button>
					) : null}
					{agent?.isBuiltIn ? (
						<p className="flex items-center text-xs text-text-subtlest">
							Built-in agent — cannot be deleted
						</p>
					) : null}
				</div>
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

// ---------------------------------------------------------------------------
// Sub-components (extracted to keep form under 150 lines)
// ---------------------------------------------------------------------------

function AgentNameField({
	name,
	slug,
	nameError,
	onChange,
	onBlur,
}: Readonly<{
	name: string;
	slug: string;
	nameError: string | null;
	onChange: (value: string) => void;
	onBlur: () => void;
}>) {
	return (
		<div className="flex flex-col gap-1.5">
			<Label htmlFor="agent-name">Name</Label>
			<Input
				id="agent-name"
				placeholder="e.g. Code Reviewer, Debugger"
				value={name}
				onChange={(e) => onChange(e.currentTarget.value)}
				onBlur={onBlur}
			/>
			{slug ? (
				<p className="text-xs text-text-subtlest">Slug: {slug}</p>
			) : null}
			{nameError ? (
				<p className="text-xs text-text-danger">{nameError}</p>
			) : null}
		</div>
	);
}

function AgentDescriptionField({
	description,
	descError,
	onChange,
	onBlur,
}: Readonly<{
	description: string;
	descError: string | null;
	onChange: (value: string) => void;
	onBlur: () => void;
}>) {
	return (
		<div className="flex flex-col gap-1.5">
			<Label htmlFor="agent-description">Description</Label>
			<Input
				id="agent-description"
				placeholder="When Claude should delegate to this agent"
				value={description}
				onChange={(e) => onChange(e.currentTarget.value)}
				onBlur={onBlur}
			/>
			{descError ? (
				<p className="text-xs text-text-danger">{descError}</p>
			) : null}
		</div>
	);
}

function AgentToolsField({
	hasMcpTools,
	availableTools,
	selectedTools,
	toolsText,
	onToolToggle,
	onToolsTextChange,
}: Readonly<{
	hasMcpTools: boolean;
	availableTools: string[];
	selectedTools: Set<string>;
	toolsText: string;
	onToolToggle: (tool: string, checked: boolean) => void;
	onToolsTextChange: (value: string) => void;
}>) {
	if (hasMcpTools) {
		return (
			<div className="flex flex-col gap-1.5">
				<Label>Allowed Tools</Label>
				<div className="flex flex-col gap-2 rounded-lg border border-input p-3 max-h-[160px] overflow-y-auto">
					{availableTools.map((tool) => (
						<label
							key={tool}
							className="flex items-center gap-2 text-sm cursor-pointer"
						>
							<Checkbox
								checked={selectedTools.has(tool)}
								onCheckedChange={(checked) =>
									onToolToggle(tool, checked === true)
								}
							/>
							<span className="text-text font-mono text-xs">{tool}</span>
						</label>
					))}
				</div>
				<p className="text-xs text-text-subtlest">
					Leave all unchecked to inherit all tools.
				</p>
			</div>
		);
	}

	return (
		<div className="flex flex-col gap-1.5">
			<Label htmlFor="agent-allowed-tools">Allowed Tools</Label>
			<Input
				id="agent-allowed-tools"
				placeholder="Read, Grep, Glob, Bash (comma-separated)"
				value={toolsText}
				onChange={(e) => onToolsTextChange(e.currentTarget.value)}
			/>
			<p className="text-xs text-text-subtlest">
				Comma-separated list. Leave empty to inherit all tools.
			</p>
		</div>
	);
}

function AgentSkillsField({
	availableSkills,
	equippedSkillNames,
	skillCount,
	onSkillToggle,
}: Readonly<{
	availableSkills: PlanSkill[];
	equippedSkillNames: Set<string>;
	skillCount: number;
	onSkillToggle: (name: string, checked: boolean) => void;
}>) {
	if (availableSkills.length === 0) return null;

	return (
		<div className="flex flex-col gap-1.5">
			<Label>Equipped Skills</Label>
			{skillCount >= SKILLS_PER_AGENT_SOFT_LIMIT ? (
				<div className="rounded-lg border border-border-warning bg-bg-warning p-2 text-xs text-text-warning">
					{skillCount}+ equipped skills may impact agent performance due to context window usage
				</div>
			) : null}
			<div className="flex flex-col gap-2 rounded-lg border border-input p-3 max-h-[160px] overflow-y-auto">
				{availableSkills.map((skill) => (
					<label
						key={skill.name}
						className="flex items-center gap-2 text-sm cursor-pointer"
					>
						<Checkbox
							checked={equippedSkillNames.has(skill.name)}
							onCheckedChange={(checked) =>
								onSkillToggle(skill.name, checked === true)
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
	);
}
