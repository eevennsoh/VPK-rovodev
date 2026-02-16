"use client";

import { token } from "@/lib/tokens";
import ClockIcon from "@atlaskit/icon/core/clock";

interface RecentSearchItemProps {
	query: string;
	onClick?: () => void;
}

export default function RecentSearchItem({ query, onClick }: Readonly<RecentSearchItemProps>) {
	return (
		<button
			type="button"
			className="flex w-full items-center gap-3 rounded-md border-none bg-transparent px-3 py-2 text-left transition-colors duration-[var(--duration-normal)] ease-[var(--ease-out)] hover:bg-bg-neutral-subtle-hovered"
			onClick={onClick}
		>
			<ClockIcon label="" color={token("color.icon.subtle")} />
			<div className="flex-1">
				<div className="text-text" style={{ font: token("font.body") }}>{query}</div>
			</div>
			<div
				className="shrink-0 whitespace-nowrap text-text-subtlest"
				style={{ font: token("font.body.small") }}
			>
				Recent search
			</div>
		</button>
	);
}
