"use client";

import { useEffect, useRef, type RefObject } from "react";
import {
	sendDesignConfigToIframe,
	VPK_DESIGN_CONFIG_MESSAGE_TYPE,
	type DesignConfig,
} from "@/lib/design-config-bridge";

const DESIGN_CONFIG_STYLE_ID = "vpk-design-config-style";
const DESIGN_CONFIG_LISTENER_ID = "vpk-design-config-listener";

/**
 * Build the inline script that listens for design config messages
 * and applies CSS overrides inside the iframe.
 *
 * Targets the actual CSS mechanisms used by VPK:
 * - Theme: `data-color-mode` attribute + class + colorScheme (ADS token system)
 * - Radius: Tailwind v4 `--radius-*` custom properties (override ADS `--ds-radius-*`)
 * - Shadow: ADS `--ds-shadow-*` tokens (Tailwind shadows reference these)
 * - Animation: `!important` override on transition/animation duration
 * - Density: CSS `zoom` for proportional scaling of all spacing
 */
function buildListenerScript(): string {
	return `
(function() {
	if (window.__vpkDesignConfigListener) return;
	window.__vpkDesignConfigListener = true;

	var RADIUS_DEFAULT = 6;
	var FONT_FAMILIES = {
		system: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Noto Sans", Ubuntu, "Droid Sans", "Helvetica Neue", sans-serif',
		mono: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace',
		serif: 'Charter, "Bitstream Charter", "Sitka Text", Cambria, serif'
	};

	function applyConfig(config) {
		var html = document.documentElement;

		// --- Theme ---
		// ADS tokens use data-color-mode for CSS selector scoping
		html.setAttribute("data-color-mode", config.theme);
		html.classList.remove("light", "dark");
		html.classList.add(config.theme);
		html.style.colorScheme = config.theme;

		// --- Override style block ---
		var styleId = "${DESIGN_CONFIG_STYLE_ID}";
		var existingStyle = document.getElementById(styleId);
		if (existingStyle) existingStyle.remove();

		var css = [];

		// --- Radius ---
		// Override both ADS --ds-radius-* tokens (source of truth) and
		// Tailwind v4 --radius-* vars (which reference them via var()).
		// ADS theme styles use high-specificity selectors like
		// html[data-theme~="shape:shape"], so !important is required.
		var scale = config.radius / RADIUS_DEFAULT;
		var rXs = Math.round(2 * scale);
		var rSm = Math.round(4 * scale);
		var rMd = Math.round(6 * scale);
		var rLg = Math.round(8 * scale);
		var rXl = Math.round(12 * scale);
		var rXxl = Math.round(16 * scale);
		css.push(":root {");
		css.push("  --radius: " + config.radius + "px !important;");
		css.push("  --ds-radius-xsmall: " + rXs + "px !important;");
		css.push("  --ds-radius-small: " + rSm + "px !important;");
		css.push("  --ds-radius-medium: " + rMd + "px !important;");
		css.push("  --ds-radius-large: " + rLg + "px !important;");
		css.push("  --ds-radius-xlarge: " + rXl + "px !important;");
		css.push("  --ds-radius-xxlarge: " + rXxl + "px !important;");
		css.push("  --radius-xs: " + rXs + "px !important;");
		css.push("  --radius-sm: " + rSm + "px !important;");
		css.push("  --radius-md: " + rMd + "px !important;");
		css.push("  --radius-lg: " + rLg + "px !important;");
		css.push("  --radius-xl: " + rXl + "px !important;");
		css.push("  --radius-2xl: " + rXxl + "px !important;");
		css.push("  --radius-3xl: " + rXxl + "px !important;");
		css.push("  --radius-4xl: " + rXxl + "px !important;");
		css.push("}");

		// --- Shadow ---
		if (config.shadow === "none") {
			css.push(":root { --ds-shadow-raised: none !important; --ds-shadow-overlay: none !important; --ds-shadow-overflow: none !important; }");
		} else if (config.shadow === "raised") {
			css.push(":root { --ds-shadow-raised: 0 4px 12px rgba(0,0,0,0.15) !important; --ds-shadow-overlay: 0 8px 24px rgba(0,0,0,0.2) !important; }");
		}
		// "subtle" = default ADS shadows, no override needed

		// --- Animation ---
		if (!config.animation) {
			css.push("*, *::before, *::after { animation-duration: 0s !important; transition-duration: 0s !important; }");
		}

		// --- Density ---
		var densityFactors = { compact: 0.85, "default": 1, spacious: 1.15 };
		var factor = densityFactors[config.density] || 1;
		if (factor !== 1) {
			css.push("body { zoom: " + factor + "; }");
			// Counter-zoom react-grab dev tooling so it stays anchored at its natural position
			var counterZoom = 1 / factor;
			css.push("[data-react-grab], [data-react-grab-toolbar], [data-react-grab-context-menu], [data-react-grab-overlay-canvas], [data-react-grab-selection-label], [data-react-grab-completion], [data-react-grab-error], [data-react-grab-history-dropdown], [data-react-grab-clear-history-prompt] { zoom: " + counterZoom + " !important; }");
		}

		// --- Font Scale ---
		if (config.fontScale !== 1) {
			css.push("html { font-size: " + (config.fontScale * 100) + "% !important; }");
		}

		// --- Font Family ---
		if (config.fontFamily !== "system") {
			var family = FONT_FAMILIES[config.fontFamily] || FONT_FAMILIES.system;
			css.push("body, body * { font-family: " + family + " !important; }");
		}

		// --- Letter Spacing ---
		if (config.letterSpacing !== 0) {
			css.push("body { letter-spacing: " + config.letterSpacing + "px !important; }");
		}

		// --- Borders ---
		if (!config.borders) {
			css.push("*, *::before, *::after { border-color: transparent !important; }");
		}

		// --- Grayscale ---
		if (config.grayscale) {
			css.push("html { filter: grayscale(1) !important; }");
		}

		if (css.length > 0) {
			var style = document.createElement("style");
			style.id = styleId;
			style.textContent = css.join("\\n");
			document.head.appendChild(style);
		}

		// --- Text overrides (DOM-level) ---
		if (config.heading) {
			var h1 = document.querySelector("h1");
			if (h1) h1.textContent = config.heading;
		}
		if (config.subheading) {
			var h2 = document.querySelector("h2");
			if (!h2) h2 = document.querySelector("[class*='subtitle'], [class*='description'], [class*='subhead']");
			if (h2) h2.textContent = config.subheading;
		}
	}

	window.addEventListener("message", function(event) {
		if (event.data && event.data.type === "${VPK_DESIGN_CONFIG_MESSAGE_TYPE}") {
			applyConfig(event.data.config);
		}
	});
})();
`.trim();
}

