import type { Spec } from "@json-render/react";

/**
 * Google Calendar events card with one ordered timeline per day.
 * Meetings are timeline rows (not individual meeting cards).
 */
export const googleCalendarSpec: Spec = {
	root: "root",
	state: {},
	elements: {
		root: {
			type: "Stack",
			props: { direction: "vertical", gap: "md" },
			children: ["header", "tabs"],
		},
		header: {
			type: "Stack",
			props: { direction: "horizontal", gap: "sm", align: "center", justify: "between" },
			children: ["headerLeft", "badge"],
		},
		headerLeft: {
			type: "Stack",
			props: { direction: "horizontal", gap: "sm", align: "center" },
			children: ["icon", "title"],
		},
		icon: {
			type: "Text",
			props: { content: "📅" },
		},
		title: {
			type: "Heading",
			props: { text: "Google Calendar", level: "h3" },
		},
		badge: {
			type: "Lozenge",
			props: { text: "3 today", variant: "information" },
		},
		tabs: {
			type: "Tabs",
			props: {
				tabs: [
					{ value: "today", label: "Today" },
					{ value: "tomorrow", label: "Tue" },
					{ value: "wednesday", label: "Wed" },
					{ value: "thursday", label: "Thu" },
				],
				defaultValue: "today",
			},
			children: ["todayTab", "tomorrowTab", "wednesdayTab", "thursdayTab"],
		},
		todayTab: {
			type: "TabContent",
			props: { value: "today" },
			children: ["todayTimeline"],
		},
		todayTimeline: {
			type: "Timeline",
			props: {
				items: [
					{
						title: "Daily Standup",
						description: "Zoom · 30 min · Confirmed",
						date: "9:00 AM",
						status: "completed",
					},
					{
						title: "Sprint Planning",
						description: "Room 3A · 1 hr · Needs action",
						date: "10:00 AM",
						status: "current",
					},
					{
						title: "Lunch with Design Team",
						description: "Cafe Blu · 1 hr",
						date: "12:00 PM",
						status: "upcoming",
					},
					{
						title: "1:1 with Manager",
						description: "Room 2B · 45 min",
						date: "2:00 PM",
						status: "upcoming",
					},
					{
						title: "Code Review Sync",
						description: "Zoom · 30 min",
						date: "4:00 PM",
						status: "upcoming",
					},
				],
			},
		},
		tomorrowTab: {
			type: "TabContent",
			props: { value: "tomorrow" },
			children: ["tomorrowTimeline"],
		},
		tomorrowTimeline: {
			type: "Timeline",
			props: {
				items: [
					{
						title: "Daily Standup",
						description: "Zoom · 30 min",
						date: "9:00 AM",
						status: "upcoming",
					},
					{
						title: "Architecture Review",
						description: "Room 5C · 1 hr",
						date: "11:00 AM",
						status: "upcoming",
					},
					{
						title: "Tech Talk: React 19",
						description: "Auditorium · 1 hr",
						date: "1:00 PM",
						status: "upcoming",
					},
					{
						title: "Retrospective",
						description: "Room 3A · 30 min",
						date: "3:30 PM",
						status: "upcoming",
					},
				],
			},
		},
		wednesdayTab: {
			type: "TabContent",
			props: { value: "wednesday" },
			children: ["wednesdayTimeline"],
		},
		wednesdayTimeline: {
			type: "Timeline",
			props: {
				items: [
					{
						title: "Daily Standup",
						description: "Zoom · 30 min",
						date: "9:00 AM",
						status: "upcoming",
					},
					{
						title: "Design Sync",
						description: "Figma + Zoom · 30 min",
						date: "10:00 AM",
						status: "upcoming",
					},
					{
						title: "Workshop: AI Features",
						description: "Room 5C · 1.5 hr",
						date: "2:00 PM",
						status: "upcoming",
					},
				],
			},
		},
		thursdayTab: {
			type: "TabContent",
			props: { value: "thursday" },
			children: ["thursdayTimeline"],
		},
		thursdayTimeline: {
			type: "Timeline",
			props: {
				items: [
					{
						title: "Daily Standup",
						description: "Zoom · 30 min",
						date: "9:00 AM",
						status: "upcoming",
					},
					{
						title: "Product Demo",
						description: "Auditorium · 1 hr",
						date: "11:00 AM",
						status: "upcoming",
					},
				],
			},
		},
	},
};
