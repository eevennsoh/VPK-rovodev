"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { RovoIcon } from "@/components/ui/logo";
import { token } from "@/lib/tokens";
import NotificationIcon from "@atlaskit/icon/core/notification";
import QuestionCircleIcon from "@atlaskit/icon/core/question-circle";
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
		gap: token("space.100"),
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
						<Button variant="secondary" onClick={onToggleChat}>
							<div style={{ display: "flex", alignItems: "center", gap: token("space.100") }}>
								<RovoIcon label="Rovo" size="xsmall" />
								Ask Rovo
							</div>
						</Button>
					) : (
						<Button aria-label="Ask Rovo" size="icon" variant="secondary" onClick={onToggleChat}>
							<RovoIcon label="Rovo" size="xsmall" />
						</Button>
					)}
				</>
			)}

			{/* Notifications */}
			<Button aria-label="Notifications" size="icon" variant="ghost">
				<NotificationIcon label="" />
			</Button>

			{/* Help */}
			<Button aria-label="Help" size="icon" variant="ghost">
				<QuestionCircleIcon label="" />
			</Button>

			{/* Theme Toggle */}
			<Button aria-label="Toggle theme" size="icon" variant="ghost" onClick={onToggleTheme}>
				<ThemeIcon label="" />
			</Button>

			{/* Profile - Dynamic import handles hydration with loading fallback */}
			<Avatar size="sm">
				<AvatarImage
					src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=32&h=32&fit=crop&crop=face"
					alt="User Profile"
				/>
				<AvatarFallback>UP</AvatarFallback>
			</Avatar>
		</div>
	);
}