function injectListenerScript(iframeDocument: Document): void {
	if (iframeDocument.getElementById(DESIGN_CONFIG_LISTENER_ID)) {
		return;
	}

	const script = iframeDocument.createElement("script");
	script.id = DESIGN_CONFIG_LISTENER_ID;
	script.textContent = buildListenerScript();
	iframeDocument.head.appendChild(script);
}

/**
 * Render-less component that injects a postMessage listener into an iframe
 * and sends design config updates to it.
 */
export function DesignConfigInjector({
	iframeRef,
	config,
}: Readonly<{
	iframeRef: RefObject<HTMLIFrameElement | null>;
	config: DesignConfig;
}>) {
	const configRef = useRef(config);

	useEffect(() => {
		configRef.current = config;
	}, [config]);

	// Inject listener script on iframe load + send initial config
	useEffect(() => {
		const iframe = iframeRef.current;
		if (!iframe) return;

		const handleLoad = () => {
			try {
				const doc = iframe.contentDocument;
				if (doc) {
					injectListenerScript(doc);
				}
			} catch {
				// Cross-origin — can't inject, but postMessage still works
			}
			sendDesignConfigToIframe(iframe, configRef.current);
		};

		iframe.addEventListener("load", handleLoad);

		// Try to inject into already-loaded iframe
		try {
			if (iframe.contentDocument?.readyState === "complete") {
				handleLoad();
			}
		} catch {
			// Cross-origin
		}

		return () => {
			iframe.removeEventListener("load", handleLoad);
		};
	}, [iframeRef]);

	// Send config updates via postMessage
	useEffect(() => {
		const iframe = iframeRef.current;
		if (!iframe) return;
		sendDesignConfigToIframe(iframe, config);
	}, [iframeRef, config]);

	return null;
}
