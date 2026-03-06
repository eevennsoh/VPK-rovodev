"use client";

import { Badge } from "@/components/ui/badge"

/**
 * ADS Badge — important appearance
 *
 * Mirrors: https://atlassian.design/components/badge/examples
 * Section: Important
 *
 * The "important" appearance uses the bold neutral background
 * (color.background.neutral.bold) with inverse text. It is used
 * for high-urgency numeric counts such as notification dots or
 * critical alert counters.
 *
 * ADS docs note: use "important" sparingly — it draws maximum
 * visual attention and should only signal truly critical counts.
 */
export default function BadgeImportantDemo() {
	return (
		<div className="flex items-center gap-2">
			<Badge variant="important">5</Badge>
			<Badge variant="important" max={99}>
				150
			</Badge>
		</div>
	)
}
