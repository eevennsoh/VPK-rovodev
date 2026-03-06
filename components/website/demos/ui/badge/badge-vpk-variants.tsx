"use client";

import { Badge } from "@/components/ui/badge"

/**
 * ADS Badge — VPK structural variants
 *
 * These variants are VPK extensions and are not part of the ADS Badge API.
 * They are included for completeness and to support shadcn/UI parity.
 *
 *   outline — border only, no background fill
 *   ghost   — no border, no fill (text only)
 *   link    — underline link style
 */
export default function BadgeVpkVariantsDemo() {
	return (
		<div className="flex flex-wrap items-center gap-2">
			<Badge variant="outline">8</Badge>
			<Badge variant="ghost">8</Badge>
			<Badge variant="link">8</Badge>
		</div>
	)
}
