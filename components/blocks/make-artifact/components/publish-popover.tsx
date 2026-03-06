"use client";

import { useCallback, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { token } from "@/lib/tokens";
import { API_ENDPOINTS } from "@/lib/api-config";
import GlobeIcon from "@atlaskit/icon/core/globe";
import CheckCircleIcon from "@atlaskit/icon/core/check-circle";
import CrossCircleIcon from "@atlaskit/icon/core/cross-circle";
import LinkExternalIcon from "@atlaskit/icon/core/link-external";

interface ForgePublishConfig {
	appName: string;
	siteUrl: string;
	product: string;
	lastDeployedAt: string | null;
}

type PublishState =
	| { status: "loading" }
	| { status: "setup"; sites: SiteEntry[] }
	| { status: "publishing"; step: string }
	| { status: "published"; config: ForgePublishConfig }
	| { status: "error"; message: string; canRetry: boolean };

interface SiteEntry {
	siteUrl: string;
	products: string[];
}

interface PublishPopoverProps {
	runId: string;
	defaultAppName: string;
}

function formatTimeAgo(isoString: string): string {
	const diffMs = Date.now() - Date.parse(isoString);
	const diffMinutes = Math.floor(diffMs / 60_000);
	if (diffMinutes < 1) {
		return "Just now";
	}
	if (diffMinutes < 60) {
		return `${diffMinutes} min ago`;
	}
	const diffHours = Math.floor(diffMinutes / 60);
	if (diffHours < 24) {
		return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
	}
	const diffDays = Math.floor(diffHours / 24);
	return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;
}

export function PublishPopover({
	runId,
	defaultAppName,
}: Readonly<PublishPopoverProps>) {
	const [isOpen, setIsOpen] = useState(false);
	const [state, setState] = useState<PublishState>({ status: "loading" });
	const [appName, setAppName] = useState(defaultAppName);
	const [siteUrl, setSiteUrl] = useState("");
	const hasFetchedRef = useRef(false);

	const fetchPublishStatus = useCallback(async () => {
		try {
			const response = await fetch(API_ENDPOINTS.makeRunPublish(runId), {
				cache: "no-store",
			});
			if (!response.ok) {
				setState({
					status: "setup",
					sites: [],
				});
				return;
			}

			const payload = (await response.json()) as {
				status?: string;
				appName?: string;
				siteUrl?: string;
				product?: string;
				lastDeployedAt?: string;
				error?: string;
			};

			if (payload.status === "published") {
				setState({
					status: "published",
					config: {
						appName: payload.appName ?? defaultAppName,
						siteUrl: payload.siteUrl ?? "",
						product: payload.product ?? "jira",
						lastDeployedAt: payload.lastDeployedAt ?? null,
					},
				});
				if (payload.appName) {
					setAppName(payload.appName);
				}
				if (payload.siteUrl) {
					setSiteUrl(payload.siteUrl);
				}
				return;
			}

			if (payload.status === "failed" && payload.error) {
				setState({
					status: "error",
					message: payload.error,
					canRetry: true,
				});
				return;
			}

			// Not published yet — load sites for setup
			setState({ status: "setup", sites: [] });
		} catch {
			setState({ status: "setup", sites: [] });
		}
	}, [runId, defaultAppName]);

	const fetchSites = useCallback(async () => {
		try {
			const response = await fetch(API_ENDPOINTS.MAKE_FORGE_SITES, {
				cache: "no-store",
			});
			if (!response.ok) {
				return;
			}
			const payload = (await response.json()) as { sites?: SiteEntry[] };
			const sites = Array.isArray(payload.sites) ? payload.sites : [];
			setState((prev) => {
				if (prev.status === "setup") {
					return { ...prev, sites };
				}
				return prev;
			});
			if (sites.length > 0 && !siteUrl) {
				setSiteUrl(sites[0].siteUrl);
			}
		} catch {
			// Sites discovery is best-effort
		}
	}, [siteUrl]);

	const loadInitialData = useCallback(async () => {
		if (hasFetchedRef.current) {
			return;
		}
		hasFetchedRef.current = true;
		await fetchPublishStatus();
		await fetchSites();
	}, [fetchPublishStatus, fetchSites]);

	const handleOpenChange = useCallback(
		(nextOpen: boolean) => {
			setIsOpen(nextOpen);
			if (nextOpen) {
				void loadInitialData();
			}
		},
		[loadInitialData],
	);

	const handlePublish = useCallback(async () => {
		if (!appName.trim() || !siteUrl.trim()) {
			return;
		}

		setState({ status: "publishing", step: "Creating Forge app..." });

		try {
			const response = await fetch(API_ENDPOINTS.makeRunPublish(runId), {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					appName: appName.trim(),
					siteUrl: siteUrl.trim(),
					product: "jira",
				}),
			});

			const payload = (await response.json()) as {
				success?: boolean;
				error?: string;
				steps?: Array<{ step: string; message: string }>;
			};

			if (payload.success) {
				setState({
					status: "published",
					config: {
						appName: appName.trim(),
						siteUrl: siteUrl.trim(),
						product: "jira",
						lastDeployedAt: new Date().toISOString(),
					},
				});
			} else {
				setState({
					status: "error",
					message: payload.error ?? "Publishing failed",
					canRetry: true,
				});
			}
		} catch (err) {
			setState({
				status: "error",
				message: err instanceof Error ? err.message : "Publishing failed",
				canRetry: true,
			});
		}
	}, [appName, siteUrl, runId]);

	const handleUpdate = useCallback(async () => {
		if (state.status !== "published") {
			return;
		}

		setState({ status: "publishing", step: "Deploying update..." });

		try {
			const response = await fetch(API_ENDPOINTS.makeRunPublish(runId), {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					appName: appName.trim(),
					siteUrl: siteUrl.trim(),
					product: "jira",
				}),
			});

			const payload = (await response.json()) as {
				success?: boolean;
				error?: string;
			};

			if (payload.success) {
				setState({
					status: "published",
					config: {
						appName: appName.trim(),
						siteUrl: siteUrl.trim(),
						product: "jira",
						lastDeployedAt: new Date().toISOString(),
					},
				});
			} else {
				setState({
					status: "error",
					message: payload.error ?? "Update failed",
					canRetry: true,
				});
			}
		} catch (err) {
			setState({
				status: "error",
				message: err instanceof Error ? err.message : "Update failed",
				canRetry: true,
			});
		}
	}, [state.status, appName, siteUrl, runId]);

	const handleRetry = useCallback(() => {
		// Go back to setup form so the user can re-attempt publish
		setState({ status: "setup", sites: [] });
		void fetchSites();
	}, [fetchSites]);

	return (
		<Popover open={isOpen} onOpenChange={handleOpenChange}>
			<PopoverTrigger
				render={
					<Button
						aria-expanded={isOpen}
					/>
				}
			>
				<GlobeIcon label="" size="small" />
				Publish
			</PopoverTrigger>
			<PopoverContent align="end" className="w-80 gap-0 p-0">
				{state.status === "loading" ? (
					<LoadingView />
				) : state.status === "setup" ? (
					<SetupView
						appName={appName}
						siteUrl={siteUrl}
						sites={state.sites}
						onAppNameChange={setAppName}
						onSiteUrlChange={setSiteUrl}
						onPublish={handlePublish}
					/>
				) : state.status === "publishing" ? (
					<PublishingView step={state.step} />
				) : state.status === "published" ? (
					<PublishedView
						config={state.config}
						appName={appName}
						onAppNameChange={setAppName}
						onUpdate={handleUpdate}
					/>
				) : (
					<ErrorView
						message={state.message}
						onRetry={state.canRetry ? handleRetry : undefined}
					/>
				)}
			</PopoverContent>
		</Popover>
	);
}

