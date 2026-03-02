"use client";

import { useState, useCallback } from "react";
import { token } from "@/lib/tokens";
import { Button } from "@/components/ui/button";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { MakeItemCard } from "@/components/blocks/make-item/components/make-item-card";
import { MOCK_MAKE_ITEMS } from "@/components/blocks/make-item/lib/types";
import type { MakeItem } from "@/components/blocks/make-item/lib/types";
import { GALLERY_ITEMS, CATEGORIES } from "@/components/blocks/make-gallery/data/gallery-items";
import type { Category } from "@/components/blocks/make-gallery/data/gallery-items";
import SearchIcon from "@atlaskit/icon/core/search";

const APP_ITEMS: MakeItem[] = [
	{
		id: GALLERY_ITEMS[0].id,
		title: GALLERY_ITEMS[0].title,
		description: GALLERY_ITEMS[0].description,
		type: GALLERY_ITEMS[0].type,
		ascii: GALLERY_ITEMS[0].ascii,
		color: GALLERY_ITEMS[0].color,
		lastUpdated: "Feb 22, 2026",
		users: 12408,
		rating: 4.6,
		ratingCount: "3.8K",
		maintainers: [{ name: "Alex" }, { name: "Sam" }, { name: "Jordan" }],
	},
];

function filterItems(items: MakeItem[], category: Category): MakeItem[] {
	if (category === "all") return items;
	return items.filter((item) => item.type === category);
}

export default function MakeGalleryContent() {
	const [activeCategory, setActiveCategory] = useState<Category>("all");
	const [searchQuery, setSearchQuery] = useState("");
	const allItems = [...APP_ITEMS, ...MOCK_MAKE_ITEMS.slice(2)];
	const [recurringOverrides, setRecurringOverrides] = useState<Record<string, boolean>>({});

	const searchScopeLabel =
		activeCategory === "all"
			? "all"
			: (CATEGORIES.find((c) => c.value === activeCategory)?.label ?? "all").toLowerCase();

	const appFiltered = filterItems(allItems, activeCategory).map((item) => {
		if (item.recurring && item.id in recurringOverrides) {
			return { ...item, recurring: { ...item.recurring, enabled: recurringOverrides[item.id] } };
		}
		return item;
	});

	const handleRecurringToggle = useCallback((id: string, enabled: boolean) => {
		setRecurringOverrides((prev) => ({ ...prev, [id]: enabled }));
	}, []);

	return (
		<div className="h-full overflow-y-auto">
			<div className="mx-auto w-full max-w-[800px] px-6 pt-8 pb-8">
				<div className="mb-6 flex items-center justify-between">
					<h1
						style={{ font: token("font.heading.large") }}
						className="text-text"
					>
						Pick up where you left off
					</h1>
					<Button>Create</Button>
				</div>

				<div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
					<ToggleGroup
						aria-label="Filter by category"
						value={[activeCategory]}
						onValueChange={(newValue: string[]) => {
							if (newValue.length > 0) {
								setActiveCategory(newValue[0] as Category);
							}
						}}
						spacing={1}
					>
						{CATEGORIES.map((cat) => (
							<ToggleGroupItem key={cat.value} value={cat.value}>
								{cat.label}
							</ToggleGroupItem>
						))}
					</ToggleGroup>
					<div className="w-full md:w-[240px]">
						<InputGroup>
							<InputGroupAddon align="inline-start">
								<SearchIcon label="" size="small" />
							</InputGroupAddon>
							<InputGroupInput
								aria-label={`Search ${searchScopeLabel}`}
								placeholder={`Search ${searchScopeLabel}`}
								value={searchQuery}
								onChange={(e) => setSearchQuery(e.currentTarget.value)}
							/>
						</InputGroup>
					</div>
				</div>

				{appFiltered.length > 0 && (
					<section className="mb-6">
						<div className="flex flex-col gap-4">
							{appFiltered.map((item) => (
								<MakeItemCard
									key={item.id}
									item={item}
									className="h-[200px]"
									onRecurringToggle={item.recurring
										? (enabled) => handleRecurringToggle(item.id, enabled)
										: undefined
									}
								/>
							))}
						</div>
					</section>
				)}
			</div>
		</div>
	);
}
