"use client";

import SearchIcon from "@atlaskit/icon/core/search";
import { token } from "@/lib/tokens";

export function MakeSearchPlaceholder() {
	return (
		<div className="flex h-full flex-col items-center justify-center gap-3 text-text-subtlest">
			<SearchIcon label="" size="medium" color={token("color.icon.subtle")} />
			<p className="text-sm">Search coming soon</p>
		</div>
	);
}
