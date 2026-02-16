"use client";

import AppLayout from "@/components/templates/page";
import FullscreenChatView from "@/components/templates/fullscreen-chat/page";

export default function FullscreenChatPage() {
	return (
		<AppLayout product="rovo">
			<FullscreenChatView />
		</AppLayout>
	);
}
