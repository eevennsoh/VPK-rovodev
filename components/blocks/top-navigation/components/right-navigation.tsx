"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { token } from "@/lib/tokens";
import NotificationIcon from "@atlaskit/icon/core/notification";
import QuestionCircleIcon from "@atlaskit/icon/core/question-circle";
import SettingsIcon from "@atlaskit/icon/core/settings";
import ThemeIcon from "@atlaskit/icon/core/theme";

type Product = "home" | "jira" | "confluence" | "rovo" | "search";

interface RightNavigationProps {
	product: Product;
	windowWidth: number;
	onToggleChat: () => void;
	onToggleTheme: () => void;
}

export function RightNavigation({
	product,
	windowWidth,
	onToggleChat,
	onToggleTheme,
}: Readonly<RightNavigationProps>) {
	const containerStyle = {
		display: "flex",
		alignItems: "center",
		gap: token("space.050"),
		flex: 1,
		justifyContent: "flex-end",
		marginLeft: "8px",
		...(windowWidth >= 1028 && windowWidth < 1516 && { flex: "0 0 330px", width: "330px" }),
	};

	return (
		<div style={containerStyle}>
			{/* Rovo chat button - hidden when on Rovo page */}
			{product !== "rovo" && (
				<>
					{windowWidth >= 768 ? (
						<Button variant="outline" className="text-text-subtle" onClick={onToggleChat}>
							<Image src="/1p/rovo.svg" alt="" width={16} height={16} data-icon="inline-start" />
							Ask Rovo
						</Button>
					) : (
						<Button aria-label="Ask Rovo" size="icon" variant="outline" className="text-text-subtle" onClick={onToggleChat}>
							<Image src="/1p/rovo.svg" alt="" width={16} height={16} />
						</Button>
					)}
				</>
			)}

			{/* Notifications */}
			<Button aria-label="Notifications" size="icon" variant="ghost">
				<NotificationIcon label="" color={token("color.icon.subtle")} />
			</Button>

			{/* Help */}
			<Button aria-label="Help" size="icon" variant="ghost">
				<QuestionCircleIcon label="" color={token("color.icon.subtle")} />
			</Button>

			{/* Settings */}
			<Button aria-label="Settings" size="icon" variant="ghost">
				<SettingsIcon label="" color={token("color.icon.subtle")} />
			</Button>

			{/* Theme Toggle */}
			<Button aria-label="Toggle theme" size="icon" variant="ghost" onClick={onToggleTheme}>
				<ThemeIcon label="" color={token("color.icon.subtle")} />
			</Button>

			{/* Profile */}
			<div className="flex size-8 items-center justify-center">
				<Avatar size="sm">
					<AvatarImage
						src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=32&h=32&fit=crop&crop=face"
						alt="User Profile"
					/>
					<AvatarFallback>UP</AvatarFallback>
				</Avatar>
			</div>
		</div>
	);
}
