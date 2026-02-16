"use client";

import { useCallback, useRef, useState } from "react";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import { AppSidebar } from "./components/app-sidebar";
import { SiteHeader } from "./components/site-header";

export default function Page() {
	const [isOpen, setIsOpen] = useState(false);
	const [isHovered, setIsHovered] = useState(false);
	const hoverTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	const handleHoverEnter = useCallback(() => {
		if (hoverTimeoutRef.current) {
			clearTimeout(hoverTimeoutRef.current);
			hoverTimeoutRef.current = null;
		}
		setIsHovered(true);
	}, []);

	const handleHoverLeave = useCallback(() => {
		hoverTimeoutRef.current = setTimeout(() => {
			setIsHovered(false);
		}, 100);
	}, []);

	const handleTogglePin = useCallback(() => {
		setIsOpen((prev) => !prev);
	}, []);

	return (
		<div
			style={
				{
					"--header-height": "48px",
					"--sidebar-width": "230px",
				} as React.CSSProperties
			}
		>
			<SidebarProvider
				open={isOpen || isHovered}
				onOpenChange={setIsOpen}
				className={cn(
					"flex flex-col [&_[data-slot=sidebar-gap]]:ease-in-out [&_[data-slot=sidebar-container]]:ease-in-out",
					!isOpen && isHovered && "[&_[data-slot=sidebar-gap]]:w-0!",
				)}
			>
				<SiteHeader
					isPinned={isOpen}
					onTogglePin={handleTogglePin}
					onHoverEnter={handleHoverEnter}
					onHoverLeave={handleHoverLeave}
				/>
				<div className="flex flex-1">
					<AppSidebar
						onMouseEnter={handleHoverEnter}
						onMouseLeave={handleHoverLeave}
					/>
					<SidebarInset>
						<div className="flex flex-1 flex-col gap-4 p-4">
							<div className="grid auto-rows-min gap-4 md:grid-cols-3">
								<div className="aspect-video rounded-xl bg-bg-neutral" />
								<div className="aspect-video rounded-xl bg-bg-neutral" />
								<div className="aspect-video rounded-xl bg-bg-neutral" />
							</div>
							<div className="min-h-[100vh] flex-1 rounded-xl bg-bg-neutral md:min-h-min" />
						</div>
					</SidebarInset>
				</div>
			</SidebarProvider>
		</div>
	);
}
