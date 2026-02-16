"use client";

import { useState } from "react";
import {
	WebPreview,
	WebPreviewNavigation,
	WebPreviewNavigationButton,
	WebPreviewUrl,
	WebPreviewBody,
	WebPreviewConsole,
} from "@/components/ui-ai/web-preview";
import { ArrowLeft, ArrowRight, RotateCw, Maximize2 } from "lucide-react";

const EXAMPLE_URL = "https://example.com";

export function WebPreviewDemoBasic() {
	return (
		<WebPreview defaultUrl={EXAMPLE_URL} className="h-[400px]">
			<WebPreviewNavigation>
				<WebPreviewNavigationButton tooltip="Back" disabled>
					<ArrowLeft className="size-4" />
				</WebPreviewNavigationButton>
				<WebPreviewNavigationButton tooltip="Forward" disabled>
					<ArrowRight className="size-4" />
				</WebPreviewNavigationButton>
				<WebPreviewNavigationButton tooltip="Reload">
					<RotateCw className="size-4" />
				</WebPreviewNavigationButton>
				<WebPreviewUrl />
			</WebPreviewNavigation>
			<WebPreviewBody />
		</WebPreview>
	);
}

const SAMPLE_LOGS = [
	{ level: "log" as const, message: "Page loaded successfully", timestamp: new Date("2025-01-15T10:30:00") },
	{ level: "warn" as const, message: "Deprecated API usage detected", timestamp: new Date("2025-01-15T10:30:02") },
	{ level: "error" as const, message: "Failed to fetch resource: 404 Not Found", timestamp: new Date("2025-01-15T10:30:04") },
];

export function WebPreviewDemoWithConsole() {
	return (
		<WebPreview defaultUrl={EXAMPLE_URL} className="h-[400px]">
			<WebPreviewNavigation>
				<WebPreviewNavigationButton tooltip="Back" disabled>
					<ArrowLeft className="size-4" />
				</WebPreviewNavigationButton>
				<WebPreviewNavigationButton tooltip="Forward" disabled>
					<ArrowRight className="size-4" />
				</WebPreviewNavigationButton>
				<WebPreviewNavigationButton tooltip="Reload">
					<RotateCw className="size-4" />
				</WebPreviewNavigationButton>
				<WebPreviewUrl />
			</WebPreviewNavigation>
			<WebPreviewBody />
			<WebPreviewConsole logs={SAMPLE_LOGS} />
		</WebPreview>
	);
}

export function WebPreviewDemoFullscreen() {
	return (
		<WebPreview defaultUrl={EXAMPLE_URL} className="h-[400px]">
			<WebPreviewNavigation>
				<WebPreviewNavigationButton tooltip="Back" disabled>
					<ArrowLeft className="size-4" />
				</WebPreviewNavigationButton>
				<WebPreviewNavigationButton tooltip="Forward" disabled>
					<ArrowRight className="size-4" />
				</WebPreviewNavigationButton>
				<WebPreviewNavigationButton tooltip="Reload">
					<RotateCw className="size-4" />
				</WebPreviewNavigationButton>
				<WebPreviewUrl />
				<WebPreviewNavigationButton tooltip="Full screen">
					<Maximize2 className="size-4" />
				</WebPreviewNavigationButton>
			</WebPreviewNavigation>
			<WebPreviewBody />
		</WebPreview>
	);
}

export function WebPreviewDemoUrlChange() {
	const [lastUrl, setLastUrl] = useState(EXAMPLE_URL);

	return (
		<div className="w-full space-y-3">
			<div className="text-sm text-muted-foreground">
				Last navigated URL: <code className="rounded bg-muted px-1 py-0.5">{lastUrl}</code>
			</div>
			<WebPreview defaultUrl={EXAMPLE_URL} onUrlChange={setLastUrl} className="h-[400px]">
				<WebPreviewNavigation>
					<WebPreviewNavigationButton tooltip="Back" disabled>
						<ArrowLeft className="size-4" />
					</WebPreviewNavigationButton>
					<WebPreviewNavigationButton tooltip="Forward" disabled>
						<ArrowRight className="size-4" />
					</WebPreviewNavigationButton>
					<WebPreviewNavigationButton tooltip="Reload">
						<RotateCw className="size-4" />
					</WebPreviewNavigationButton>
					<WebPreviewUrl />
				</WebPreviewNavigation>
				<WebPreviewBody />
			</WebPreview>
		</div>
	);
}

export default function WebPreviewDemo() {
	return <WebPreviewDemoBasic />;
}
