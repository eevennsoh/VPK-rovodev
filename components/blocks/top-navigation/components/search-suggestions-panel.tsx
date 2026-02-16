"use client";

import { useEffect, useRef } from "react";
import { token } from "@/lib/tokens";
import { Input } from "@/components/ui/input";
import { RECENT_SEARCHES, RECENT_ITEMS } from "../data/search-data";
import FilterButtonBar from "./filter-button-bar";
import RecentSearchItem from "./recent-search-item";
import RecentItemCard from "./recent-item-card";
import SearchAllAppsFooter from "./search-all-apps-footer";
import styles from "./search-suggestions-panel.module.css";
import SearchIcon from "@atlaskit/icon/core/search";

interface SearchSuggestionsPanelProps {
	ref?: React.Ref<HTMLDivElement>;
	isVisible: boolean;
	searchValue: string;
	onSearchChange: (value: string) => void;
	onSearchKeyDown: (e: React.KeyboardEvent) => void;
	onClose?: () => void;
	onSearchAllApps?: () => void;
	onRecentItemClick?: (title: string) => void;
	onRecentSearchClick?: (query: string) => void;
}

export default function SearchSuggestionsPanel({
	ref,
	isVisible,
	searchValue,
	onSearchChange,
	onSearchKeyDown,
	onSearchAllApps,
	onRecentItemClick,
	onRecentSearchClick,
}: Readonly<SearchSuggestionsPanelProps>) {
	const inputRef = useRef<HTMLInputElement>(null);

	useEffect(() => {
		if (isVisible) {
			setTimeout(() => {
				inputRef.current?.focus();
			}, 10);
		}
	}, [isVisible]);

	if (!isVisible) return null;

	return (
		<div
			ref={ref}
			style={{
				position: "fixed",
				top: "6px",
				left: "50%",
				transform: "translateX(-50%)",
				zIndex: 1000,
			}}
		>
			{/* Focused Search Box */}
			<div
				style={{
					width: "780px",
					height: "36px",
					backgroundColor: token("elevation.surface.overlay"),
					borderRadius: "8px",
					boxShadow: token("elevation.shadow.overlay"),
					display: "flex",
					alignItems: "center",
					marginBottom: "8px",
				}}
			>
				<div className={styles.focusedSearchBox} style={{ flex: 1, position: "relative" }}>
					<span className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-icon">
						<SearchIcon label="" size="small" />
					</span>
					<Input
						ref={inputRef}
						value={searchValue}
						onChange={(e) => onSearchChange((e.target as HTMLInputElement).value)}
						onKeyDown={onSearchKeyDown}
						placeholder="Search"
						autoFocus
						className="h-8 pl-7 text-sm placeholder:text-sm"
					/>
				</div>
			</div>

			{/* Suggestions Panel */}
			<div
				style={{
					width: "780px",
					height: "530px",
					backgroundColor: token("elevation.surface.overlay"),
					borderRadius: "12px",
					boxShadow: token("elevation.shadow.overlay"),
					padding: "8px 0",
					overflow: "hidden",
				}}
			>
				<FilterButtonBar />

				{/* Recent Search Items */}
				<div style={{ padding: "0 8px" }}>
					{RECENT_SEARCHES.map((search, index) => (
						<RecentSearchItem
							key={index}
							query={search}
							onClick={() => onRecentSearchClick?.(search)}
						/>
					))}
				</div>

				{/* RECENT Section */}
				<div style={{ marginTop: "8px", padding: "0 8px" }}>
					<div
						style={{
							font: token("font.body.small"),
							fontWeight: token("font.weight.bold"),
							color: token("color.text.subtlest"),
							letterSpacing: "0.06em",
							padding: "8px 12px 4px",
						}}
					>
						RECENT
					</div>

					{RECENT_ITEMS.map((item, index) => (
						<RecentItemCard
							key={index}
							title={item.title}
							metadata={item.metadata}
							timestamp={item.timestamp}
							onClick={() => onRecentItemClick?.(item.title)}
						/>
					))}
				</div>

				<SearchAllAppsFooter onClick={onSearchAllApps} />
			</div>
		</div>
	);
}
