"use client";

import ChatPanel from "@/components/templates/sidebar-chat/page";

export default function SidebarChatDemo() {
	return (
		<div className="relative flex h-[600px] justify-center">
			<ChatPanel onClose={() => {}} />
		</div>
	);
}
