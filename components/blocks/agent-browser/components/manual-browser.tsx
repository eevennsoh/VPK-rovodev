"use client";

import { useState } from "react";
import { ArrowLeft, ArrowRight, RotateCw, TreePine } from "lucide-react";
import {
	WebPreview,
	WebPreviewNavigation,
	WebPreviewNavigationButton,
	WebPreviewUrl,
	WebPreviewBody,
} from "@/components/ui-ai/web-preview";
import { cn } from "@/lib/utils";
import { SnapshotPanel } from "./snapshot-panel";

export function ManualBrowser() {
	const [snapshotOpen, setSnapshotOpen] = useState(false);

	return (
		<div className="flex h-full">
			{/* Browser viewport */}
			<WebPreview
				engine="chromium"
				defaultUrl="https://example.com"
				className={cn(
					"h-full min-w-0 rounded-none border-0",
					snapshotOpen ? "flex-1" : "w-full",
				)}
			>
				<WebPreviewNavigation>
					<WebPreviewNavigationButton tooltip="Back" action="back">
						<ArrowLeft className="size-4" />
					</WebPreviewNavigationButton>
					<WebPreviewNavigationButton tooltip="Forward" action="forward">
						<ArrowRight className="size-4" />
					</WebPreviewNavigationButton>
					<WebPreviewNavigationButton tooltip="Reload" action="reload">
						<RotateCw className="size-4" />
					</WebPreviewNavigationButton>
					<WebPreviewUrl />
					<WebPreviewNavigationButton
						tooltip={snapshotOpen ? "Hide snapshot" : "Show snapshot"}
						onClick={() => setSnapshotOpen((prev) => !prev)}
					>
						<TreePine
							className={cn(
								"size-4",
								snapshotOpen && "text-brand",
							)}
						/>
					</WebPreviewNavigationButton>
				</WebPreviewNavigation>
				<WebPreviewBody />
			</WebPreview>

			{/* Snapshot side panel */}
			{snapshotOpen ? (
				<div className="w-[400px] shrink-0 border-l border-border">
					<SnapshotPanel onClose={() => setSnapshotOpen(false)} />
				</div>
			) : null}
		</div>
	);
}
