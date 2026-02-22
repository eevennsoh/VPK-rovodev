"use client";

import { token } from "@/lib/tokens";
import { WebsiteSidebarNav } from "@/components/website/website-sidebar-nav";
import { WebsiteHeader } from "@/components/website/website-header";
import { AI_COMPONENTS, UI_COMPONENTS, BLOCK_COMPONENTS, TEMPLATE_COMPONENTS, UTILITY_COMPONENTS, VISUAL_COMPONENTS } from "@/app/data/components";
import { buildNavItems, UI_GROUPS, BLOCK_GROUPS } from "@/app/data/nav-utils";
import { getAdsDisplayInfo } from "@/app/data/ads-equivalents";

const staticPages = [{ name: "Home", href: "/" }];
const ADS_AI_SLUGS = new Set(["animated-dots", "animated-rovo", "chain-of-thought", "code-block", "conversation", "generative-card", "message", "plan", "prompt-input", "queue", "reasoning", "shimmer", "sources", "speech-input", "suggestion", "task"]);
const ADS_UI_DISCOVERY_SLUGS = new Set(["skill-card"]);
const ADS_BLOCK_SLUGS = new Set([
	"agent-grid",
	"agent-progress",
	"agent-summary",
	"top-navigation",
	"prompt-gallery",
	"shared-ui",
	"product-sidebar",
	"sidebar-rail",
	"work-item-widget",
	"question-card",
	"approval-card",
]);

const uiAdsResolver = (slug: string) => {
	if (ADS_UI_DISCOVERY_SLUGS.has(slug)) {
		return "Atlassian Design System";
	}
	return getAdsDisplayInfo(slug)?.displayText ?? (slug === "switch" ? "Atlassian Design System" : undefined);
};

const uiAdsTagVariantResolver = (slug: string) => {
	return ADS_UI_DISCOVERY_SLUGS.has(slug) ? "discovery" : undefined;
};

const blockAdsResolver = (slug: string) => (ADS_BLOCK_SLUGS.has(slug) ? "Atlassian Design System" : undefined);

const sections = [
	{
		title: "UI",
		defaultOpen: false,
		items: buildNavItems(UI_COMPONENTS, "/components/ui/", UI_GROUPS, uiAdsResolver, uiAdsTagVariantResolver),
	},
	{
		title: "UI \u2014 AI",
		defaultOpen: false,
		items: AI_COMPONENTS.map((c) => ({
			name: c.name,
			href: `/components/ui-ai/${c.slug}`,
			adsPackage: ADS_AI_SLUGS.has(c.slug) ? "Atlassian Design System" : undefined,
		})),
	},
	{
		title: "Blocks",
		defaultOpen: false,
		items: buildNavItems(BLOCK_COMPONENTS, "/components/blocks/", BLOCK_GROUPS, blockAdsResolver),
	},
	{
		title: "Templates",
		defaultOpen: false,
		items: TEMPLATE_COMPONENTS.map((c) => ({
			name: c.name,
			href: `/components/templates/${c.slug}`,
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
