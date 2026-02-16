"use client"

import { Banner } from "@/components/ui/banner"

export default function BannerDemo() {
	return (
		<div className="flex flex-col gap-4">
			<Banner variant="warning">
				Your license is about to expire. Renew before March 1 to avoid service interruption.
			</Banner>
			<Banner variant="error">
				This page is no longer available. Contact your admin for details.
			</Banner>
			<Banner variant="announcement">
				Confluence is now available for your team. Get started today.
			</Banner>
		</div>
	)
}

export function BannerDemoWarning() {
	return (
		<Banner variant="warning">
			Your license is about to expire. Renew before March 1 to avoid service interruption.
		</Banner>
	)
}

export function BannerDemoError() {
	return (
		<Banner variant="error">
			This page is no longer available. Contact your admin for details.
		</Banner>
	)
}

export function BannerDemoAnnouncement() {
	return (
		<Banner variant="announcement">
			Confluence is now available for your team. Get started today.
		</Banner>
	)
}

export function BannerDemoVariants() {
	return (
		<div className="flex flex-col gap-4">
			<Banner variant="warning">
				Your license is about to expire.
			</Banner>
			<Banner variant="error">
				This page is no longer available.
			</Banner>
			<Banner variant="announcement">
				Confluence is now available for your team.
			</Banner>
		</div>
	)
}
