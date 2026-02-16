"use client";

import { useState } from "react";
import { token } from "@/lib/tokens";
import { NavigationItem } from "./navigation-item";
import { ContentSearchField } from "./content-search-field";
import { FolderHeader } from "./folder-header";
import { CONTENT_TREE_ITEMS } from "../data/confluence-navigation";
import AddIcon from "@atlaskit/icon/core/add";

interface ContentTreeSectionProps {
	selectedItem: string;
	onSelectItem: (item: string) => void;
}

export function ContentTreeSection({
	selectedItem,
	onSelectItem,
}: Readonly<ContentTreeSectionProps>) {
	const [searchValue, setSearchValue] = useState("");

	return (
		<div style={{ paddingLeft: token("space.100") }}>
			<ContentSearchField value={searchValue} onChange={setSearchValue} />

			<FolderHeader name="FY26 Planning" />

			<div style={{ paddingLeft: token("space.150") }}>
				{CONTENT_TREE_ITEMS.map((item) => (
					<NavigationItem
						key={item.id}
						icon={item.icon}
						label={item.label}
						isSelected={item.isSelectable && selectedItem === item.label}
						onClick={() => onSelectItem(item.label)}
					/>
				))}
			</div>

			<div style={{ paddingLeft: token("space.150") }}>
				<NavigationItem icon={AddIcon} label="Create" onClick={() => {}} />
			</div>
		</div>
	);
}
