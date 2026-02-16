// @ts-nocheck
import {
	BookOpen,
	Bot,
	Command,
	Frame,
	LifeBuoy,
	Map,
	PieChart,
	Send,
	Settings2,
	SquareTerminal,
} from "lucide-react"

export const USER_DATA = {
	name: "shadcn",
	email: "m@example.com",
	avatar: "/avatar-user/nova/color/asow-service-yellow.png",
} as const

export const COMPANY_DATA = {
	name: "Acme Inc",
	logo: Command,
	plan: "Enterprise",
} as const

export const NAV_MAIN_ITEMS = [
	{
		title: "Playground",
		url: "#",
		icon: SquareTerminal,
		isActive: true,
		items: [
			{
				title: "History",
				url: "#",
			},
			{
				title: "Starred",
				url: "#",
			},
			{
				title: "Settings",
				url: "#",
			},
		],
	},
	{
		title: "Models",
		url: "#",
		icon: Bot,
		items: [
			{
				title: "Genesis",
				url: "#",
			},
			{
				title: "Explorer",
				url: "#",
			},
			{
				title: "Quantum",
				url: "#",
			},
		],
	},
	{
		title: "Documentation",
		url: "#",
		icon: BookOpen,
		items: [
			{
				title: "Introduction",
				url: "#",
			},
			{
				title: "Get Started",
				url: "#",
			},
			{
				title: "Tutorials",
				url: "#",
			},
			{
				title: "Changelog",
				url: "#",
			},
		],
	},
	{
		title: "Settings",
		url: "#",
		icon: Settings2,
		items: [
			{
				title: "General",
				url: "#",
			},
			{
				title: "Team",
				url: "#",
			},
			{
				title: "Billing",
				url: "#",
			},
			{
				title: "Limits",
				url: "#",
			},
		],
	},
]

export const NAV_SECONDARY_ITEMS = [
	{
		title: "Support",
		url: "#",
		icon: LifeBuoy,
	},
	{
		title: "Feedback",
		url: "#",
		icon: Send,
	},
]

export const PROJECTS = [
	{
		name: "Design Engineering",
		url: "#",
		icon: Frame,
	},
	{
		name: "Sales & Marketing",
		url: "#",
		icon: PieChart,
	},
	{
		name: "Travel",
		url: "#",
		icon: Map,
	},
]
