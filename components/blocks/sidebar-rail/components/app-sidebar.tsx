"use client";

import {
	Sidebar,
	SidebarContent,
	SidebarFooter,
	SidebarHeader,
} from "@/components/ui/sidebar";
import { NavMain } from "./nav-main";
import { token } from "@/lib/tokens";
import { JiraIcon } from "@/components/ui/logo";

export function AppSidebar({ ...props }: Readonly<React.ComponentProps<typeof Sidebar>>) {
	return (
		<Sidebar
			collapsible="offcanvas"
			className="top-(--header-height) !h-[calc(100svh-var(--header-height))]"
			{...props}
		>
			<SidebarHeader>
				<div className="flex items-center gap-2 px-2 py-1">
					<JiraIcon size="small" />
					<div className="flex flex-col">
						<span
							style={{ font: token("font.heading.xsmall") }}
							className="text-text"
						>
							VPK Project
						</span>
						<span className="text-xs text-text-subtlest">
							Software project
						</span>
					</div>
				</div>
			</SidebarHeader>
			<SidebarContent>
				<NavMain />
			</SidebarContent>
			<SidebarFooter />
		</Sidebar>
	);
}
