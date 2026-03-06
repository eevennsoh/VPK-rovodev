"use client";

import { Badge } from "@/components/ui/badge"

/**
 * ADS Badge — default appearance
 *
 * Mirrors: https://atlassian.design/components/badge/examples
 * Section: Default
 *
 * The default badge displays a numeric value in a neutral grey pill.
 * Capped at 99 by default (shows "99+" when the value exceeds max).
 */
export default function BadgeDefaultDemo() {
	return (
		<div className="flex items-center gap-2">
			<Badge>8</Badge>
			<Badge max={99}>150</Badge>
			<Badge max={false}>1000</Badge>
		</div>
	)
}
