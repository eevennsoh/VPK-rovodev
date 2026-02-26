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
import type { MakerSkill, MakerSkillInput, MakerAgent } from "@/lib/maker-config-types";
import {
	generateSlug,
	validateSkillName,
	validateSkillDescription,
	SKILL_DESCRIPTION_MAX,
} from "@/lib/maker-config-types";

interface SkillDialogProps {
	open: boolean;
	skill: MakerSkill | null;
	agents: MakerAgent[];
	onOpenChange: (open: boolean) => void;
	onSave: (data: MakerSkillInput) => Promise<unknown>;
	onDelete?: (name: string) => void;
}

export default function SkillDialog({
	open,
	skill,
	agents,
	onOpenChange,
	onSave,
	onDelete,
}: Readonly<SkillDialogProps>) {
	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent size="lg" showCloseButton>
				{open ? (
					<SkillDialogForm
						skill={skill}
						agents={agents}
						onOpenChange={onOpenChange}
						onSave={onSave}
						onDelete={onDelete}
					/>
				) : null}
			</DialogContent>
		</Dialog>
	);
}

interface SkillDialogFormProps {
	skill: MakerSkill | null;
	agents: MakerAgent[];
	onOpenChange: (open: boolean) => void;
	onSave: (data: MakerSkillInput) => Promise<unknown>;
	onDelete?: (name: string) => void;
}

function SkillDialogForm({
	skill,
	agents,
	onOpenChange,
	onSave,
	onDelete,
}: Readonly<SkillDialogFormProps>) {
	const [name, setName] = useState(skill?.name ?? "");
	const [description, setDescription] = useState(skill?.description ?? "");
	const [content, setContent] = useState(skill?.content ?? "");
	const [isSaving, setIsSaving] = useState(false);
	const [nameError, setNameError] = useState<string | null>(null);
	const [descError, setDescError] = useState<string | null>(null);

	const isEditing = skill !== null;
	const slug = generateSlug(name);
	const equippedByAgents = agents.filter((a) => a.skills.includes(skill?.name ?? ""));

	const validateAndSubmit = useCallback(async () => {
		const nameErr = validateSkillName(name);
		const descErr = validateSkillDescription(description);
		setNameError(nameErr);
		setDescError(descErr);
		if (nameErr || descErr) return;

		setIsSaving(true);
		await onSave({
			name: name.trim(),
			description: description.trim(),
			content: content.trim(),
		});
		setIsSaving(false);
		onOpenChange(false);
	}, [name, description, content, onSave, onOpenChange]);

	const handleDelete = useCallback(() => {
		if (!skill || !onDelete) return;
		onDelete(skill.name);
	}, [skill, onDelete]);

	return (
		<>
			<DialogHeader>
				<DialogTitle>{isEditing ? "Edit Skill" : "Create Skill"}</DialogTitle>
			</DialogHeader>

			<div className="flex flex-col gap-4">
				<div className="flex flex-col gap-1.5">
					<Label htmlFor="skill-name">Name</Label>
					<Input
						id="skill-name"
						placeholder="e.g. Deploy, Code Review"
						value={name}
						onChange={(e) => {
							setName(e.currentTarget.value);
							if (nameError) setNameError(null);
						}}
						onBlur={() => setNameError(validateSkillName(name))}
					/>
					{slug ? (
						<p className="text-xs text-text-subtlest">
							Slug: {slug}
						</p>
					) : null}
					{nameError ? (
						<p className="text-xs text-text-danger">{nameError}</p>
					) : null}
				</div>

				<div className="flex flex-col gap-1.5">
					<Label htmlFor="skill-description">Description</Label>
					<Input
						id="skill-description"
						placeholder="What this skill does and when to use it"
						value={description}
						onChange={(e) => {
							setDescription(e.currentTarget.value);
							if (descError) setDescError(null);
						}}
						onBlur={() => setDescError(validateSkillDescription(description))}
					/>
					<p className="text-xs text-text-subtlest">
						{description.length}/{SKILL_DESCRIPTION_MAX} characters
					</p>
					{descError ? (
						<p className="text-xs text-text-danger">{descError}</p>
					) : null}
				</div>

				<div className="flex flex-col gap-1.5">
					<Label htmlFor="skill-content">Instructions</Label>
					<Textarea
						id="skill-content"
						placeholder="Markdown instructions that Claude follows when this skill is invoked..."
						value={content}
						onChange={(e) => setContent(e.currentTarget.value)}
						rows={10}
						isMonospaced
						className="min-h-[200px] max-h-[320px] overflow-y-auto"
					/>
				</div>

				{isEditing && equippedByAgents.length > 0 ? (
					<div className="flex flex-col gap-1">
						<Label>Equipped by</Label>
						<p className="text-sm text-text-subtle">
							{equippedByAgents.map((a) => a.name).join(", ")}
						</p>
					</div>
				) : null}
			</div>

			<DialogFooter>
				{isEditing && onDelete && !skill?.isBuiltIn ? (
					<Button
						variant="destructive"
						onClick={handleDelete}
						disabled={isSaving}
						className="mr-auto"
					>
						Delete
					</Button>
				) : null}
				{skill?.isBuiltIn ? (
					<p className="mr-auto text-xs text-text-subtlest">
						Built-in skill — cannot be deleted
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
					onClick={validateAndSubmit}
					disabled={isSaving || !name.trim() || !description.trim()}
				>
					{isEditing ? "Save" : "Create"}
				</Button>
			</DialogFooter>
		</>
	);
}
