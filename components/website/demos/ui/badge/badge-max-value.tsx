"use client";

import { Badge } from "@/components/ui/badge"

/**
 * ADS Badge — max value prop
 *
 * Mirrors: https://atlassian.design/components/badge/examples
 * Section: Max value
 *
 * When the numeric value exceeds `max`, the badge displays "{max}+".
 * Set `max={false}` to disable capping and always show the raw value.
 * The default max is 99.
 */
export default function BadgeMaxValueDemo() {
	return (
		<div className="flex flex-wrap items-center gap-2">
			{/* Default max of 99 — 150 displays as "99+" */}
			<Badge>150</Badge>

			{/* Custom max of 50 — 100 displays as "50+" */}
			<Badge max={50}>{100}</Badge>

			{/* Value under max — displayed as-is */}
			<Badge max={99}>{42}</Badge>

			{/* max={false} — always show raw value regardless of size */}
			<Badge max={false}>{1000}</Badge>
		</div>
	)
}
