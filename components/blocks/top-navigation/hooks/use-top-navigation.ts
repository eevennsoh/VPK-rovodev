"use client";

import { useState, useRef, useMemo, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useWindowWidth } from "@/components/hooks/use-window-width";
import { useClickOutside } from "@/components/hooks/use-click-outside";
import { useSidebar } from "@/app/contexts/context-sidebar";
import { useRovoChatAsk } from "@/app/contexts/context-rovo-chat-ask";
import { useTheme } from "@/components/utils/theme-wrapper";
import { token } from "@/lib/tokens";

function getInitialSearchValue(pathname: string): string {
	return pathname === "/search" ? "2026 OKR planning" : "";
}

export function useTopNavigation() {
	const pathname = usePathname();
	const router = useRouter();
	const [searchValue, setSearchValue] = useState(() => getInitialSearchValue(pathname));
	const [isAppSwitcherOpen, setIsAppSwitcherOpen] = useState(false);
	const [isSearchFocused, setIsSearchFocused] = useState(false);
	const windowWidth = useWindowWidth();
	const { isVisible, toggleSidebar, setHovered } = useSidebar();
	const { toggleChat } = useRovoChatAsk();
	const { setTheme, actualTheme } = useTheme();
	const searchContainerRef = useRef<HTMLDivElement>(null);
	const searchPanelRef = useRef<HTMLDivElement>(null);

	const searchRefs = useMemo(() => [searchContainerRef, searchPanelRef], []);

	useClickOutside(searchRefs, () => setIsSearchFocused(false), isSearchFocused);

	const toggleTheme = useCallback(() => {
		setTheme(actualTheme === "light" ? "dark" : "light");
	}, [setTheme, actualTheme]);

	const handleNavigate = useCallback(
		(path: string) => {
			router.push(path);
			setIsAppSwitcherOpen(false);
		},
		[router]
	);

	const handleSearchKeyDown = useCallback(
		(e: React.KeyboardEvent) => {
			if (e.key === "Enter") {
				router.push("/search");
				setIsSearchFocused(false);
			}
			if (e.key === "Escape") {
				setIsSearchFocused(false);
			}
		},
		[router]
	);

	const handleSearchAllApps = useCallback(() => {
		router.push("/search");
		setIsSearchFocused(false);
	}, [router]);

	const handleRecentItemClick = useCallback(() => {
		setIsSearchFocused(false);
	}, []);

	const handleRecentSearchClick = useCallback(
		(query: string) => {
			setSearchValue(query);
			router.push("/search");
			setIsSearchFocused(false);
		},
		[router]
	);

	const handleCloseSearch = useCallback(() => setIsSearchFocused(false), []);
	const handleFocusSearch = useCallback(() => setIsSearchFocused(true), []);
	const handleToggleAppSwitcher = useCallback(() => setIsAppSwitcherOpen((prev) => !prev), []);
	const handleCloseAppSwitcher = useCallback(() => setIsAppSwitcherOpen(false), []);
	const handleHoverEnter = useCallback(() => setHovered(true), [setHovered]);
	const handleHoverLeave = useCallback(() => setHovered(false), [setHovered]);

	const centerSectionStyle = useMemo(() => {
		const base = {
			display: "flex",
			alignItems: "center",
			gap: token("space.100"),
			width: "100%",
		};

		if (windowWidth >= 1516) {
			return { ...base, maxWidth: "762px" };
		}
		if (windowWidth >= 1028) {
			return { ...base, minWidth: "292px", maxWidth: "762px" };
		}
		return { ...base, maxWidth: "none" };
	}, [windowWidth]);

	return {
		searchValue,
		setSearchValue,
		isAppSwitcherOpen,
		isSearchFocused,
		windowWidth,
		isVisible,
		toggleSidebar,
		toggleChat,
		toggleTheme,
		searchContainerRef,
		searchPanelRef,
		router,
		centerSectionStyle,
		handleNavigate,
		handleSearchKeyDown,
		handleSearchAllApps,
		handleRecentItemClick,
		handleRecentSearchClick,
		handleCloseSearch,
		handleFocusSearch,
		handleToggleAppSwitcher,
		handleCloseAppSwitcher,
		handleHoverEnter,
		handleHoverLeave,
	};
}
