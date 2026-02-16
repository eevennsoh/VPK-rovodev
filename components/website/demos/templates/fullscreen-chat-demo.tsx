"use client";

import FullscreenChatView from "@/components/templates/fullscreen-chat/page";
import { RovoChatAskProvider } from "@/app/contexts/context-rovo-chat-ask";
import { SystemPromptProvider } from "@/app/contexts/context-system-prompt";

export default function FullscreenChatDemo() {
	return (
		<RovoChatAskProvider>
			<SystemPromptProvider>
				<FullscreenChatView />
			</SystemPromptProvider>
		</RovoChatAskProvider>
	);
}
