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
import type {
	PlanSkill,
	PlanSkillInput,
} from "@/lib/agents-team-config-types";

interface SkillDialogProps {
	open: boolean;
	skill: PlanSkill | null;
	onOpenChange: (open: boolean) => void;
	onSave: (data: PlanSkillInput) => Promise<unknown>;
	onDelete?: (id: string) => Promise<unknown>;
}

export default function SkillDialog({
	open,
	skill,
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
	skill: PlanSkill | null;
	onOpenChange: (open: boolean) => void;
	onSave: (data: PlanSkillInput) => Promise<unknown>;
	onDelete?: (id: string) => Promise<unknown>;
}

function SkillDialogForm({
	skill,
	onOpenChange,
	onSave,
	onDelete,
}: Readonly<SkillDialogFormProps>) {
	const [name, setName] = useState(skill?.name ?? "");
	const [description, setDescription] = useState(skill?.description ?? "");
	const [content, setContent] = useState(skill?.content ?? "");
	const [isSaving, setIsSaving] = useState(false);

	const isEditing = skill !== null;

	const handleSave = useCallback(async () => {
		if (!name.trim() || !description.trim()) return;
		setIsSaving(true);
		await onSave({ name: name.trim(), description: description.trim(), content: content.trim() });
		setIsSaving(false);
		onOpenChange(false);
	}, [name, description, content, onSave, onOpenChange]);

	const handleDelete = useCallback(async () => {
		if (!skill || !onDelete) return;
		setIsSaving(true);
		await onDelete(skill.id);
		setIsSaving(false);
		onOpenChange(false);
	}, [skill, onDelete, onOpenChange]);

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
						placeholder="e.g. deploy, code-review"
						value={name}
						onChange={(e) => setName(e.currentTarget.value)}
					/>
				</div>

				<div className="flex flex-col gap-1.5">
					<Label htmlFor="skill-description">Description</Label>
					<Input
						id="skill-description"
						placeholder="What this skill does and when to use it"
						value={description}
						onChange={(e) => setDescription(e.currentTarget.value)}
					/>
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
			</div>

			<DialogFooter>
				{isEditing && onDelete && !skill?.isDefault ? (
					<Button
						variant="destructive"
						onClick={handleDelete}
						disabled={isSaving}
						className="mr-auto"
					>
						Delete
					</Button>
				) : null}
				{skill?.isDefault ? (
					<p className="mr-auto text-xs text-text-subtlest">
						Default skill — cannot be deleted
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
