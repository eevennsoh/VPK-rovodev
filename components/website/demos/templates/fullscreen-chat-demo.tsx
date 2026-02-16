"use client";

import FullscreenChatView from "@/components/templates/fullscreen-chat/page";
import { RovoChatProvider } from "@/app/contexts";

export default function FullscreenChatDemo() {
	return (
		<RovoChatProvider>
			<FullscreenChatView />
		</RovoChatProvider>
	);
}
