"use client";

import AppLayout from "@/components/templates/page";
import { SidebarProvider } from "@/app/contexts/context-sidebar";
import { RovoChatAskProvider } from "@/app/contexts/context-rovo-chat-ask";
import { SystemPromptProvider } from "@/app/contexts/context-system-prompt";

export default function LayoutDemo() {
	return (
		<SidebarProvider>
			<RovoChatAskProvider>
				<SystemPromptProvider>
					<AppLayout product="jira">
						<div className="p-8 text-text-subtle">
							<p>Application content area</p>
						</div>
					</AppLayout>
				</SystemPromptProvider>
			</RovoChatAskProvider>
		</SidebarProvider>
	);
}
