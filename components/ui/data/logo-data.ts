import type { ComponentType } from "react";
import {
	AssetsIcon as AtlaskitAssetsIcon,
	AssetsLogo as AtlaskitAssetsLogo,
	BitbucketIcon as AtlaskitBitbucketIcon,
	BitbucketLogo as AtlaskitBitbucketLogo,
	CompassIcon as AtlaskitCompassIcon,
	CompassLogo as AtlaskitCompassLogo,
	ConfluenceIcon as AtlaskitConfluenceIcon,
	ConfluenceLogo as AtlaskitConfluenceLogo,
	FocusIcon as AtlaskitFocusIcon,
	FocusLogo as AtlaskitFocusLogo,
	GoalsIcon as AtlaskitGoalsIcon,
	GoalsLogo as AtlaskitGoalsLogo,
	HomeIcon as AtlaskitHomeIcon,
	HomeLogo as AtlaskitHomeLogo,
	JiraIcon as AtlaskitJiraIcon,
	JiraLogo as AtlaskitJiraLogo,
	JiraProductDiscoveryIcon as AtlaskitJiraProductDiscoveryIcon,
	JiraProductDiscoveryLogo as AtlaskitJiraProductDiscoveryLogo,
	JiraServiceManagementIcon as AtlaskitJiraServiceManagementIcon,
	JiraServiceManagementLogo as AtlaskitJiraServiceManagementLogo,
	LoomIcon as AtlaskitLoomIcon,
	LoomLogo as AtlaskitLoomLogo,
	ProjectsIcon as AtlaskitProjectsIcon,
	ProjectsLogo as AtlaskitProjectsLogo,
	RovoIcon as AtlaskitRovoIcon,
	RovoLogo as AtlaskitRovoLogo,
	SearchIcon as AtlaskitSearchIcon,
	SearchLogo as AtlaskitSearchLogo,
	TeamsIcon as AtlaskitTeamsIcon,
	TeamsLogo as AtlaskitTeamsLogo,
	type LogoProps as AtlaskitLogoProps,
} from "@atlaskit/logo";

export type AtlassianLogoName =
	| "assets"
	| "bitbucket"
	| "compass"
	| "confluence"
	| "focus"
	| "goals"
	| "home"
	| "jira"
	| "jira-product-discovery"
	| "jira-service-management"
	| "loom"
	| "projects"
	| "rovo"
	| "search"
	| "teams";

type AtlassianLogoComponentProps = AtlaskitLogoProps & {
	shouldUseHexLogo?: boolean;
};

export const LOGO_ICON_COMPONENTS: Record<AtlassianLogoName, ComponentType<AtlassianLogoComponentProps>> = {
	assets: AtlaskitAssetsIcon,
	bitbucket: AtlaskitBitbucketIcon,
	compass: AtlaskitCompassIcon,
	confluence: AtlaskitConfluenceIcon,
	focus: AtlaskitFocusIcon,
	goals: AtlaskitGoalsIcon,
	home: AtlaskitHomeIcon,
	jira: AtlaskitJiraIcon,
	"jira-product-discovery": AtlaskitJiraProductDiscoveryIcon,
	"jira-service-management": AtlaskitJiraServiceManagementIcon,
	loom: AtlaskitLoomIcon,
	projects: AtlaskitProjectsIcon,
	rovo: AtlaskitRovoIcon,
	search: AtlaskitSearchIcon,
	teams: AtlaskitTeamsIcon,
};

export const LOGO_LOCKUP_COMPONENTS: Record<AtlassianLogoName, ComponentType<AtlassianLogoComponentProps>> = {
	assets: AtlaskitAssetsLogo,
	bitbucket: AtlaskitBitbucketLogo,
	compass: AtlaskitCompassLogo,
	confluence: AtlaskitConfluenceLogo,
	focus: AtlaskitFocusLogo,
	goals: AtlaskitGoalsLogo,
	home: AtlaskitHomeLogo,
	jira: AtlaskitJiraLogo,
	"jira-product-discovery": AtlaskitJiraProductDiscoveryLogo,
	"jira-service-management": AtlaskitJiraServiceManagementLogo,
	loom: AtlaskitLoomLogo,
	projects: AtlaskitProjectsLogo,
	rovo: AtlaskitRovoLogo,
	search: AtlaskitSearchLogo,
	teams: AtlaskitTeamsLogo,
};

export const CUSTOM_LOGO_SIZES: Record<string, number> = {
	xxsmall: 16,
	xsmall: 20,
	small: 24,
	medium: 32,
	large: 40,
	xlarge: 48,
};
