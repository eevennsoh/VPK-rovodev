"use client";

import { useCallback, useState } from "react";
import {
	WebPreview,
	WebPreviewNavigation,
	WebPreviewNavigationButton,
	WebPreviewUrl,
} from "@/components/ui-ai/web-preview";
import { ArrowLeft, ArrowRight, ExternalLink, Loader2Icon, RotateCw, TreePine, XIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type PreviewTab = "browser" | "snapshot";

interface BrowserPreviewPanelProps {
	currentUrl: string | null;
	latestScreenshot: string | null;
	latestSnapshot: string | null;
	isToolRunning: boolean;
	onClose: () => void;
}

export function BrowserPreviewPanel({
	currentUrl,
	latestScreenshot,
	latestSnapshot,
	isToolRunning,
	onClose,
}: Readonly<BrowserPreviewPanelProps>) {
	const [activeTab, setActiveTab] = useState<PreviewTab>("browser");

	const handleOpenInNewTab = useCallback(() => {
		if (currentUrl) {
			window.open(currentUrl, "_blank", "noopener,noreferrer");
		}
	}, [currentUrl]);

	return (
		<div className="flex h-full min-h-0 w-full min-w-0 flex-col bg-background">
			{/* Tab bar + close */}
			<div className="flex items-center justify-between border-b border-border px-2 py-1.5">
				<div className="flex gap-1">
					{(["browser", "snapshot"] as const).map((tab) => (
						<button
							key={tab}
							type="button"
							onClick={() => setActiveTab(tab)}
							className={cn(
								"rounded-md px-3 py-1 text-xs font-medium capitalize transition-colors",
								activeTab === tab
									? "bg-muted text-foreground shadow-sm"
									: "text-muted-foreground hover:text-foreground hover:bg-muted/50",
							)}
						>
							{tab === "snapshot" ? (
								<span className="flex items-center gap-1">
									<TreePine className="size-3" />
									Snapshot
								</span>
							) : (
								tab
							)}
						</button>
					))}
				</div>
				<WebPreviewNavigationButton tooltip="Close" onClick={onClose}>
					<XIcon className="size-4" />
				</WebPreviewNavigationButton>
			</div>

			{/* Content */}
			<div className="min-h-0 flex-1 overflow-hidden">
				{activeTab === "browser" ? (
					<WebPreview
						proxy
						defaultUrl={currentUrl ?? ""}
						className="h-full rounded-none border-0 shadow-none"
					>
						<WebPreviewNavigation>
							<WebPreviewNavigationButton tooltip="Back" disabled>
								<ArrowLeft className="size-4" />
							</WebPreviewNavigationButton>
							<WebPreviewNavigationButton tooltip="Forward" disabled>
								<ArrowRight className="size-4" />
							</WebPreviewNavigationButton>
							<WebPreviewNavigationButton tooltip="Reload" disabled>
								<RotateCw className="size-4" />
							</WebPreviewNavigationButton>
							<WebPreviewUrl value={currentUrl ?? ""} readOnly />
							<WebPreviewNavigationButton tooltip="Open in new tab" onClick={handleOpenInNewTab}>
								<ExternalLink className="size-4" />
							</WebPreviewNavigationButton>
						</WebPreviewNavigation>
						<div className="relative min-h-0 flex-1 overflow-auto bg-muted/20">
							{latestScreenshot ? (
								<>
									{/* eslint-disable-next-line @next/next/no-img-element */}
									<img
										src={latestScreenshot}
										alt="Browser screenshot"
										className="w-full h-auto"
									/>
									{isToolRunning ? (
										<div className="absolute inset-0 flex items-center justify-center bg-background/60 backdrop-blur-sm">
											<Loader2Icon className="size-8 animate-spin text-muted-foreground" />
										</div>
									) : null}
								</>
							) : (
								<div className="flex h-full flex-col items-center justify-center gap-3 text-center p-8">
									{isToolRunning ? (
										<Loader2Icon className="size-8 animate-spin text-muted-foreground" />
									) : null}
									<p className="text-sm text-muted-foreground">
										{isToolRunning
											? "Waiting for browser activity…"
											: "No browser activity yet. The agent's browser view will appear here."}
									</p>
								</div>
							)}
						</div>
					</WebPreview>
				) : (
					<div className="flex h-full flex-col overflow-auto p-4">
						{latestSnapshot ? (
							<pre className="min-h-0 flex-1 overflow-auto rounded-lg border border-border bg-muted/30 p-4 font-mono text-xs leading-relaxed whitespace-pre-wrap">
								{latestSnapshot}
							</pre>
						) : (
							<div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
								{isToolRunning ? (
									<Loader2Icon className="size-8 animate-spin text-muted-foreground" />
								) : null}
								<p className="text-sm text-muted-foreground">
									{isToolRunning
										? "Capturing accessibility tree…"
										: "No snapshots yet."}
								</p>
							</div>
						)}
					</div>
				)}
			</div>
		</div>
	);
}
