"use client";

import Sidebar from "@/components/blocks/product-sidebar/page";
import { SidebarProvider } from "@/app/contexts/context-sidebar";

export default function SidebarDemo() {
	return (
		<SidebarProvider defaultVisible>
			<div className="relative flex h-[500px]">
				<Sidebar product="jira" />
			</div>
		</SidebarProvider>
	);
}
