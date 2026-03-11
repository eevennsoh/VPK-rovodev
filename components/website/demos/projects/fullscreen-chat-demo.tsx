"use client";

import { RovoChatProvider } from "@/app/contexts";
import { SidebarProvider } from "@/app/contexts/context-sidebar";
import FullscreenChatView from "@/components/projects/fullscreen-chat/page";
import AppLayout from "@/components/projects/page";
import { useProjectDemoEmbedded } from "./use-project-demo-embedded";

export default function FullscreenChatDemo() {
	const embedded = useProjectDemoEmbedded();

	return (
		<SidebarProvider>
			<RovoChatProvider>
				<AppLayout product="rovo" embedded={embedded}>
					<FullscreenChatView />
				</AppLayout>
			</RovoChatProvider>
		</SidebarProvider>
	);
}
