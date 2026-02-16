import type { Spec } from "@json-render/react";

export const settingsFormSpec: Spec = {
	root: "root",
	state: {
		settings: {
			notifications: true,
			emailDigest: false,
			darkMode: false,
			language: "en",
			fontSize: 14,
			autoSave: true,
		},
	},
	elements: {
		root: {
			type: "Stack",
			props: { direction: "vertical", gap: "lg" },
			children: ["breadcrumb", "header", "alert", "formGrid"],
		},
		breadcrumb: {
			type: "Breadcrumb",
			props: {
				items: [
					{ label: "Home", href: "/" },
					{ label: "Account", href: "/" },
					{ label: "Settings" },
				],
			},
		},
		header: {
			type: "PageHeader",
			props: { title: "Account Settings", description: "Manage your preferences and notifications" },
		},
		alert: {
			type: "Alert",
			props: {
				title: "New features available",
				description: "Check out the latest accessibility and notification settings.",
				variant: "info",
			},
		},
		formGrid: {
			type: "Grid",
			props: { columns: "2", gap: "lg" },
			children: ["notificationsCard", "appearanceCard"],
		},

		// Notifications card
		notificationsCard: {
			type: "Card",
			props: { title: "Notifications" },
			children: ["notifForm"],
		},
		notifForm: {
			type: "Stack",
			props: { direction: "vertical", gap: "md" },
			children: ["notifSwitch", "emailSwitch", "autoSaveCheck"],
		},
		notifSwitch: {
			type: "Switch",
			props: {
				label: "Push notifications",
				checked: { $bindState: "/settings/notifications" } as unknown as boolean,
			},
		},
		emailSwitch: {
			type: "Switch",
			props: {
				label: "Email digest",
				checked: { $bindState: "/settings/emailDigest" } as unknown as boolean,
			},
		},
		autoSaveCheck: {
			type: "Checkbox",
			props: {
				label: "Auto-save drafts",
				checked: { $bindState: "/settings/autoSave" } as unknown as boolean,
			},
		},

		// Appearance card
		appearanceCard: {
			type: "Card",
			props: { title: "Appearance" },
			children: ["appearanceForm"],
		},
		appearanceForm: {
			type: "Stack",
			props: { direction: "vertical", gap: "md" },
			children: ["darkModeCheck", "langSelect", "fontSlider", "saveButtons"],
		},
		darkModeCheck: {
			type: "Checkbox",
			props: {
				label: "Dark mode",
				checked: { $bindState: "/settings/darkMode" } as unknown as boolean,
			},
		},
		langSelect: {
			type: "SelectInput",
			props: {
				label: "Language",
				value: { $bindState: "/settings/language" } as unknown as string,
				options: [
					{ label: "English", value: "en" },
					{ label: "Spanish", value: "es" },
					{ label: "French", value: "fr" },
					{ label: "German", value: "de" },
					{ label: "Japanese", value: "ja" },
				],
			},
		},
		fontSlider: {
			type: "Slider",
			props: {
				label: "Font size",
				value: { $bindState: "/settings/fontSize" } as unknown as number,
				min: 10,
				max: 24,
				step: 1,
			},
		},
		saveButtons: {
			type: "ButtonGroup",
			props: {},
			children: ["saveBtn", "resetBtn"],
		},
		saveBtn: {
			type: "Button",
			props: { label: "Save Changes", variant: "default" },
		},
		resetBtn: {
			type: "Button",
			props: { label: "Reset", variant: "outline" },
		},
	},
};
