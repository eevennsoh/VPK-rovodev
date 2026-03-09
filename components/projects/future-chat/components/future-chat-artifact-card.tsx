"use client";

import type { FutureChatDocument } from "@/lib/future-chat-types";
import type { FutureChatStreamingArtifact } from "@/components/projects/future-chat/lib/future-chat-streaming-artifact";
import { cn } from "@/lib/utils";
import {
	CodeIcon,
	FileTextIcon,
	ImageIcon,
	LoaderCircleIcon,
	SheetIcon,
} from "lucide-react";
import { useRef } from "react";

interface FutureChatArtifactCardProps {
	activeDocumentId: string | null;
	document: FutureChatDocument | null;
	onOpen: (documentId: string, element: HTMLElement) => void;
	streamingArtifact: FutureChatStreamingArtifact | null;
}

const KIND_LABELS: Record<string, string> = {
	code: "Code",
	image: "Image",
	sheet: "Sheet",
	text: "Document",
};

function KindIcon({ kind }: Readonly<{ kind: string }>) {
	switch (kind) {
		case "code":
			return <CodeIcon className="size-4" />;
		case "image":
			return <ImageIcon className="size-4" />;
		case "sheet":
			return <SheetIcon className="size-4" />;
		default:
			return <FileTextIcon className="size-4" />;
	}
}

export function FutureChatArtifactCard({
	activeDocumentId,
	document,
	onOpen,
	streamingArtifact,
}: Readonly<FutureChatArtifactCardProps>) {
	const cardRef = useRef<HTMLButtonElement>(null);
	const isStreaming = streamingArtifact !== null;
	const title = streamingArtifact?.title ?? document?.title ?? "Artifact";
	const kind = streamingArtifact?.kind ?? document?.kind ?? "text";
	const documentId = streamingArtifact?.documentId ?? document?.id ?? null;
	const isActive = documentId !== null && documentId === activeDocumentId;

	const handleClick = () => {
		if (!documentId || !cardRef.current) {
			return;
		}
		onOpen(documentId, cardRef.current);
	};

	return (
		<button
			ref={cardRef}
			className={cn(
				"group/artifact-card flex w-fit max-w-[min(100%,450px)] cursor-pointer items-center gap-2 rounded-2xl border bg-surface-raised px-3 py-2 text-left transition-colors hover:bg-surface-raised-hovered",
				isActive ? "border-brand" : "border-border",
			)}
			onClick={handleClick}
			type="button"
		>
			<div className="flex size-5 shrink-0 items-center justify-center text-text-subtle">
				{isStreaming ? (
					<LoaderCircleIcon className="size-4 animate-spin" />
				) : (
					<KindIcon kind={kind} />
				)}
			</div>

			<span className="min-w-0 truncate text-sm font-medium text-text">
				{title}
			</span>

			<span className="shrink-0 rounded-full border border-border/70 bg-background px-2 py-0.5 text-[11px] text-text-subtle uppercase tracking-[0.16em]">
				{KIND_LABELS[kind] ?? "Document"}
			</span>
		</button>
	);
}
