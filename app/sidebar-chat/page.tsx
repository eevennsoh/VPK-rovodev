"use client";

import { token } from "@/lib/tokens";
import ChatPanel from "@/components/templates/sidebar-chat/page";

export default function SidebarChatPage() {
	return (
		<div
			style={{
				height: "100vh",
				backgroundColor: token("color.background.neutral.subtle"),
				display: "flex",
				alignItems: "center",
				justifyContent: "center",
				padding: "0 16px",
			}}
		>
			<ChatPanel
				onClose={() => {}}
				enableSmartWidgets={true}
				sendPromptOptions={{
					smartGeneration: {
						enabled: true,
						surface: "sidebar",
					},
				}}
			/>
		</div>
	);
}
