"use client";

import { useRef, useMemo, RefObject } from "react";
import { Button } from "@/components/ui/button";
import { token } from "@/lib/tokens";
import { useClickOutside } from "@/components/hooks/use-click-outside";
import { AppSwitcherMenu } from "./app-switcher-menu";
import { PRODUCT_CONFIG } from "../data/product-config";
import AppSwitcherIcon from "@atlaskit/icon/core/app-switcher";
import SidebarCollapseIcon from "@atlaskit/icon/core/sidebar-collapse";
import SidebarExpandIcon from "@atlaskit/icon/core/sidebar-expand";

type Product = "home" | "jira" | "confluence" | "rovo" | "search";

interface LeftNavigationProps {
	product: Product;
	windowWidth: number;
	isVisible: boolean;
	isAppSwitcherOpen: boolean;
	onToggleSidebar: () => void;
	onToggleAppSwitcher: () => void;
	onCloseAppSwitcher: () => void;
	onNavigate: (path: string) => void;
	onHoverEnter: () => void;
	onHoverLeave: () => void;
}

export function LeftNavigation({
	product,
	windowWidth,
	isVisible,
	isAppSwitcherOpen,
	onToggleSidebar,
	onToggleAppSwitcher,
	onCloseAppSwitcher,
	onNavigate,
	onHoverEnter,
	onHoverLeave,
}: Readonly<LeftNavigationProps>) {
	const appSwitcherButtonRef = useRef<HTMLButtonElement>(null);
	const appSwitcherMenuRef = useRef<HTMLDivElement>(null);

	const appSwitcherRefs: RefObject<HTMLElement | null>[] = useMemo(
		() => [appSwitcherButtonRef, appSwitcherMenuRef],
		[]
	);

	useClickOutside(appSwitcherRefs, onCloseAppSwitcher, isAppSwitcherOpen);

	const { Icon, name } = PRODUCT_CONFIG[product];

	const containerStyle = useMemo(() => {
		const base = {
			display: "flex",
			alignItems: "center",
			gap: token("space.050"),
			flex: 1,
			position: "relative" as const,
			zIndex: 101,
			height: "100%",
		};

		if (windowWidth >= 1028 && windowWidth < 1516) {
			return { ...base, flex: "0 0 330px", width: "330px" };
		}
		if (windowWidth < 1028 && !isVisible) {
			return { ...base, flex: "0 0 auto", minWidth: "120px" };
		}
		if (windowWidth < 1028 && isVisible) {
			return { ...base, flex: "0 0 260px", width: "260px" };
		}
		return base;
	}, [windowWidth, isVisible]);

	return (
		<div style={containerStyle}>
			<SidebarToggle
				isVisible={isVisible}
				onToggle={onToggleSidebar}
				onHoverEnter={onHoverEnter}
				onHoverLeave={onHoverLeave}
			/>

			<AppSwitcher
				isOpen={isAppSwitcherOpen}
				isVisible={isVisible}
				buttonRef={appSwitcherButtonRef}
				menuRef={appSwitcherMenuRef}
				onToggle={onToggleAppSwitcher}
				onNavigate={onNavigate}
			/>

			<div
				style={{
					position: "absolute",
					left: isVisible ? "40px" : "80px",
					transition: "left var(--duration-medium) var(--ease-in-out)",
					marginLeft: token("space.050"),
					display: "flex",
					alignItems: "center",
					height: "100%",
				}}
			>
				<div style={{ display: "flex", alignItems: "center", gap: token("space.100") }}>
					<Icon size="small" />
					{windowWidth >= 1028 && <span style={{ font: token("font.heading.xsmall") }}>{name}</span>}
				</div>
			</div>
		</div>
	);
}

interface SidebarToggleProps {
	isVisible: boolean;
	onToggle: () => void;
	onHoverEnter: () => void;
	onHoverLeave: () => void;
}

function SidebarToggle({ isVisible, onToggle, onHoverEnter, onHoverLeave }: Readonly<SidebarToggleProps>) {
	return (
		<div
			style={{
				position: "absolute",
				left: isVisible ? "180px" : "0",
				transition: "left var(--duration-medium) var(--ease-in-out)",
				display: "flex",
				alignItems: "center",
				height: "100%",
			}}
		>
			<Button
				aria-label={isVisible ? "Collapse sidebar" : "Expand sidebar"}
				size="icon"
				variant="ghost"
				onClick={onToggle}
				onMouseEnter={onHoverEnter}
				onMouseLeave={onHoverLeave}
			>
				{isVisible ? <SidebarCollapseIcon label="" /> : <SidebarExpandIcon label="" />}
			</Button>
		</div>
	);
}

interface AppSwitcherProps {
	isOpen: boolean;
	isVisible: boolean;
	buttonRef: React.RefObject<HTMLButtonElement | null>;
	menuRef: React.RefObject<HTMLDivElement | null>;
	onToggle: () => void;
	onNavigate: (path: string) => void;
}

function AppSwitcher({ isOpen, isVisible, buttonRef, menuRef, onToggle, onNavigate }: Readonly<AppSwitcherProps>) {
	return (
		<div
			style={{
				position: "absolute",
				left: isVisible ? "0" : "40px",
				transition: "left var(--duration-medium) var(--ease-in-out)",
				display: "flex",
				alignItems: "center",
				height: "100%",
			}}
		>
			<div style={{ position: "relative" }}>
				<Button
					ref={buttonRef}
					aria-label="Switch apps"
					size="icon"
					variant={isOpen ? "secondary" : "ghost"}
					onClick={onToggle}
				>
					<AppSwitcherIcon label="" />
				</Button>
				{isOpen && (
					<div
						ref={menuRef}
						style={{
							position: "absolute",
							top: "100%",
							left: 0,
							marginTop: token("space.100"),
							zIndex: 200,
						}}
					>
						<AppSwitcherMenu onNavigate={onNavigate} />
					</div>
				)}
			</div>
		</div>
	);
}
