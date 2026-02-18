"use client";

import { useMemo, useState } from "react";
import LinkExternalIcon from "@atlaskit/icon/core/link-external";
import CopyIcon from "@atlaskit/icon/core/copy";
import DownloadIcon from "@atlaskit/icon/core/download";
import type { AgentRunArtifact } from "@/lib/agents-team-run-types";
import { Button } from "@/components/ui/button";

interface RunFilesTabProps {
	artifacts: AgentRunArtifact[];
	isLoading?: boolean;
	error?: string | null;
}

const ARTIFACT_TYPE_LABELS: Record<AgentRunArtifact["type"], string> = {
	"summary-md": "Summary",
	"visual-html": "Visual",
	"genui-json": "GenUI",
	audio: "Audio",
	"task-output": "Task output",
	link: "Link",
};

function formatDateTime(value: string | null | undefined): string {
	if (!value) {
		return "-";
	}

	const parsedDate = new Date(value);
	if (Number.isNaN(parsedDate.valueOf())) {
		return value;
	}

	return new Intl.DateTimeFormat(undefined, {
		dateStyle: "medium",
		timeStyle: "short",
	}).format(parsedDate);
}

function formatSizeBytes(sizeBytes: number | undefined): string {
	if (typeof sizeBytes !== "number" || !Number.isFinite(sizeBytes) || sizeBytes < 0) {
		return "-";
	}

	if (sizeBytes < 1024) {
		return `${sizeBytes} B`;
	}

	if (sizeBytes < 1024 * 1024) {
		return `${(sizeBytes / 1024).toFixed(1)} KB`;
	}

	return `${(sizeBytes / (1024 * 1024)).toFixed(1)} MB`;
}

function toDownloadUrl(url: string | undefined): string | null {
	if (!url) {
		return null;
	}

	return `${url}${url.includes("?") ? "&" : "?"}download=1`;
}

function getSortedArtifacts(artifacts: AgentRunArtifact[]): AgentRunArtifact[] {
	return [...artifacts].sort((left, right) => {
		if (left.iteration !== right.iteration) {
			return right.iteration - left.iteration;
		}

		const leftTimestamp = Date.parse(left.createdAt);
		const rightTimestamp = Date.parse(right.createdAt);
		if (Number.isFinite(leftTimestamp) && Number.isFinite(rightTimestamp)) {
			return rightTimestamp - leftTimestamp;
		}

		return right.createdAt.localeCompare(left.createdAt);
	});
}

export function RunFilesTab({ artifacts, isLoading = false, error = null }: Readonly<RunFilesTabProps>) {
	const [copiedArtifactId, setCopiedArtifactId] = useState<string | null>(null);
	const sortedArtifacts = useMemo(() => getSortedArtifacts(artifacts), [artifacts]);

	const handleCopyLink = async (artifact: AgentRunArtifact) => {
		if (!artifact.url) {
			return;
		}

		try {
			await navigator.clipboard.writeText(artifact.url);
			setCopiedArtifactId(artifact.id);
			window.setTimeout(() => {
				setCopiedArtifactId((previous) => (previous === artifact.id ? null : previous));
			}, 1200);
		} catch {
			setCopiedArtifactId(null);
		}
	};

	if (isLoading && artifacts.length === 0) {
		return <p className="text-sm text-text-subtle">Loading files…</p>;
	}

	if (error && artifacts.length === 0) {
		return <p className="text-sm text-text-danger">{error}</p>;
	}

	if (artifacts.length === 0) {
		return <p className="text-sm text-text-subtle">No artifacts have been generated yet.</p>;
	}

	return (
		<div className="flex flex-col gap-2">
			{error ? <p className="text-xs text-text-danger">{error}</p> : null}
			<div className="flex flex-col divide-y divide-border">
				{sortedArtifacts.map((artifact) => (
					<div key={artifact.id} className="flex flex-wrap items-start justify-between gap-3 py-3">
						<div className="min-w-0 flex-1">
							<div className="flex flex-wrap items-center gap-2">
								<span className="rounded bg-bg-neutral px-1.5 py-0.5 text-xs text-text-subtle">
									{ARTIFACT_TYPE_LABELS[artifact.type]}
								</span>
								{artifact.taskId ? (
									<span className="rounded bg-bg-neutral px-1.5 py-0.5 text-xs text-text-subtle">
										{artifact.taskId}
									</span>
								) : null}
							</div>
							<p className="mt-2 truncate text-sm font-medium text-text">{artifact.title}</p>
							<p className="mt-1 text-xs text-text-subtlest">
								Created {formatDateTime(artifact.createdAt)} · {formatSizeBytes(artifact.sizeBytes)}
							</p>
						</div>
						<div className="flex flex-wrap items-center gap-2">
							{artifact.url ? (
								<a href={artifact.url} target="_blank" rel="noreferrer" className="inline-flex">
									<Button size="sm" variant="outline">
										<LinkExternalIcon label="" size="small" />
										Open
									</Button>
								</a>
							) : null}
							{artifact.type !== "link" && artifact.url ? (
								<a href={toDownloadUrl(artifact.url) || artifact.url} className="inline-flex">
									<Button size="sm" variant="outline">
										<DownloadIcon label="" size="small" />
										Download
									</Button>
								</a>
							) : null}
							{artifact.type === "link" && artifact.url ? (
								<Button
									size="sm"
									variant="outline"
									onClick={() => {
										void handleCopyLink(artifact);
									}}
								>
									<CopyIcon label="" size="small" />
									{copiedArtifactId === artifact.id ? "Copied" : "Copy URL"}
								</Button>
							) : null}
						</div>
					</div>
				))}
			</div>
		</div>
	);
}
