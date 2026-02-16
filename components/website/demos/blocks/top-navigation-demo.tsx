"use client";

import TopNavigation from "@/components/blocks/top-navigation/page";
import { SidebarProvider } from "@/app/contexts/context-sidebar";
import { RovoChatAskProvider } from "@/app/contexts/context-rovo-chat-ask";

export default function NavigationDemo() {
	return (
		<SidebarProvider>
			<RovoChatAskProvider>
				<TopNavigation product="jira" />
			</RovoChatAskProvider>
		</SidebarProvider>
	);
}
