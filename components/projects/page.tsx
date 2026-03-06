"use client";

import React from "react";
import { token } from "@/lib/tokens";
import TopNavigation from "@/components/blocks/top-navigation/page";
import Sidebar from "@/components/blocks/product-sidebar/page";
import { RovoChatPanel } from "@/components/templates/fullscreen-chat";
import FloatingRovoButton from "@/components/templates/shared/components/floating-rovo-button";
import { useSidebar } from "@/app/contexts/context-sidebar";
import { useRovoChat } from "@/app/contexts";

type Product = "home" | "jira" | "confluence" | "rovo" | "search";

interface AppLayoutProps {
	product: Product;
	children: React.ReactNode;
}

export default function AppLayout({ product, children }: Readonly<AppLayoutProps>) {
	const { isVisible } = useSidebar();
	const { isOpen, closeChat } = useRovoChat();
	const sidebarWidth = isVisible ? "230px" : "0px";

	return (
		<div style={{ minHeight: "100vh", backgroundColor: token("color.background.neutral.subtle") }}>
			{/* Top Navigation */}
			<TopNavigation product={product} />

			{/* Main container with sidebar and content */}
			<div style={{ display: "flex", height: "calc(100vh - 48px)" }}>
				{/* Sidebar */}
				<Sidebar product={product} />

				{/* Main Content Area */}
				<div
					style={{
						marginLeft: sidebarWidth,
						transition: "margin-left 0.15s cubic-bezier(0.4, 0, 0.2, 1)",
						flex: 1,
						overflow: "auto",
					}}
				>
					{children}
				</div>

				{/* Rovo Chat Panel */}
				{isOpen && <RovoChatPanel onClose={closeChat} product={product} />}
			</div>

			{/* Floating Rovo Button */}
			<FloatingRovoButton />
		</div>
	);
}
