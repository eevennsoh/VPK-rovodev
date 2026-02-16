import BoardIcon from "@atlaskit/icon/core/board";
import BacklogIcon from "@atlaskit/icon/core/backlog";
import RoadmapIcon from "@atlaskit/icon/core/roadmap";
import AngleBracketsIcon from "@atlaskit/icon/core/angle-brackets";
import ListBulletedIcon from "@atlaskit/icon/core/list-bulleted";
import PagesIcon from "@atlaskit/icon/core/pages";
import SettingsIcon from "@atlaskit/icon/core/settings";
import ComponentIcon from "@atlaskit/icon/core/component";
import DashboardIcon from "@atlaskit/icon/core/dashboard";
import GoalIcon from "@atlaskit/icon/core/goal";

export const NAV_ITEMS = [
	{
		title: "Summary",
		url: "#",
		icon: ListBulletedIcon,
		isActive: true,
	},
	{
		title: "Board",
		url: "#",
		icon: BoardIcon,
	},
	{
		title: "Backlog",
		url: "#",
		icon: BacklogIcon,
	},
	{
		title: "Timeline",
		url: "#",
		icon: RoadmapIcon,
	},
	{
		title: "Code",
		url: "#",
		icon: AngleBracketsIcon,
	},
	{
		title: "Pages",
		url: "#",
		icon: PagesIcon,
	},
	{
		title: "Components",
		url: "#",
		icon: ComponentIcon,
	},
	{
		title: "Dashboard",
		url: "#",
		icon: DashboardIcon,
	},
	{
		title: "Goals",
		url: "#",
		icon: GoalIcon,
	},
	{
		title: "Settings",
		url: "#",
		icon: SettingsIcon,
	},
] as const;
