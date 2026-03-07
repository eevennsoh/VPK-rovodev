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
import type { FutureChatDocument } from "@/lib/future-chat-types";
import { formatDistanceToNow } from "date-fns";
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
	const previewContent =
		isStreamingArtifact && draftContent.trim().length > 0
			? draftContent
			: selectedVersion?.content ?? "";
	const versionLabel = isStreamingArtifact
		? "Generating artifact..."
		: selectedVersion
		? `Updated ${formatDistanceToNow(new Date(selectedVersion.createdAt), {
			addSuffix: true,
		})}`
		: `${document.kind} artifact`;

	return (
		<div className="fixed inset-0 z-40 flex flex-col bg-background md:relative md:z-0 md:min-w-0 md:flex-1 md:border-l md:bg-muted/30">
			<div className="flex flex-wrap items-start justify-between gap-3 border-b bg-background/95 p-2 backdrop-blur md:bg-muted/30">
				<div className="flex min-w-0 items-start gap-2">
					<Button onClick={onClose} size="icon-sm" type="button" variant="ghost">
						<XIcon className="size-4" />
					</Button>
					<div className="min-w-0">
						<p className="truncate font-medium text-sm">{document.title}</p>
						<p className="truncate text-muted-foreground text-sm">{versionLabel}</p>
					</div>
				</div>

				<div className="flex flex-wrap items-center gap-2">
					{!isStreamingArtifact && document.versions.length > 0 ? (
						<Select
							onValueChange={(value) => onVersionChange(value)}
							value={selectedVersion?.id ?? undefined}
						>
							<SelectTrigger className="h-8 min-w-[140px] bg-background md:bg-white">
								<SelectValue placeholder="Choose a version" />
							</SelectTrigger>
							<SelectContent>
								{document.versions
									.slice()
									.reverse()
									.map((version, index) => (
										<SelectItem key={version.id} value={version.id}>
											Version {document.versions.length - index}
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

			<div className="min-h-0 flex-1 overflow-auto bg-background md:bg-muted/30">
				<div className="mx-auto flex h-full w-full max-w-[1100px] flex-col p-4 md:p-6">
					<div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-border bg-background shadow-sm">
						{mode === "edit" && !isStreamingArtifact ? (
							<>
								<Textarea
									className="min-h-[50vh] flex-1 resize-none rounded-none border-0 p-4 shadow-none focus-visible:ring-0"
									onChange={(event) => onDraftChange(event.currentTarget.value)}
									value={draftContent}
								/>
								<div className="flex items-center justify-between border-t bg-muted/40 px-4 py-3">
									<p className="text-muted-foreground text-xs">
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
									<CodeBlock code={previewContent} language="tsx" />
								) : document.kind === "image" && /^https?:|^data:image\//u.test(previewContent) ? (
									<Image
										alt={document.title}
										className="h-auto max-w-full rounded-md"
										height={900}
										src={previewContent}
										unoptimized
										width={1200}
									/>
								) : (
									<MessageResponse>{previewContent}</MessageResponse>
								)}
							</div>
						)}
					</div>
				</div>
			</div>
		</div>
	);
}
