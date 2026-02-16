"use client";

import { Input } from "@/components/ui/input";
import { token } from "@/lib/tokens";
import SearchSuggestionsPanel from "./components/search-suggestions-panel";
import { LeftNavigation } from "./components/left-navigation";
import { RightNavigation } from "./components/right-navigation";
import { CreateButton } from "./components/create-button";
import { useTopNavigation } from "./hooks/use-top-navigation";
import SearchIcon from "@atlaskit/icon/core/search";

type Product = "home" | "jira" | "confluence" | "rovo" | "search";

interface TopNavigationProps {
	product: Product;
}

export default function TopNavigation({ product }: Readonly<TopNavigationProps>) {
	const {
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
	} = useTopNavigation();

	return (
		<div
			style={{
				backgroundColor: token("elevation.surface"),
				borderBottom: `1px solid ${token("color.border")}`,
				height: "48px",
				position: "sticky",
				top: 0,
				zIndex: 100,
				alignItems: "center",
			}}
		>
			<div
				style={{
					height: "100%",
					paddingLeft: token("space.150"),
					paddingRight: token("space.150"),
					display: "flex",
					alignItems: "center",
					justifyContent: "space-between",
					position: "relative",
				}}
			>
				{isVisible && (
					<div
						style={{
							position: "absolute",
							bottom: -1,
							left: 0,
							width: "230px",
							height: "1px",
							backgroundColor: token("elevation.surface"),
							zIndex: 1,
						}}
					/>
				)}

				<LeftNavigation
					product={product}
					windowWidth={windowWidth}
					isVisible={isVisible}
					isAppSwitcherOpen={isAppSwitcherOpen}
					onToggleSidebar={toggleSidebar}
					onToggleAppSwitcher={handleToggleAppSwitcher}
					onCloseAppSwitcher={handleCloseAppSwitcher}
					onNavigate={handleNavigate}
					onHoverEnter={handleHoverEnter}
					onHoverLeave={handleHoverLeave}
				/>

				<div style={centerSectionStyle}>
					<div ref={searchContainerRef} className="search-box-wrapper" style={{ flex: 1, position: "relative" }}>
						{!isSearchFocused && (
							<>
								<span className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-icon">
									<SearchIcon label="" size="small" />
								</span>
								<Input
									value={searchValue}
									onChange={(e) => setSearchValue((e.target as HTMLInputElement).value)}
									onFocus={handleFocusSearch}
									onKeyDown={(e) => {
										if (e.key === "Enter") {
											router.push("/search");
										}
									}}
									placeholder="Search"
									className="h-7 pl-7 text-sm placeholder:text-sm"
								/>
							</>
						)}
					</div>

					<SearchSuggestionsPanel
						ref={searchPanelRef}
						isVisible={isSearchFocused}
						searchValue={searchValue}
						onSearchChange={setSearchValue}
						onSearchKeyDown={handleSearchKeyDown}
						onClose={handleCloseSearch}
						onSearchAllApps={handleSearchAllApps}
						onRecentItemClick={handleRecentItemClick}
						onRecentSearchClick={handleRecentSearchClick}
					/>

					<CreateButton windowWidth={windowWidth} />
				</div>

				<RightNavigation
					product={product}
					windowWidth={windowWidth}
					onToggleChat={toggleChat}
					onToggleTheme={toggleTheme}
				/>
			</div>
		</div>
	);
}
