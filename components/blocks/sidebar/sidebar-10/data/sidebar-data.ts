// @ts-nocheck
import {
	AudioWaveform,
	Blocks,
	Calendar,
	Command,
	Home,
	Inbox,
	MessageCircleQuestion,
	Search,
	Settings2,
	Sparkles,
	Trash2,
} from "lucide-react"

export const TEAMS = [
	{
		name: "Acme Inc",
		logo: Command,
		plan: "Enterprise",
	},
	{
		name: "Acme Corp.",
		logo: AudioWaveform,
		plan: "Startup",
	},
	{
		name: "Evil Corp.",
		logo: Command,
		plan: "Free",
	},
] as const

export const NAV_MAIN_ITEMS = [
	{
		title: "Search",
		url: "#",
		icon: Search,
	},
	{
		title: "Ask AI",
		url: "#",
		icon: Sparkles,
	},
	{
		title: "Home",
		url: "#",
		icon: Home,
		isActive: true,
	},
	{
		title: "Inbox",
		url: "#",
		icon: Inbox,
		badge: "10",
	},
] as const

export const NAV_SECONDARY_ITEMS = [
	{
		title: "Calendar",
		url: "#",
		icon: Calendar,
	},
	{
		title: "Settings",
		url: "#",
		icon: Settings2,
	},
	{
		title: "Projects",
		url: "#",
		icon: Blocks,
	},
	{
		title: "Trash",
		url: "#",
		icon: Trash2,
	},
	{
		title: "Help",
		url: "#",
		icon: MessageCircleQuestion,
	},
] as const

export const FAVORITES = [
	{
		name: "Project Management & Task Tracking",
		url: "#",
		emoji: "📊",
	},
	{
		name: "Family Recipe Collection & Meal Planning",
		url: "#",
		emoji: "🍳",
	},
	{
		name: "Fitness Tracker & Workout Routines",
		url: "#",
		emoji: "💪",
	},
	{
		name: "Book Notes & Reading List",
		url: "#",
		emoji: "📚",
	},
	{
		name: "Sustainable Gardening Tips & Plant Care",
		url: "#",
		emoji: "🌱",
	},
	{
		name: "Language Learning Progress & Resources",
		url: "#",
		emoji: "🗣️",
	},
	{
		name: "Home Renovation Ideas & Budget Tracker",
		url: "#",
		emoji: "🏠",
	},
	{
		name: "Personal Finance & Investment Portfolio",
		url: "#",
		emoji: "💰",
	},
	{
		name: "Movie & TV Show Watchlist with Reviews",
		url: "#",
		emoji: "🎬",
	},
	{
		name: "Daily Habit Tracker & Goal Setting",
		url: "#",
		emoji: "✅",
	},
] as const

export const WORKSPACES = [
	{
		name: "Personal Life Management",
		emoji: "🏠",
		pages: [
			{
				name: "Daily Journal & Reflection",
				url: "#",
				emoji: "📔",
			},
			{
				name: "Health & Wellness Tracker",
				url: "#",
				emoji: "🍏",
			},
			{
				name: "Personal Growth & Learning Goals",
				url: "#",
				emoji: "🌟",
			},
		],
	},
	{
		name: "Professional Development",
		emoji: "💼",
		pages: [
			{
				name: "Career Objectives & Milestones",
				url: "#",
				emoji: "🎯",
			},
			{
				name: "Skill Acquisition & Training Log",
				url: "#",
				emoji: "🧠",
			},
			{
				name: "Networking Contacts & Events",
				url: "#",
				emoji: "🤝",
			},
		],
	},
	{
		name: "Creative Projects",
		emoji: "🎨",
		pages: [
			{
				name: "Writing Ideas & Story Outlines",
				url: "#",
				emoji: "✍️",
			},
			{
				name: "Art & Design Portfolio",
				url: "#",
				emoji: "🖼️",
			},
			{
				name: "Music Composition & Practice Log",
				url: "#",
				emoji: "🎵",
			},
		],
	},
	{
		name: "Home Management",
		emoji: "🏡",
		pages: [
			{
				name: "Household Budget & Expense Tracking",
				url: "#",
				emoji: "💰",
			},
			{
				name: "Home Maintenance Schedule & Tasks",
				url: "#",
				emoji: "🔧",
			},
			{
				name: "Family Calendar & Event Planning",
				url: "#",
				emoji: "📅",
			},
		],
	},
	{
		name: "Travel & Adventure",
		emoji: "🧳",
		pages: [
			{
				name: "Trip Planning & Itineraries",
				url: "#",
				emoji: "🗺️",
			},
			{
				name: "Travel Bucket List & Inspiration",
				url: "#",
				emoji: "🌎",
			},
			{
				name: "Travel Journal & Photo Gallery",
				url: "#",
				emoji: "📸",
			},
		],
	},
] as const
