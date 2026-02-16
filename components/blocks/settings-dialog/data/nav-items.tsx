import { BellIcon, MenuIcon, HomeIcon, PaintbrushIcon, MessageCircleIcon, GlobeIcon, KeyboardIcon, CheckIcon, VideoIcon, LinkIcon, LockIcon, SettingsIcon } from "lucide-react"

export const SETTINGS_NAV_ITEMS = [
	{ name: "Notifications", icon: <BellIcon /> },
	{ name: "Navigation", icon: <MenuIcon /> },
	{ name: "Home", icon: <HomeIcon /> },
	{ name: "Appearance", icon: <PaintbrushIcon /> },
	{ name: "Messages & media", icon: <MessageCircleIcon /> },
	{ name: "Language & region", icon: <GlobeIcon /> },
	{ name: "Accessibility", icon: <KeyboardIcon /> },
	{ name: "Mark as read", icon: <CheckIcon /> },
	{ name: "Audio & video", icon: <VideoIcon /> },
	{ name: "Connected accounts", icon: <LinkIcon /> },
	{ name: "Privacy & visibility", icon: <LockIcon /> },
	{ name: "Advanced", icon: <SettingsIcon /> },
] as const;
