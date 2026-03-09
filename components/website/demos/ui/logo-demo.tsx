"use client";

import { type ImgHTMLAttributes } from "react";
import {
	AtlassianLogo,
	CustomLogo,
	AssetsIcon,
	BitbucketIcon,
	CompassIcon,
	ConfluenceIcon,
	FocusIcon,
	GoalsIcon,
	HomeIcon,
	JiraIcon,
	JiraProductDiscoveryIcon,
	JiraServiceManagementIcon,
	LoomIcon,
	ProjectsIcon,
	RovoIcon,
	SearchIcon,
	TeamsIcon,
	type AtlassianLogoName,
	type LogoProps,
} from "@/components/ui/logo";

const logoEntries: ReadonlyArray<{ name: AtlassianLogoName; label: string }> = [
	{ name: "home", label: "Home" },
	{ name: "search", label: "Search" },
	{ name: "jira", label: "Jira" },
	{ name: "confluence", label: "Confluence" },
	{ name: "rovo", label: "Rovo" },
	{ name: "bitbucket", label: "Bitbucket" },
	{ name: "loom", label: "Loom" },
	{ name: "goals", label: "Goals" },
	{ name: "teams", label: "Teams" },
	{ name: "compass", label: "Compass" },
	{ name: "jira-service-management", label: "JSM" },
	{ name: "jira-product-discovery", label: "JPD" },
	{ name: "assets", label: "Assets" },
	{ name: "projects", label: "Projects" },
	{ name: "focus", label: "Focus" },
];

/* ── Overview demo (default export) ──────────────────────────────── */

export default function LogoDemo() {
	return (
		<div className="flex w-full flex-col gap-6">
			<div className="flex flex-wrap gap-4">
				{logoEntries.map((entry) => (
					<div key={entry.name} className="flex items-center gap-2 rounded-md border border-border px-3 py-2 bg-surface">
						<AtlassianLogo name={entry.name} label={entry.label} size="small" />
						<span className="text-sm text-text">{entry.label}</span>
					</div>
				))}
			</div>

			<div className="flex flex-wrap items-center gap-4">
				<HomeIcon label="Home" size="small" />
				<SearchIcon label="Search" size="small" />
				<JiraIcon label="Jira" size="small" />
				<ConfluenceIcon label="Confluence" size="small" />
				<RovoIcon label="Rovo" size="small" />
				<BitbucketIcon label="Bitbucket" size="small" />
				<LoomIcon label="Loom" size="small" />
				<GoalsIcon label="Goals" size="small" />
				<TeamsIcon label="Teams" size="small" />
				<CompassIcon label="Compass" size="small" />
				<JiraServiceManagementIcon label="JSM" size="small" />
				<JiraProductDiscoveryIcon label="JPD" size="small" />
				<AssetsIcon label="Assets" size="small" />
				<ProjectsIcon label="Projects" size="small" />
				<FocusIcon label="Focus" size="small" />
			</div>
		</div>
	);
}

/* ── Demo: Icons ──────────────────────────────────────────────── */

export function LogoDemoIcons() {
	return (
		<div className="flex flex-wrap items-center gap-4">
			{logoEntries.map((entry) => (
				<div key={entry.name} className="flex flex-col items-center gap-1.5">
					<AtlassianLogo name={entry.name} label={entry.label} size="small" />
					<span className="text-xs text-text-subtle">{entry.label}</span>
				</div>
			))}
		</div>
	);
}

/* ── Demo: Lockups (icon + wordmark) ──────────────────────────── */

const lockupEntries: ReadonlyArray<{ name: AtlassianLogoName; label: string }> = [
	{ name: "jira", label: "Jira" },
	{ name: "confluence", label: "Confluence" },
	{ name: "bitbucket", label: "Bitbucket" },
	{ name: "loom", label: "Loom" },
	{ name: "rovo", label: "Rovo" },
	{ name: "home", label: "Home" },
	{ name: "goals", label: "Goals" },
	{ name: "teams", label: "Teams" },
	{ name: "compass", label: "Compass" },
	{ name: "focus", label: "Focus" },
];

export function LogoDemoLockups() {
	return (
		<div className="flex flex-wrap items-center gap-6">
			{lockupEntries.map((entry) => (
				<AtlassianLogo
					key={entry.name}
					name={entry.name}
					label={entry.label}
					variant="lockup"
					size="small"
				/>
			))}
		</div>
	);
}

/* ── Demo: Sizes ──────────────────────────────────────────────── */

const sizes: ReadonlyArray<NonNullable<LogoProps["size"]>> = [
	"xxsmall",
	"xsmall",
	"small",
	"medium",
	"large",
	"xlarge",
];

export function LogoDemoSizes() {
	return (
		<div className="flex flex-col gap-4">
			<div className="flex flex-wrap items-end gap-4">
				{sizes.map((size) => (
					<div key={size} className="flex flex-col items-center gap-1.5">
						<JiraIcon label="Jira" size={size} />
						<span className="text-xs text-text-subtle">{size}</span>
					</div>
				))}
			</div>
			<div className="flex flex-wrap items-end gap-4">
				{sizes.map((size) => (
					<div key={size} className="flex flex-col items-center gap-1.5">
						<AtlassianLogo name="jira" label="Jira" variant="lockup" size={size} />
						<span className="text-xs text-text-subtle">{size}</span>
					</div>
				))}
			</div>
		</div>
	);
}

/* ── Demo: Appearances ────────────────────────────────────────── */

const appearances: ReadonlyArray<"brand" | "neutral" | "inverse"> = [
	"brand",
	"neutral",
	"inverse",
];

export function LogoDemoAppearances() {
	return (
		<div className="flex flex-wrap gap-6">
			{appearances.map((appearance) => (
				<div
					key={appearance}
					className="flex flex-col items-center gap-2 rounded-md border border-border px-4 py-3"
					style={{
						backgroundColor: appearance === "inverse" ? "var(--ds-background-neutral-bold, #44546F)" : undefined,
					}}
				>
					<AtlassianLogo
						name="jira"
						label="Jira"
						variant="lockup"
						size="medium"
						appearance={appearance}
						themeAware={false}
					/>
					<span
						className="text-xs"
						style={{
							color: appearance === "inverse" ? "var(--ds-text-inverse, #FFF)" : undefined,
						}}
					>
						{appearance}
					</span>
				</div>
			))}
		</div>
	);
}

/* ── Demo: Custom Logo ────────────────────────────────────────── */

function RovoSvg(props: ImgHTMLAttributes<HTMLImageElement>) {
	// eslint-disable-next-line @next/next/no-img-element
	return <img src="/1p/rovo.svg" alt="" {...props} />;
}

export function LogoDemoCustom() {
	return (
		<div className="flex flex-col gap-4">
			<div className="flex flex-wrap items-center gap-6">
				<CustomLogo
					svg={<RovoSvg />}
					label="Rovo icon"
					size="small"
				/>
				<CustomLogo
					svg={<RovoSvg />}
					wordmark="Rovo"
					label="Rovo"
					size="small"
				/>
				<CustomLogo
					svg={<RovoSvg />}
					wordmark="Rovo"
					label="Rovo"
					size="medium"
				/>
				<CustomLogo
					svg={<RovoSvg />}
					wordmark="Rovo"
					label="Rovo"
					size="large"
				/>
			</div>
			<p className="text-xs text-text-subtle">
				Pass any SVG element via the <code className="rounded bg-bg-neutral px-1 py-0.5">svg</code> prop. Add an optional <code className="rounded bg-bg-neutral px-1 py-0.5">wordmark</code> for a lockup layout.
			</p>
		</div>
	);
}
