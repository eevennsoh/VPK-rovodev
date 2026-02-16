import { JiraLogo, LoomLogoWrapper, GoalsLogo, TeamsLogo } from "../components/product-logos";
import DatabaseIcon from "@atlaskit/icon/core/database";
import PagesIcon from "@atlaskit/icon/core/pages";
import WhiteboardIcon from "@atlaskit/icon/core/whiteboard";

export interface CurrentSpace {
	id: string;
	name: string;
	imageSrc: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type IconComponent = React.ComponentType<any>;

export interface ContentTreeItem {
	id: string;
	label: string;
	icon: IconComponent;
	isSelectable?: boolean;
}

export interface ExternalLink {
	id: string;
	label: string;
	icon: IconComponent;
	href?: string;
}

export const CURRENT_SPACE: CurrentSpace = {
	id: "vitafleet",
	name: "Vitafleet",
	imageSrc: "/avatar-project/rocket.svg",
};

export const CONTENT_TREE_ITEMS: readonly ContentTreeItem[] = [
	{
		id: "demo-live-page",
		label: "Demo Live page",
		icon: PagesIcon,
		isSelectable: true,
	},
	{
		id: "goals-brainstorm",
		label: "Goals Brainstorm",
		icon: WhiteboardIcon,
	},
	{
		id: "trend-research",
		label: "Trend Research",
		icon: WhiteboardIcon,
	},
	{
		id: "financial-forecast",
		label: "Financial Forecast",
		icon: DatabaseIcon,
	},
] as const;

export const CONFLUENCE_EXTERNAL_LINKS: readonly ExternalLink[] = [
	{
		id: "jira",
		label: "Jira",
		icon: JiraLogo,
		href: "/jira",
	},
	{
		id: "loom",
		label: "Loom",
		icon: LoomLogoWrapper,
	},
	{
		id: "goals",
		label: "Goals",
		icon: GoalsLogo,
	},
	{
		id: "teams",
		label: "Teams",
		icon: TeamsLogo,
	},
] as const;
