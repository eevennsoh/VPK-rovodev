"use client";

import AppLayout from "@/components/templates/page";
import { SidebarProvider } from "@/app/contexts/context-sidebar";
import { RovoChatProvider } from "@/app/contexts";

export default function LayoutDemo() {
	return (
		<SidebarProvider>
			<RovoChatProvider>
				<AppLayout product="jira">
					<div className="p-8 text-text-subtle">
						<p>Application content area</p>
					</div>
				</AppLayout>
			</RovoChatProvider>
		</SidebarProvider>
	);
}
