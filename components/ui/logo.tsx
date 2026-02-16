"use client";

import * as React from "react";
import { type LogoProps as AtlaskitLogoProps } from "@atlaskit/logo";
import { cn } from "@/lib/utils";
import { useTheme } from "@/components/utils/theme-wrapper";
import {
	type AtlassianLogoName,
	LOGO_ICON_COMPONENTS,
	LOGO_LOCKUP_COMPONENTS,
	CUSTOM_LOGO_SIZES,
} from "@/components/ui/data/logo-data";

export type { AtlassianLogoName };
export type LogoVariant = "icon" | "lockup";

export interface LogoProps extends AtlaskitLogoProps {
	color?: string;
	themeAware?: boolean;
	variant?: LogoVariant;
	shouldUseHexLogo?: boolean;
}

export interface AtlassianLogoProps extends LogoProps {
	name: AtlassianLogoName;
}

function getThemeAwareAppearance(
	appearance: AtlaskitLogoProps["appearance"],
	themeAware: boolean,
	actualTheme: "light" | "dark"
): AtlaskitLogoProps["appearance"] {
	if (appearance) {
		return appearance;
	}

	if (!themeAware) {
		return undefined;
	}

	return actualTheme === "dark" ? "inverse" : "brand";
}

export function AtlassianLogo({
	name,
	themeAware = true,
	appearance,
	size = "small",
	variant = "icon",
	color,
	...props
}: Readonly<AtlassianLogoProps>) {
	const { actualTheme } = useTheme();
	const components = variant === "lockup" ? LOGO_LOCKUP_COMPONENTS : LOGO_ICON_COMPONENTS;
	const Component = components[name];
	const resolvedAppearance = getThemeAwareAppearance(appearance, themeAware, actualTheme);
	void color;

	const needsDarkFix = !appearance && actualTheme === "dark" && resolvedAppearance === "inverse";

	return (
		<span className={cn(needsDarkFix && "ads-logo-inverse")}>
			<Component
				{...props}
				size={size}
				appearance={resolvedAppearance}
			/>
		</span>
	);
}

/* -- Custom Logo ------------------------------------------------- */

export interface CustomLogoProps {
	/** Custom SVG or image element to render as the logo icon */
	svg: React.ReactElement<{ width?: number; height?: number; "aria-hidden"?: boolean }>;
	/** Optional wordmark text displayed beside the icon */
	wordmark?: string;
	/** Logo size */
	size?: LogoProps["size"];
	/** Accessible label */
	label?: string;
	/** Additional CSS classes */
	className?: string;
}

export function CustomLogo({
	svg,
	wordmark,
	size = "small",
	label,
	className,
}: Readonly<CustomLogoProps>) {
	const px = CUSTOM_LOGO_SIZES[size ?? "small"];

	return (
		<span
			role="img"
			aria-label={label}
			className={cn("inline-flex items-center gap-1", className)}
		>
			<span className="inline-flex shrink-0 items-center justify-center" style={{ width: px, height: px }}>
				{React.cloneElement(svg, {
					width: px,
					height: px,
					"aria-hidden": true,
				})}
			</span>
			{wordmark ? (
				<span
					className="font-semibold leading-none text-text"
					style={{ fontSize: Math.max(12, px * 0.6) }}
				>
					{wordmark}
				</span>
			) : null}
		</span>
	);
}

/* -- Named product exports --------------------------------------- */

function createLogo(name: AtlassianLogoName) {
	return function LogoComponent(props: Readonly<LogoProps>) {
		return <AtlassianLogo name={name} {...props} />;
	};
}

export const HomeIcon = createLogo("home");
export const SearchIcon = createLogo("search");
export const JiraIcon = createLogo("jira");
export const ConfluenceIcon = createLogo("confluence");
export const RovoIcon = createLogo("rovo");
export const LoomIcon = createLogo("loom");
export const GoalsIcon = createLogo("goals");
export const TeamsIcon = createLogo("teams");
export const BitbucketIcon = createLogo("bitbucket");
export const CompassIcon = createLogo("compass");
export const JiraServiceManagementIcon = createLogo("jira-service-management");
export const JiraProductDiscoveryIcon = createLogo("jira-product-discovery");
export const AssetsIcon = createLogo("assets");
export const ProjectsIcon = createLogo("projects");
export const FocusIcon = createLogo("focus");

export const HomeLogo = HomeIcon;
export const SearchLogo = SearchIcon;
export const JiraLogo = JiraIcon;
export const ConfluenceLogo = ConfluenceIcon;
export const RovoLogo = RovoIcon;
export const LoomLogo = LoomIcon;
export const GoalsLogo = GoalsIcon;
export const TeamsLogo = TeamsIcon;
export const BitbucketLogo = BitbucketIcon;
export const CompassLogo = CompassIcon;
export const JiraServiceManagementLogo = JiraServiceManagementIcon;
export const JiraProductDiscoveryLogo = JiraProductDiscoveryIcon;
export const AssetsLogo = AssetsIcon;
export const ProjectsLogo = ProjectsIcon;
export const FocusLogo = FocusIcon;
