"use client";

import { token } from "@/lib/tokens";
import { WebsiteSidebarNav } from "@/components/website/website-sidebar-nav";
import { WebsiteHeader } from "@/components/website/website-header";
import { AI_COMPONENTS, UI_COMPONENTS, BLOCK_COMPONENTS, PROJECT_COMPONENTS, UTILITY_COMPONENTS, VISUAL_COMPONENTS } from "@/app/data/components";
import { buildNavItems, UI_GROUPS, BLOCK_GROUPS } from "@/app/data/nav-utils";
import { resolveAiAdsPackage, resolveBlockAdsPackage, resolveUiAdsPackage, resolveUiAdsTagVariant } from "@/app/data/nav-ads";

const staticPages = [{ name: "Home", href: "/" }];

const sections = [
	{
		title: "UI",
		defaultOpen: false,
		items: buildNavItems(UI_COMPONENTS, "/components/ui/", UI_GROUPS, resolveUiAdsPackage, resolveUiAdsTagVariant),
	},
	{
		title: "UI \u2014 AI",
		defaultOpen: false,
		items: AI_COMPONENTS.map((c) => ({
			name: c.name,
			href: `/components/ui-ai/${c.slug}`,
			adsPackage: resolveAiAdsPackage(c.slug),
		})),
	},
	{
		title: "Blocks",
		defaultOpen: false,
		items: buildNavItems(BLOCK_COMPONENTS, "/components/blocks/", BLOCK_GROUPS, resolveBlockAdsPackage),
	},
	{
		title: "Projects",
		defaultOpen: false,
		items: PROJECT_COMPONENTS.map((c) => ({
			name: c.name,
			href: `/components/projects/${c.slug}`,
			adsPackage: "Atlassian Design System",
		})),
	},
	{
		title: "Utils",
		defaultOpen: false,
		items: UTILITY_COMPONENTS.map((c) => ({
			name: c.name,
			href: `/components/utility/${c.slug}`,
		})),
	},
	{
		title: "Visual",
		defaultOpen: false,
		items: VISUAL_COMPONENTS.map((c) => ({
			name: c.name,
			href: `/components/visual/${c.slug}`,
		})),
	},
];

export default function ComponentsLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<>
			<WebsiteSidebarNav staticPages={staticPages} sections={sections} logoText="VPK" />

			<div
				className="website-main-content"
				style={{
					minHeight: "100vh",
					backgroundColor: token("elevation.surface"),
				}}
			>
				<WebsiteHeader packageName="@vpk" version="1.0.0" />

				<main>{children}</main>
			</div>
		</>
	);
}