function PopoverSection({
	children,
	className,
}: Readonly<{
	children: React.ReactNode;
	className?: string;
}>) {
	return (
		<div className={cn("px-3 py-3", className)}>
			{children}
		</div>
	);
}

function PopoverDivider() {
	return <div className="h-px bg-border" />;
}

function PopoverHeading({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<p
			style={{ font: token("font.heading.xsmall") }}
			className="text-text"
		>
			{children}
		</p>
	);
}

function LoadingView() {
	return (
		<PopoverSection className="flex items-center justify-center py-8">
			<div className="size-5 animate-spin rounded-full border-2 border-border border-t-text-subtle" />
		</PopoverSection>
	);
}

function SetupView({
	appName,
	siteUrl,
	sites,
	onAppNameChange,
	onSiteUrlChange,
	onPublish,
}: Readonly<{
	appName: string;
	siteUrl: string;
	sites: SiteEntry[];
	onAppNameChange: (value: string) => void;
	onSiteUrlChange: (value: string) => void;
	onPublish: () => void;
}>) {
	return (
		<>
			<PopoverSection>
				<PopoverHeading>Publish to Atlassian</PopoverHeading>
			</PopoverSection>
			<PopoverDivider />
			<PopoverSection className="flex flex-col gap-3">
				<div className="flex flex-col gap-1.5">
					<Label htmlFor="publish-app-name" className="text-xs font-medium text-text-subtle">
						App name
					</Label>
					<Input
						id="publish-app-name"
						value={appName}
						onChange={(e) => onAppNameChange((e.target as HTMLInputElement).value)}
						isCompact
					/>
				</div>
				<div className="flex flex-col gap-1.5">
					<Label htmlFor="publish-site-url" className="text-xs font-medium text-text-subtle">
						Site
					</Label>
					{sites.length > 0 ? (
						<select
							id="publish-site-url"
							value={siteUrl}
							onChange={(e) => onSiteUrlChange(e.target.value)}
							className="h-7 w-full min-w-0 rounded-lg border border-input bg-bg-input px-2.5 text-sm text-text outline-none focus:border-ring focus:ring-3 focus:ring-ring/50"
						>
							{sites.map((site) => (
								<option key={site.siteUrl} value={site.siteUrl}>
									{site.siteUrl.replace(/^https?:\/\//, "")}
								</option>
							))}
						</select>
					) : (
						<Input
							id="publish-site-url"
							value={siteUrl}
							onChange={(e) => onSiteUrlChange((e.target as HTMLInputElement).value)}
							placeholder="mycompany.atlassian.net"
							isCompact
						/>
					)}
				</div>
			</PopoverSection>
			<PopoverDivider />
			<PopoverSection className="flex justify-end">
				<Button
					size="sm"
					disabled={!appName.trim() || !siteUrl.trim()}
					onClick={onPublish}
				>
					Publish
				</Button>
			</PopoverSection>
		</>
	);
}

function PublishingView({
	step,
}: Readonly<{
	step: string;
}>) {
	const steps = [
		"Creating Forge app...",
		"Building app bundle...",
		"Deploying to development...",
		"Installing on site...",
	];

	const activeIndex = steps.findIndex((s) =>
		step.toLowerCase().includes(s.toLowerCase().replace(/\.\.\./g, "").trim()),
	);

	return (
		<>
			<PopoverSection>
				<PopoverHeading>Publishing...</PopoverHeading>
			</PopoverSection>
			<PopoverDivider />
			<PopoverSection className="flex flex-col gap-2">
				{steps.map((stepLabel, index) => {
					const isActive = index <= (activeIndex >= 0 ? activeIndex : 0);
					const isCurrent = index === (activeIndex >= 0 ? activeIndex : 0);
					return (
						<div
							key={stepLabel}
							className="flex items-center gap-2 text-sm"
						>
							{isCurrent ? (
								<div className="size-4 shrink-0 animate-spin rounded-full border-2 border-border border-t-text-subtle" />
							) : isActive ? (
								<CheckCircleIcon label="" size="small" />
							) : (
								<div className="size-4 shrink-0 rounded-full border border-border" />
							)}
							<span className={cn(
								isActive ? "text-text" : "text-text-subtlest",
							)}>
								{stepLabel}
							</span>
						</div>
					);
				})}
			</PopoverSection>
		</>
	);
}

function PublishedView({
	config,
	appName,
	onAppNameChange,
	onUpdate,
}: Readonly<{
	config: ForgePublishConfig;
	appName: string;
	onAppNameChange: (value: string) => void;
	onUpdate: () => void;
}>) {
	const siteDisplayUrl = config.siteUrl.replace(/^https?:\/\//, "");

	return (
		<>
			<PopoverSection className="flex items-center gap-2">
				<CheckCircleIcon label="" size="small" />
				<PopoverHeading>Published</PopoverHeading>
			</PopoverSection>
			<PopoverDivider />
			<PopoverSection className="flex flex-col gap-3">
				<div className="flex flex-col gap-1.5">
					<Label htmlFor="publish-app-name-edit" className="text-xs font-medium text-text-subtle">
						App name
					</Label>
					<Input
						id="publish-app-name-edit"
						value={appName}
						onChange={(e) => onAppNameChange((e.target as HTMLInputElement).value)}
						isCompact
					/>
				</div>
				<div className="flex flex-col gap-1.5">
					<span className="text-xs font-medium text-text-subtle">Site</span>
					<a
						href={config.siteUrl.startsWith("http") ? config.siteUrl : `https://${config.siteUrl}`}
						target="_blank"
						rel="noopener noreferrer"
						className="inline-flex items-center gap-1 text-sm text-link hover:underline"
					>
						{siteDisplayUrl}
						<LinkExternalIcon label="" size="small" />
					</a>
				</div>
				{config.lastDeployedAt ? (
					<p className="text-xs text-text-subtlest">
						Last updated: {formatTimeAgo(config.lastDeployedAt)}
					</p>
				) : null}
			</PopoverSection>
			<PopoverDivider />
			<PopoverSection className="flex justify-end">
				<Button size="sm" variant="outline" onClick={onUpdate}>
					Update
				</Button>
			</PopoverSection>
		</>
	);
}

function ErrorView({
	message,
	onRetry,
}: Readonly<{
	message: string;
	onRetry?: () => void;
}>) {
	return (
		<>
			<PopoverSection className="flex items-center gap-2">
				<span className="text-icon-danger">
					<CrossCircleIcon label="" size="small" />
				</span>
				<PopoverHeading>Publish failed</PopoverHeading>
			</PopoverSection>
			<PopoverDivider />
			<PopoverSection>
				<p className="text-sm text-text-subtle">{message}</p>
			</PopoverSection>
			{onRetry ? (
				<>
					<PopoverDivider />
					<PopoverSection className="flex justify-end">
						<Button size="sm" variant="outline" onClick={onRetry}>
							Retry
						</Button>
					</PopoverSection>
				</>
			) : null}
		</>
	);
}
