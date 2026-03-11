"use client";

import AppLayout from "@/components/projects/page";
import { SidebarProvider } from "@/app/contexts/context-sidebar";
import { RovoChatProvider } from "@/app/contexts";
import { useProjectDemoEmbedded } from "./use-project-demo-embedded";

export default function LayoutDemo() {
	const embedded = useProjectDemoEmbedded();

	return (
		<SidebarProvider>
			<RovoChatProvider>
				<AppLayout product="jira" embedded={embedded}>
					<div className="p-8 text-text-subtle">
						<p>Application content area</p>
					</div>
				</AppLayout>
			</RovoChatProvider>
		</SidebarProvider>
	);
}
