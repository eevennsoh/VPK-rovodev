"use client";

import { CodeBlock } from "@/components/ui-ai/code-block";
import { MessageResponse } from "@/components/ui-ai/message";
import { Button } from "@/components/ui/button";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
	formatFutureChatVersionLabel,
	getFutureChatVersionTitle,
} from "@/components/projects/future-chat/lib/future-chat-version-labels";
import type { FutureChatDocument } from "@/lib/future-chat-types";
import { CopyIcon, PencilLineIcon, SaveIcon, Trash2Icon, XIcon } from "lucide-react";
import Image from "next/image";

interface FutureChatArtifactPanelProps {
	document: FutureChatDocument;
	draftContent: string;
	isStreamingArtifact?: boolean;
	mode: "preview" | "edit";
	onClose: () => void;
	onDelete: () => Promise<void>;
	onDraftChange: (value: string) => void;
	onModeChange: (mode: "preview" | "edit") => void;
	onSave: () => Promise<void>;
	onVersionChange: (versionId: string | null) => void;
	selectedVersionId: string | null;
}

function inferFutureChatCodeLanguage(code: string): "html" | "css" | "tsx" {
	if (/<!doctype html>|<html[\s>]|<head[\s>]|<body[\s>]|<style[\s>]/iu.test(code)) {
		return "html";
	}

	if (/^\s*[.#@]?[a-z0-9_-]+\s*\{[\s\S]*\}\s*$/imu.test(code)) {
		return "css";
	}

	return "tsx";
}

export function FutureChatArtifactPanel({
	document,
	draftContent,
	isStreamingArtifact = false,
	mode,
	onClose,
	onDelete,
	onDraftChange,
	onModeChange,
	onSave,
	onVersionChange,
	selectedVersionId,
}: Readonly<FutureChatArtifactPanelProps>) {
	const selectedVersion =
		document.versions.find((version) => version.id === selectedVersionId)
		?? document.versions[document.versions.length - 1]
		?? null;
	const selectedVersionTitle = getFutureChatVersionTitle({
		document,
		version: selectedVersion,
	});
	const previewContent =
		isStreamingArtifact && draftContent.trim().length > 0
			? draftContent
			: selectedVersion?.content ?? "";
	const versionLabel = isStreamingArtifact
		? "Generating artifact..."
		: selectedVersion
		? formatFutureChatVersionLabel({
			document,
			version: selectedVersion,
		})
		: `${document.kind} artifact`;

	return (
		<div className="flex h-full min-h-0 w-full min-w-0 flex-col bg-background">
			<div className="flex flex-wrap items-start justify-between gap-3 border-border/80 border-b bg-background/90 p-3 backdrop-blur">
				<div className="flex min-w-0 items-start gap-2">
					<Button onClick={onClose} size="icon-sm" type="button" variant="ghost">
						<XIcon className="size-4" />
					</Button>
					<div className="min-w-0">
						<div className="flex items-center gap-2">
							<p className="truncate font-medium text-sm">{selectedVersionTitle}</p>
							<span className="rounded-full bg-bg-neutral px-2 py-0.5 text-[11px] text-text-subtle uppercase">
								{document.kind}
							</span>
						</div>
						<p className="truncate text-text-subtle text-sm">{versionLabel}</p>
					</div>
				</div>

				<div className="flex flex-wrap items-center gap-2">
					{!isStreamingArtifact && document.versions.length > 0 ? (
						<Select
							onValueChange={(value) => onVersionChange(value)}
							value={selectedVersion?.id ?? undefined}
						>
							<SelectTrigger className="h-8 min-w-[240px] max-w-[320px] bg-background">
								<SelectValue placeholder="Choose a version">
									{selectedVersion
										? formatFutureChatVersionLabel({
											document,
											version: selectedVersion,
										})
										: "Choose a version"}
								</SelectValue>
							</SelectTrigger>
							<SelectContent>
								{document.versions
									.slice()
									.reverse()
									.map((version) => (
										<SelectItem key={version.id} value={version.id}>
											{formatFutureChatVersionLabel({
												document,
												version,
											})}
										</SelectItem>
									))}
							</SelectContent>
						</Select>
					) : null}

					<Button
						disabled={isStreamingArtifact}
						onClick={() => onModeChange(mode === "preview" ? "edit" : "preview")}
						size="sm"
						type="button"
						variant="outline"
					>
						<PencilLineIcon className="size-4" />
						{mode === "preview" ? "Edit" : "Preview"}
					</Button>
					<Button
						onClick={() => void navigator.clipboard.writeText(previewContent)}
						size="icon-sm"
						type="button"
						variant="ghost"
					>
						<CopyIcon className="size-4" />
					</Button>
					<Button
						disabled={isStreamingArtifact}
						onClick={() => void onDelete()}
						size="icon-sm"
						type="button"
						variant="ghost"
					>
						<Trash2Icon className="size-4" />
					</Button>
				</div>
			</div>

			<div className="min-h-0 flex-1 overflow-auto bg-surface">
				<div className="mx-auto flex h-full w-full max-w-[1280px] flex-col p-4 md:p-6">
					<div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-[24px] border border-border bg-background shadow-sm">
						{mode === "edit" && !isStreamingArtifact ? (
							<>
								<Textarea
									className="min-h-[50vh] flex-1 resize-none rounded-none border-0 p-4 shadow-none focus-visible:ring-0"
									onChange={(event) => onDraftChange(event.currentTarget.value)}
									value={draftContent}
								/>
								<div className="flex items-center justify-between border-border/70 border-t bg-bg-neutral/40 px-4 py-3">
									<p className="text-text-subtle text-xs">
										Saving creates a new local version for this artifact.
									</p>
									<Button onClick={() => void onSave()} size="sm" type="button">
										<SaveIcon className="size-4" />
										Save version
									</Button>
								</div>
							</>
						) : (
							<div className="min-h-0 flex-1 overflow-auto p-4 md:p-6">
								{document.kind === "code" ? (
									<CodeBlock
										code={previewContent}
										language={inferFutureChatCodeLanguage(previewContent)}
									/>
								) : document.kind === "image" && /^https?:|^data:image\//u.test(previewContent) ? (
									<div className="flex h-full min-h-[320px] items-center justify-center rounded-2xl border border-border bg-surface-raised p-4">
										<Image
											alt={selectedVersionTitle}
											className="h-auto max-w-full rounded-md"
											height={900}
											src={previewContent}
											unoptimized
											width={1200}
										/>
									</div>
								) : (
									<MessageResponse isAnimating={isStreamingArtifact}>
										{previewContent}
									</MessageResponse>
								)}
							</div>
						)}
					</div>
				</div>
			</div>
		</div>
	);
}
