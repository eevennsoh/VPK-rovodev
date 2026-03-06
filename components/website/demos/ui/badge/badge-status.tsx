"use client";

import { Badge } from "@/components/ui/badge"

/**
 * ADS Badge — status appearances (added, removed, warning)
 *
 * Mirrors: https://atlassian.design/components/badge/examples
 * Sections: Added / Removed / Warning
 *
 * These appearances convey the semantic state of a numeric delta:
 *   added   — positive change (color.background.success.subtler)
 *   removed — negative change (color.background.danger.subtler)
 *   warning — caution (color.background.warning.subtler)
 *
 * ADS note: use these for count changes in version history,
 * diff views, or change-tracking contexts.
 */
export default function BadgeStatusDemo() {
	return (
		<div className="flex flex-wrap items-center gap-2">
			<Badge variant="added">+100</Badge>
			<Badge variant="removed">-50</Badge>
			<Badge variant="warning">5</Badge>
		</div>
	)
}
