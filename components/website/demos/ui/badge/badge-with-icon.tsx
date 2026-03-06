"use client";

import CheckCircleIcon from "@atlaskit/icon/core/check-circle"
import ErrorIcon from "@atlaskit/icon/core/error"
import WarningIcon from "@atlaskit/icon/core/warning"

import { Badge } from "@/components/ui/badge"

/**
 * ADS Badge — with icon
 *
 * VPK extension (not a direct ADS docs example, but consistent with
 * the ADS docs illustration of badges alongside icons).
 *
 * VPK Badge supports leading/trailing icons via the
 * has-data-[icon=inline-start]/has-data-[icon=inline-end] padding adjustments.
 * Pass data-icon="inline-start" or data-icon="inline-end" on the <svg> element.
 */
export default function BadgeWithIconDemo() {
	return (
		<div className="flex flex-wrap items-center gap-2">
			<Badge variant="success">
				<CheckCircleIcon label="" color="currentColor" />
				+100
			</Badge>
			<Badge variant="danger">
				<ErrorIcon label="" color="currentColor" />
				-50
			</Badge>
			<Badge variant="warning">
				<WarningIcon label="" color="currentColor" />
				5
			</Badge>
			<Badge variant="information">
				<CheckCircleIcon label="" color="currentColor" />
				12
			</Badge>
		</div>
	)
}
