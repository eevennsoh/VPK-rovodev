import type { ComponentType } from "react";
import {
	AdminIcon as AtlaskitAdminIcon,
	AdminLogo as AtlaskitAdminLogo,
	AlignIcon as AtlaskitAlignIcon,
	AlignLogo as AtlaskitAlignLogo,
	AnalyticsIcon as AtlaskitAnalyticsIcon,
	AnalyticsLogo as AtlaskitAnalyticsLogo,
	AssetsIcon as AtlaskitAssetsIcon,
	AssetsLogo as AtlaskitAssetsLogo,
	AtlassianIcon as AtlaskitAtlassianIcon,
	AtlassianLogo as AtlaskitAtlassianLogo,
	BambooIcon as AtlaskitBambooIcon,
	BambooLogo as AtlaskitBambooLogo,
	BitbucketIcon as AtlaskitBitbucketIcon,
	BitbucketLogo as AtlaskitBitbucketLogo,
	ChatIcon as AtlaskitChatIcon,
	ChatLogo as AtlaskitChatLogo,
	CompassIcon as AtlaskitCompassIcon,
	CompassLogo as AtlaskitCompassLogo,
	ConfluenceIcon as AtlaskitConfluenceIcon,
	ConfluenceLogo as AtlaskitConfluenceLogo,
	CustomerServiceManagementIcon as AtlaskitCustomerServiceManagementIcon,
	CustomerServiceManagementLogo as AtlaskitCustomerServiceManagementLogo,
	FocusIcon as AtlaskitFocusIcon,
	FocusLogo as AtlaskitFocusLogo,
	GoalsIcon as AtlaskitGoalsIcon,
	GoalsLogo as AtlaskitGoalsLogo,
	GuardIcon as AtlaskitGuardIcon,
	GuardLogo as AtlaskitGuardLogo,
	HomeIcon as AtlaskitHomeIcon,
	HomeLogo as AtlaskitHomeLogo,
	HubIcon as AtlaskitHubIcon,
	HubLogo as AtlaskitHubLogo,
	JiraIcon as AtlaskitJiraIcon,
	JiraLogo as AtlaskitJiraLogo,
	JiraProductDiscoveryIcon as AtlaskitJiraProductDiscoveryIcon,
	JiraProductDiscoveryLogo as AtlaskitJiraProductDiscoveryLogo,
	JiraServiceManagementIcon as AtlaskitJiraServiceManagementIcon,
	JiraServiceManagementLogo as AtlaskitJiraServiceManagementLogo,
	LoomIcon as AtlaskitLoomIcon,
	LoomLogo as AtlaskitLoomLogo,
	OpsgenieIcon as AtlaskitOpsgenieIcon,
	OpsgenieLogo as AtlaskitOpsgenieLogo,
	ProjectsIcon as AtlaskitProjectsIcon,
	ProjectsLogo as AtlaskitProjectsLogo,
	RovoDevAgentIcon as AtlaskitRovoDevAgentIcon,
	RovoDevAgentLogo as AtlaskitRovoDevAgentLogo,
	RovoDevIcon as AtlaskitRovoDevIcon,
	RovoDevLogo as AtlaskitRovoDevLogo,
	RovoIcon as AtlaskitRovoIcon,
	RovoLogo as AtlaskitRovoLogo,
	SearchIcon as AtlaskitSearchIcon,
	SearchLogo as AtlaskitSearchLogo,
	StatuspageIcon as AtlaskitStatuspageIcon,
	StatuspageLogo as AtlaskitStatuspageLogo,
	StudioIcon as AtlaskitStudioIcon,
	StudioLogo as AtlaskitStudioLogo,
	TalentIcon as AtlaskitTalentIcon,
	TalentLogo as AtlaskitTalentLogo,
	TeamsIcon as AtlaskitTeamsIcon,
	TeamsLogo as AtlaskitTeamsLogo,
	TrelloIcon as AtlaskitTrelloIcon,
	TrelloLogo as AtlaskitTrelloLogo,
	type LogoProps as AtlaskitLogoProps,
} from "@atlaskit/logo";

