"use client";

import { useRouter } from "next/navigation";
import { token } from "@/lib/tokens";
import { WebsiteSidebarNav } from "@/components/website/website-sidebar-nav";
import { WebsiteHeader } from "@/components/website/website-header";
import { WebsiteGrid } from "@/components/website/website-grid";
import { WebsiteCard } from "@/components/website/website-card";
import { WebsitePreview } from "@/components/website/website-preview";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AI_COMPONENTS, UI_COMPONENTS, BLOCK_COMPONENTS, TEMPLATE_COMPONENTS, UTILITY_COMPONENTS, VISUAL_COMPONENTS } from "./data/components";
import { buildNavItems, UI_GROUPS, BLOCK_GROUPS } from "./data/nav-utils";

export type HomeCategory = "ui" | "ui-ai" | "blocks" | "templates" | "utility" | "visual";

const ADS_BLOCK_SLUGS = new Set([
	"agent-grid",
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
const blockAdsResolver = (slug: string) => ADS_BLOCK_SLUGS.has(slug) ? "Atlassian Design System" : undefined;
const ADS_AI_SLUGS = new Set(["code-block", "message", "plan", "prompt-input", "queue", "reasoning"]);

const staticPages = [{ name: "Home", href: "/" }];

const sections = [
	{
		title: "UI",
		defaultOpen: false,
		items: buildNavItems(UI_COMPONENTS, "/components/ui/", UI_GROUPS),
	},
	{
		title: "UI — AI",
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
		items: TEMPLATE_COMPONENTS.map((c) => ({ name: c.name, href: `/components/templates/${c.slug}`, adsPackage: "Atlassian Design System" })),
	},
	{
		title: "Utils",
		defaultOpen: false,
		items: UTILITY_COMPONENTS.map((c) => ({ name: c.name, href: `/components/utility/${c.slug}` })),
	},
	{
		title: "Visual",
		defaultOpen: false,
		items: VISUAL_COMPONENTS.map((c) => ({ name: c.name, href: `/components/visual/${c.slug}` })),
	},
];

const CATEGORY_OPTIONS: ReadonlyArray<{ key: HomeCategory; title: string; count: number }> = [
	{ key: "ui", title: "UI", count: UI_COMPONENTS.length },
	{ key: "ui-ai", title: "UI — AI", count: AI_COMPONENTS.length },
	{ key: "blocks", title: "Blocks", count: BLOCK_COMPONENTS.length },
	{ key: "templates", title: "Templates", count: TEMPLATE_COMPONENTS.length },
	{ key: "utility", title: "Utils", count: UTILITY_COMPONENTS.length },
	{ key: "visual", title: "Visual", count: VISUAL_COMPONENTS.length },
];

interface HomeContentProps {
	category: HomeCategory;
}

export function HomeContent({ category }: Readonly<HomeContentProps>) {
	const router = useRouter();

	function handleCategoryChange(value: string) {
		if (value === "ui") {
			router.push("/");
		} else {
			router.push(`/${value}`);
		}
	}

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
				<WebsiteHeader
					packageName="@vpk"
					version="1.0.0"
					leftContent={(
						<div className="w-full overflow-x-auto">
							<Tabs
								value={category}
								onValueChange={handleCategoryChange}
							>
								<TabsList className="min-w-max">
									{CATEGORY_OPTIONS.map((cat) => (
										<TabsTrigger
											key={cat.key}
											id={`home-category-tab-${cat.key}`}
											value={cat.key}
											className="gap-2 px-3"
										>
											<span>{cat.title}</span>
											<span className="text-xs text-text-subtle">{cat.count}</span>
										</TabsTrigger>
									))}
								</TabsList>
							</Tabs>
						</div>
					)}
				/>

				<main>
					{category === "ui" && (
						<>
							<SectionHeading id="ui" title="UI" count={UI_COMPONENTS.length} />
							<WebsiteGrid>
								{UI_COMPONENTS.map((comp) => (
									<WebsiteCard key={comp.slug} name={comp.name} href={`/components/ui/${comp.slug}`}>
										<WebsitePreview slug={comp.slug} name={comp.name} importPath={comp.importPath} category="ui" />
									</WebsiteCard>
								))}
							</WebsiteGrid>
						</>
					)}

					{category === "ui-ai" && (
						<>
							<SectionHeading id="ai-elements" title="UI — AI" count={AI_COMPONENTS.length} />
							<WebsiteGrid>
								{AI_COMPONENTS.map((comp) => (
									<WebsiteCard key={comp.slug} name={comp.name} href={`/components/ui-ai/${comp.slug}`}>
										<WebsitePreview slug={comp.slug} name={comp.name} importPath={comp.importPath} category="ui-ai" />
									</WebsiteCard>
								))}
							</WebsiteGrid>
						</>
					)}

					{category === "blocks" && (
						<>
							<SectionHeading id="blocks" title="Blocks" count={BLOCK_COMPONENTS.length} />
							<ul className="grid grid-cols-1 list-none m-0 p-0">
								{BLOCK_COMPONENTS.map((comp) => (
									<WebsiteCard key={comp.slug} name={comp.name} href={`/components/blocks/${comp.slug}`} fullWidth>
										<iframe
											src={`/preview/blocks/${comp.slug}`}
											title={comp.name}
											className="h-full w-full border-0"
											loading="lazy"
										/>
									</WebsiteCard>
								))}
							</ul>
						</>
					)}

					{category === "templates" && (
						<>
							<SectionHeading id="templates" title="Templates" count={TEMPLATE_COMPONENTS.length} />
							<ul className="grid grid-cols-1 list-none m-0 p-0">
								{TEMPLATE_COMPONENTS.map((comp) => (
									<WebsiteCard key={comp.slug} name={comp.name} href={`/components/templates/${comp.slug}`} fullWidth>
										<iframe
											src={`/preview/templates/${comp.slug}`}
											title={comp.name}
											className="h-full w-full border-0"
											loading="lazy"
										/>
									</WebsiteCard>
								))}
							</ul>
						</>
					)}

					{category === "utility" && (
						<>
							<SectionHeading id="utility" title="Utils" count={UTILITY_COMPONENTS.length} />
							<ul className="grid grid-cols-1 list-none m-0 p-0">
								{UTILITY_COMPONENTS.map((comp) => (
									<WebsiteCard key={comp.slug} name={comp.name} href={`/components/utility/${comp.slug}`} fullWidth>
										<iframe
											src={`/preview/utility/${comp.slug}`}
											title={comp.name}
											className="h-full w-full border-0"
											loading="lazy"
										/>
									</WebsiteCard>
								))}
							</ul>
						</>
					)}

					{category === "visual" && (
						<>
							<SectionHeading id="visual" title="Visual" count={VISUAL_COMPONENTS.length} />
							<WebsiteGrid>
								{VISUAL_COMPONENTS.map((comp) => (
									<WebsiteCard key={comp.slug} name={comp.name} href={`/components/visual/${comp.slug}`}>
										<WebsitePreview slug={comp.slug} name={comp.name} importPath={comp.importPath} category="visual" />
									</WebsiteCard>
								))}
							</WebsiteGrid>
						</>
					)}
				</main>
			</div>
		</>
	);
}

interface SectionHeadingProps {
	id: string;
	title: string;
	count: number;
}

function SectionHeading({ id, title, count }: Readonly<SectionHeadingProps>) {
	return (
		<div
			id={id}
			style={{
				display: "flex",
				alignItems: "baseline",
				gap: token("space.100"),
				paddingBlock: token("space.300"),
				paddingInline: token("space.300"),
				borderBottom: `1px solid ${token("color.border")}`,
			}}
		>
			<span
				style={{
					fontSize: "20px",
					fontWeight: 600,
					color: token("color.text"),
				}}
			>
				{title}
			</span>
			<span
				style={{
					fontSize: "14px",
					fontWeight: 500,
					color: token("color.text.subtlest"),
				}}
			>
				{count}
			</span>
		</div>
	);
}
