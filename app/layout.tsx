import type { Metadata } from "next";
import "./globals.css";
import "katex/dist/katex.min.css";
import "streamdown/styles.css";
import "leaflet/dist/leaflet.css";
import { getSSRAutoScript, getThemeStyles } from "@atlaskit/tokens";
import { Providers } from "@/app/providers";
import { DevAgentationMount } from "@/components/utils/dev-agentation-mount";
import { DevTurbopackCssChunkGuard } from "@/components/utils/dev-turbopack-css-chunk-guard";

// Prevent @atlaskit/tokens from falling back to uninitialized FeatureGates client.
// Sets the resolver on the same global that @atlaskit/platform-feature-flags uses internally.
// Returns false for all flags — increased-contrast themes stay disabled.
(globalThis as Record<string, unknown>).__PLATFORM_FEATURE_FLAGS__ = {
	booleanResolver: () => false,
};

const THEME_STORAGE_KEY = "ui-theme";

const THEME_STATE = {
	colorMode: "auto" as const,
	light: "light" as const,
	dark: "dark" as const,
	spacing: "spacing" as const,
	typography: "typography" as const,
	shape: "shape" as const,
};

function getThemeDefaults() {
	return {
		themeData: `light:${THEME_STATE.light} dark:${THEME_STATE.dark} spacing:${THEME_STATE.spacing} typography:${THEME_STATE.typography} shape:${THEME_STATE.shape}`,
		colorMode: "light" as const,
		contrastMode: undefined as string | undefined,
	};
}

export const metadata: Metadata = {
	title: {
		default: "V—P—K: Venn Prototype Kit",
		template: "%s — VPK",
	},
	description: "A prototype kit to vibe code Atlassian products",
	openGraph: {
		title: "V—P—K: Venn Prototype Kit",
		description: "A prototype kit to vibe code Atlassian products",
		type: "website",
	},
	twitter: {
		card: "summary",
		title: "V—P—K: Venn Prototype Kit",
		description: "A prototype kit to vibe code Atlassian products",
	},
};

export default async function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	const { themeData, colorMode, contrastMode } = getThemeDefaults();

	let ssrAutoScript = "";
	try {
		ssrAutoScript = getSSRAutoScript("auto") ?? "";
	} catch {
		// Feature gate client may not be initialized
	}

	const preHydrationScript = `
(() => {
	const root = document.documentElement;
	let storedTheme = null;

	try {
		storedTheme = window.localStorage.getItem("${THEME_STORAGE_KEY}");
	} catch {}

	if (storedTheme === "light" || storedTheme === "dark") {
		root.setAttribute("data-color-mode", storedTheme);
	} else {
		${ssrAutoScript}
	}

	const resolvedColorMode = root.getAttribute("data-color-mode") === "dark" ? "dark" : "light";
	root.classList.remove("light", "dark");
	root.classList.add(resolvedColorMode);
	root.style.colorScheme = resolvedColorMode;

})();
`;

	let themeStyles: Awaited<ReturnType<typeof getThemeStyles>> = [];
	try {
		themeStyles = await getThemeStyles(THEME_STATE);
	} catch {
		// Fallback: theme styles loaded via globals.css
	}

	return (
		<html
			lang="en"
			className={colorMode}
			data-theme={themeData}
			data-color-mode={colorMode}
			data-contrast-mode={contrastMode}
			suppressHydrationWarning
		>
			<head>
				<script dangerouslySetInnerHTML={{ __html: preHydrationScript }} />
				{themeStyles.map((themeStyle) => (
					<style
						key={themeStyle.id}
						data-theme={themeStyle.attrs["data-theme"] ?? themeStyle.id}
						dangerouslySetInnerHTML={{ __html: themeStyle.css }}
					/>
				))}
				{/* Atlassian DS-CDN Font Integration */}
				<link rel="preconnect" href="https://ds-cdn.prod-east.frontend.public.atl-paas.net" />
				<link rel="preload" href="https://ds-cdn.prod-east.frontend.public.atl-paas.net/assets/fonts/atlassian-sans/v3/AtlassianSans-latin.woff2" as="font" type="font/woff2" crossOrigin="anonymous" />
				<link rel="preload stylesheet" href="https://ds-cdn.prod-east.frontend.public.atl-paas.net/assets/font-rules/v5/atlassian-fonts.css" as="style" crossOrigin="anonymous" />
			</head>
			<body suppressHydrationWarning className="antialiased">
				<Providers>{children}</Providers>
				<DevTurbopackCssChunkGuard />
				<DevAgentationMount />
			</body>
		</html>
	);
}
