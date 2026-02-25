"use client";

import { useCallback, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import UploadIcon from "@atlaskit/icon/core/upload";

interface ImportDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	type: "skill" | "agent";
	onImport: (content: string) => Promise<void>;
}

export default function ImportDialog({
	open,
	onOpenChange,
	type,
	onImport,
}: Readonly<ImportDialogProps>) {
	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent size="md" showCloseButton>
				{open ? (
					<ImportDialogForm
						type={type}
						onOpenChange={onOpenChange}
						onImport={onImport}
					/>
				) : null}
			</DialogContent>
		</Dialog>
	);
}

interface ImportDialogFormProps {
	type: "skill" | "agent";
	onOpenChange: (open: boolean) => void;
	onImport: (content: string) => Promise<void>;
}

function ImportDialogForm({
	type,
	onOpenChange,
	onImport,
}: Readonly<ImportDialogFormProps>) {
	const [content, setContent] = useState("");
	const [fileName, setFileName] = useState<string | null>(null);
	const [isImporting, setIsImporting] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [isDragOver, setIsDragOver] = useState(false);
	const fileInputRef = useRef<HTMLInputElement>(null);

	const label = type === "skill" ? "Skill" : "Agent";

	const handleFileContent = useCallback((file: File) => {
		if (!file.name.endsWith(".md")) {
			setError("Please select a .md (Markdown) file");
			return;
		}
		const reader = new FileReader();
		reader.onload = (e) => {
			const text = e.target?.result;
			if (typeof text === "string") {
				setContent(text);
				setFileName(file.name);
				setError(null);
			}
		};
		reader.onerror = () => {
			setError("Failed to read file");
		};
		reader.readAsText(file);
	}, []);

	const handleDrop = useCallback(
		(e: React.DragEvent) => {
			e.preventDefault();
			setIsDragOver(false);
			const file = e.dataTransfer.files[0];
			if (file) handleFileContent(file);
		},
		[handleFileContent]
	);

	const handleDragOver = useCallback((e: React.DragEvent) => {
		e.preventDefault();
		setIsDragOver(true);
	}, []);

	const handleDragLeave = useCallback(() => {
		setIsDragOver(false);
	}, []);

	const handleFileInputChange = useCallback(
		(e: React.ChangeEvent<HTMLInputElement>) => {
			const file = e.target.files?.[0];
			if (file) handleFileContent(file);
		},
		[handleFileContent]
	);

	const handleImport = useCallback(async () => {
		if (!content.trim()) {
			setError("Content is required");
			return;
		}
		setIsImporting(true);
		setError(null);
		try {
			await onImport(content);
			onOpenChange(false);
		} catch {
			setError("Import failed. Please check the content format.");
		} finally {
			setIsImporting(false);
		}
	}, [content, onImport, onOpenChange]);

	return (
		<>
			<DialogHeader>
				<DialogTitle>Import {label}</DialogTitle>
			</DialogHeader>

			<div className="flex flex-col gap-4">
				{/* File drop zone */}
				<div
					className={cn(
						"flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-6 transition-colors cursor-pointer",
						isDragOver
							? "border-border-focused bg-bg-neutral"
							: "border-border hover:border-border-bold"
					)}
					onDrop={handleDrop}
					onDragOver={handleDragOver}
					onDragLeave={handleDragLeave}
					onClick={() => fileInputRef.current?.click()}
					onKeyDown={(e) => {
						if (e.key === "Enter" || e.key === " ") fileInputRef.current?.click();
					}}
					role="button"
					tabIndex={0}
				>
					<UploadIcon label="" size="medium" />
					<p className="text-sm text-text-subtle">
						{fileName
							? fileName
							: "Drop a .md file here or click to browse"}
					</p>
					<input
						ref={fileInputRef}
						type="file"
						accept=".md"
						className="hidden"
						onChange={handleFileInputChange}
					/>
				</div>

				{/* Divider */}
				<div className="flex items-center gap-3">
					<div className="flex-1 border-t border-border" />
					<span className="text-xs text-text-subtlest">or paste content</span>
					<div className="flex-1 border-t border-border" />
				</div>

				{/* Paste textarea */}
				<div className="flex flex-col gap-1.5">
					<Label htmlFor="import-content">Raw Markdown</Label>
					<Textarea
						id="import-content"
						placeholder={`Paste ${type === "skill" ? "SKILL.md" : "agent .md"} content here...`}
						value={content}
						onChange={(e) => {
							setContent(e.currentTarget.value);
							setFileName(null);
							if (error) setError(null);
						}}
						rows={10}
						isMonospaced
						className="min-h-[160px] max-h-[280px] overflow-y-auto"
					/>
				</div>

				{error ? (
					<p className="text-xs text-text-danger">{error}</p>
				) : null}
			</div>

			<DialogFooter>
				<Button
					variant="outline"
					onClick={() => onOpenChange(false)}
					disabled={isImporting}
				>
					Cancel
				</Button>
				<Button
					onClick={handleImport}
					disabled={isImporting || !content.trim()}
				>
					{isImporting ? "Importing..." : "Import"}
				</Button>
			</DialogFooter>
		</>
	);
}
