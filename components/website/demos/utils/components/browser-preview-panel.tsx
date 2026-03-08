"use client";

import { useState } from "react";
import {
	WebPreview,
	WebPreviewNavigation,
	WebPreviewUrl,
	WebPreviewBody,
} from "@/components/ui-ai/web-preview";
import { Button } from "@/components/ui/button";
import { Loader2Icon, XIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type PreviewTab = "browser" | "screenshot" | "snapshot";

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

	return (
		<div className="flex h-full min-h-0 w-full min-w-0 flex-col bg-background">
			{/* Tab bar + close */}
			<div className="flex items-center justify-between border-b border-border px-2 py-1.5">
				<div className="flex gap-1">
					{(["browser", "screenshot", "snapshot"] as const).map((tab) => (
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
							{tab}
						</button>
					))}
				</div>
				<Button onClick={onClose} size="icon-sm" type="button" variant="ghost">
					<XIcon className="size-4" />
					<span className="sr-only">Close</span>
				</Button>
			</div>

			{/* Content */}
			<div className="min-h-0 flex-1 overflow-hidden">
				{activeTab === "browser" ? (
					<WebPreview
						defaultUrl={currentUrl ?? ""}
						className="h-full rounded-none border-0 shadow-none"
					>
						<WebPreviewNavigation>
							<WebPreviewUrl readOnly value={currentUrl ?? ""} />
						</WebPreviewNavigation>
						<WebPreviewBody src={currentUrl ?? undefined} />
					</WebPreview>
				) : activeTab === "screenshot" ? (
					<div className="flex h-full flex-col items-center justify-center overflow-auto p-4">
						{latestScreenshot ? (
							<div className="relative flex items-center justify-center overflow-hidden rounded-lg border border-border bg-muted/30">
								{/* eslint-disable-next-line @next/next/no-img-element */}
								<img
									src={latestScreenshot}
									alt="Browser screenshot"
									className="h-auto max-w-full"
								/>
								{isToolRunning ? (
									<div className="absolute inset-0 flex items-center justify-center bg-background/60 backdrop-blur-sm">
										<Loader2Icon className="size-8 animate-spin text-muted-foreground" />
									</div>
								) : null}
							</div>
						) : (
							<div className="flex flex-col items-center gap-3 text-center">
								{isToolRunning ? (
									<Loader2Icon className="size-8 animate-spin text-muted-foreground" />
								) : null}
								<p className="text-sm text-muted-foreground">
									{isToolRunning
										? "Taking screenshot…"
										: "No screenshots yet."}
								</p>
							</div>
						)}
					</div>
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
