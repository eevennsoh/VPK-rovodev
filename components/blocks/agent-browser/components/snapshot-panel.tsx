"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2Icon, RefreshCwIcon, XIcon } from "lucide-react";
import { API_ENDPOINTS } from "@/lib/api-config";

interface SnapshotPanelProps {
	onClose: () => void;
}

interface SnapshotResponse {
	snapshot: string;
	state: {
		url: string;
		title: string;
	};
}

export function SnapshotPanel({ onClose }: Readonly<SnapshotPanelProps>) {
	const [snapshot, setSnapshot] = useState<string | null>(null);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const fetchSnapshot = useCallback(async () => {
		setLoading(true);
		setError(null);

		try {
			const response = await fetch(
				API_ENDPOINTS.chromiumPreviewSnapshot(true),
				{ cache: "no-store" },
			);

			if (!response.ok) {
				const text = await response.text();
				throw new Error(text || "Failed to fetch snapshot");
			}

			const data = (await response.json()) as SnapshotResponse;
			setSnapshot(data.snapshot);
		} catch (caughtError) {
			setError(
				caughtError instanceof Error
					? caughtError.message
					: "Failed to fetch snapshot",
			);
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		void fetchSnapshot();
	}, [fetchSnapshot]);

	return (
		<div className="flex h-full flex-col bg-background">
			{/* Header */}
			<div className="flex items-center justify-between border-b border-border px-3 py-2">
				<span className="text-xs font-medium text-text">
					Accessibility Snapshot
				</span>
				<div className="flex items-center gap-1">
					<button
						type="button"
						onClick={() => void fetchSnapshot()}
						disabled={loading}
						className="rounded-md p-1 text-text-subtle hover:bg-surface-raised hover:text-text transition-colors disabled:opacity-50"
						aria-label="Refresh snapshot"
					>
						<RefreshCwIcon className="size-3.5" />
					</button>
					<button
						type="button"
						onClick={onClose}
						className="rounded-md p-1 text-text-subtle hover:bg-surface-raised hover:text-text transition-colors"
						aria-label="Close snapshot panel"
					>
						<XIcon className="size-3.5" />
					</button>
				</div>
			</div>

			{/* Content */}
			<div className="min-h-0 flex-1 overflow-auto p-3">
				{loading && !snapshot ? (
					<div className="flex h-full flex-col items-center justify-center gap-3 text-center">
						<Loader2Icon className="size-6 animate-spin text-text-subtle" />
						<p className="text-xs text-text-subtlest">
							Capturing accessibility tree…
						</p>
					</div>
				) : error ? (
					<div className="flex h-full flex-col items-center justify-center gap-3 text-center">
						<p className="text-xs text-text-subtle">{error}</p>
						<button
							type="button"
							onClick={() => void fetchSnapshot()}
							className="text-xs text-brand hover:underline"
						>
							Retry
						</button>
					</div>
				) : snapshot ? (
					<pre className="min-h-0 overflow-auto rounded-lg border border-border bg-surface-raised p-3 font-mono text-xs leading-relaxed whitespace-pre-wrap text-text">
						{snapshot}
					</pre>
				) : (
					<div className="flex h-full items-center justify-center">
						<p className="text-xs text-text-subtlest">No snapshot available</p>
					</div>
				)}
			</div>
		</div>
	);
}