export type AtlassianLogoName =
	| "admin"
	| "align"
	| "analytics"
	| "assets"
	| "atlassian"
	| "bamboo"
	| "bitbucket"
	| "chat"
	| "compass"
	| "confluence"
	| "customer-service-management"
	| "focus"
	| "goals"
	| "guard"
	| "home"
	| "hub"
	| "jira"
	| "jira-product-discovery"
	| "jira-service-management"
	| "loom"
	| "opsgenie"
	| "projects"
	| "rovo"
	| "rovo-dev"
	| "rovo-dev-agent"
	| "search"
	| "statuspage"
	| "studio"
	| "talent"
	| "teams"
	| "trello";

type AtlassianLogoComponentProps = AtlaskitLogoProps & {
	shouldUseHexLogo?: boolean;
};

export const LOGO_ICON_COMPONENTS: Record<AtlassianLogoName, ComponentType<AtlassianLogoComponentProps>> = {
	admin: AtlaskitAdminIcon,
	align: AtlaskitAlignIcon,
	analytics: AtlaskitAnalyticsIcon,
	assets: AtlaskitAssetsIcon,
	atlassian: AtlaskitAtlassianIcon,
	bamboo: AtlaskitBambooIcon,
	bitbucket: AtlaskitBitbucketIcon,
	chat: AtlaskitChatIcon,
	compass: AtlaskitCompassIcon,
	confluence: AtlaskitConfluenceIcon,
	"customer-service-management": AtlaskitCustomerServiceManagementIcon,
	focus: AtlaskitFocusIcon,
	goals: AtlaskitGoalsIcon,
	guard: AtlaskitGuardIcon,
	home: AtlaskitHomeIcon,
	hub: AtlaskitHubIcon,
	jira: AtlaskitJiraIcon,
	"jira-product-discovery": AtlaskitJiraProductDiscoveryIcon,
	"jira-service-management": AtlaskitJiraServiceManagementIcon,
	loom: AtlaskitLoomIcon,
	opsgenie: AtlaskitOpsgenieIcon,
	projects: AtlaskitProjectsIcon,
	rovo: AtlaskitRovoIcon,
	"rovo-dev": AtlaskitRovoDevIcon,
	"rovo-dev-agent": AtlaskitRovoDevAgentIcon,
	search: AtlaskitSearchIcon,
	statuspage: AtlaskitStatuspageIcon,
	studio: AtlaskitStudioIcon,
	talent: AtlaskitTalentIcon,
	teams: AtlaskitTeamsIcon,
	trello: AtlaskitTrelloIcon,
};

export const LOGO_LOCKUP_COMPONENTS: Record<AtlassianLogoName, ComponentType<AtlassianLogoComponentProps>> = {
	admin: AtlaskitAdminLogo,
	align: AtlaskitAlignLogo,
	analytics: AtlaskitAnalyticsLogo,
	assets: AtlaskitAssetsLogo,
	atlassian: AtlaskitAtlassianLogo,
	bamboo: AtlaskitBambooLogo,
	bitbucket: AtlaskitBitbucketLogo,
	chat: AtlaskitChatLogo,
	compass: AtlaskitCompassLogo,
	confluence: AtlaskitConfluenceLogo,
	"customer-service-management": AtlaskitCustomerServiceManagementLogo,
	focus: AtlaskitFocusLogo,
	goals: AtlaskitGoalsLogo,
	guard: AtlaskitGuardLogo,
	home: AtlaskitHomeLogo,
	hub: AtlaskitHubLogo,
	jira: AtlaskitJiraLogo,
	"jira-product-discovery": AtlaskitJiraProductDiscoveryLogo,
	"jira-service-management": AtlaskitJiraServiceManagementLogo,
	loom: AtlaskitLoomLogo,
	opsgenie: AtlaskitOpsgenieLogo,
	projects: AtlaskitProjectsLogo,
	rovo: AtlaskitRovoLogo,
	"rovo-dev": AtlaskitRovoDevLogo,
	"rovo-dev-agent": AtlaskitRovoDevAgentLogo,
	search: AtlaskitSearchLogo,
	statuspage: AtlaskitStatuspageLogo,
	studio: AtlaskitStudioLogo,
	talent: AtlaskitTalentLogo,
	teams: AtlaskitTeamsLogo,
	trello: AtlaskitTrelloLogo,
};

export const CUSTOM_LOGO_SIZES: Record<string, number> = {
	xxsmall: 16,
	xsmall: 20,
	small: 24,
	medium: 32,
	large: 40,
	xlarge: 48,
};
