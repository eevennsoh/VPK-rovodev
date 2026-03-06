"use client";

import { Badge } from "@/components/ui/badge"

/**
 * ADS Badge — all appearance values
 *
 * Mirrors: https://atlassian.design/components/badge/examples
 * Section: Appearance
 *
 * ADS Badge supports the following appearance values:
 *   default, neutral, primary, primaryInverted, important,
 *   added, removed, warning, discovery, danger, success,
 *   information, inverse
 *
 * VPK maps these to the `variant` prop.
 */
export default function BadgeAppearanceDemo() {
	return (
		<div className="flex flex-wrap items-center gap-2">
			{/* ADS canonical semantic appearances */}
			<Badge variant="default">default</Badge>
			<Badge variant="neutral">neutral</Badge>
			<Badge variant="important">important</Badge>
			<Badge variant="primary">primary</Badge>
			<Badge variant="primaryInverted">primaryInverted</Badge>
			<Badge variant="added">added</Badge>
			<Badge variant="removed">removed</Badge>
			<Badge variant="warning">warning</Badge>
			<Badge variant="discovery">discovery</Badge>
			<Badge variant="danger">danger</Badge>
			<Badge variant="success">success</Badge>
			<Badge variant="information">information</Badge>
			<Badge variant="inverse">inverse</Badge>
		</div>
	)
}
