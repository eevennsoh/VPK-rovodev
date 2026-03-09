"use client";

import { useState, useEffect } from "react";
import { token } from "@/lib/tokens";
import { usePathname } from "next/navigation";

import { useSidebar } from "@/app/contexts/context-sidebar";
import { JiraSidebar } from "./variants/jira";
import { ConfluenceSidebar } from "./variants/confluence";

type Product = "home" | "jira" | "confluence" | "rovo" | "search";

interface SidebarProps {
	product: Product;
}

export default function Sidebar({ product }: Readonly<SidebarProps>) {
	const [selectedItem, setSelectedItem] = useState(product === "confluence" ? "Demo Live page" : "Vitafleet Q4 Launch");
	const { isVisible, isHovered, setHovered, setCurrentRoute } = useSidebar();
	const shouldShow = isVisible || isHovered;
	const pathname = usePathname();

	// Update route when pathname changes
	useEffect(() => {
		if (pathname.startsWith("/jira") || pathname.startsWith("/sprint-board")) {
			setCurrentRoute("jira");
		} else if (pathname.startsWith("/confluence")) {
			setCurrentRoute("confluence");
		} else if (pathname.startsWith("/fullscreen-chat")) {
			setCurrentRoute("rovo");
		} else if (pathname.startsWith("/search")) {
			setCurrentRoute("search");
		} else {
			setCurrentRoute("home");
		}
	}, [pathname, setCurrentRoute]);

	// Render the appropriate sidebar based on product
	const renderSidebarContent = () => {
		switch (product) {
			case "jira":
				return <JiraSidebar selectedItem={selectedItem} onSelectItem={setSelectedItem} />;
			case "confluence":
				return <ConfluenceSidebar selectedItem={selectedItem} onSelectItem={setSelectedItem} />;
			default:
				return <JiraSidebar selectedItem={selectedItem} onSelectItem={setSelectedItem} />;
		}
	};

	return (
		<>
			<div
				style={{
					width: "230px",
					height: isVisible ? "100vh" : "calc(100vh - 48px)",
					backgroundColor: token("elevation.surface"),
					borderRight: `1px solid ${token("color.border")}`,
					position: "fixed",
					left: 0,
					top: isVisible ? "0" : "48px",
					transform: shouldShow ? "translateX(0)" : "translateX(-100%)",
					transition: "transform var(--duration-medium) var(--ease-in-out)",
					overflow: "auto",
					zIndex: isVisible || isHovered ? 99 : 50,
				}}
				onMouseLeave={() => {
					if (isHovered && !isVisible) {
						setHovered(false);
					}
				}}
			>
				<div
					style={{
						padding: token("space.150"),
						paddingTop: isVisible ? "calc(48px + 12px)" : token("space.150"),
						display: "flex",
						flexDirection: "column",
					}}
				>
					{renderSidebarContent()}
				</div>
			</div>

			{/* Border overlay that sits above top nav when sidebar is visible */}
			{isVisible && (
				<div
					style={{
						position: "fixed",
						left: "229px",
						top: 0,
						width: "1px",
						height: "48px",
						backgroundColor: token("color.border"),
						zIndex: 102,
						transform: shouldShow ? "translateX(0)" : "translateX(-100%)",
						transition: "transform var(--duration-medium) var(--ease-in-out)",
					}}
				/>
			)}
		</>
	);
}
