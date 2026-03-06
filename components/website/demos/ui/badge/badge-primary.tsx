"use client";

import { Badge } from "@/components/ui/badge"

/**
 * ADS Badge — primary appearance
 *
 * Mirrors: https://atlassian.design/components/badge/examples
 * Section: Primary
 *
 * The "primary" appearance uses the information-subtler background
 * (color.background.information.subtler) with information-bolder text.
 * In ADS this maps to the brand blue family.
 */
export default function BadgePrimaryDemo() {
	return (
		<div className="flex items-center gap-2">
			<Badge variant="primary">5</Badge>
			<Badge variant="primary" max={99}>
				150
			</Badge>
		</div>
	)
}
