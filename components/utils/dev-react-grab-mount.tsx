"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { isDevToolsExcludedRoute } from "@/components/utils/dev-template-route";

const REACT_GRAB_SCRIPT_ID = "vpk-dev-react-grab-script";
const REACT_GRAB_MCP_SCRIPT_ID = "vpk-dev-react-grab-mcp-script";
const REACT_GRAB_SCRIPT_SRC = "//unpkg.com/react-grab/dist/index.global.js";
const REACT_GRAB_MCP_SCRIPT_SRC = "//unpkg.com/@react-grab/mcp/dist/client.global.js";

function ensureScript({
	id,
	src,
	crossOrigin,
}: Readonly<{
	id: string;
	src: string;
	crossOrigin?: string;
}>): Promise<void> {
	const existingScript = window.document.getElementById(id) as HTMLScriptElement | null;
	if (existingScript) {
		return Promise.resolve();
	}

	return new Promise((resolve, reject) => {
		const script = window.document.createElement("script");
		script.id = id;
		script.src = src;
		script.async = true;
		if (crossOrigin) {
			script.crossOrigin = crossOrigin;
		}

		script.onload = () => resolve();
		script.onerror = () => reject(new Error(`Failed to load script: ${src}`));

		window.document.head.appendChild(script);
	});
}

function clearReactGrabArtifacts() {
	if (typeof window === "undefined") {
		return;
	}

	window.document.querySelectorAll("[data-react-grab],[data-react-grab-toolbar],[data-react-grab-context-menu],[data-react-grab-history-dropdown],[data-react-grab-clear-history-prompt],[data-react-grab-overlay-canvas],[data-react-grab-selection-label],[data-react-grab-completion],[data-react-grab-error]").forEach((element) => {
		element.remove();
	});

	window.document.querySelectorAll("[data-react-grab-frozen-styles],[data-react-grab-global-freeze],[data-react-grab-frozen-pseudo],[data-react-grab-cursor]").forEach((element) => {
		element.remove();
	});

	window.document.getElementById("react-grab-fonts")?.remove();
}

export function DevReactGrabMount() {
	const pathname = usePathname();
	const shouldDisable = isDevToolsExcludedRoute(pathname);

	useEffect(() => {
		if (process.env.NODE_ENV !== "development") {
			return;
		}

		if (shouldDisable) {
			const globalApi = (window as typeof window & {
				__REACT_GRAB__?: { deactivate?: () => void };
			}).__REACT_GRAB__;

			globalApi?.deactivate?.();
			clearReactGrabArtifacts();

			const rafId = window.requestAnimationFrame(() => {
				clearReactGrabArtifacts();
			});
			const timeoutId = window.setTimeout(() => {
				clearReactGrabArtifacts();
			}, 120);

			return () => {
				window.cancelAnimationFrame(rafId);
				window.clearTimeout(timeoutId);
			};
		}

		let cancelled = false;

		const loadScripts = async () => {
			try {
				await ensureScript({
					id: REACT_GRAB_SCRIPT_ID,
					src: REACT_GRAB_SCRIPT_SRC,
					crossOrigin: "anonymous",
				});

				if (cancelled) {
					return;
				}

				await ensureScript({
					id: REACT_GRAB_MCP_SCRIPT_ID,
					src: REACT_GRAB_MCP_SCRIPT_SRC,
				});
			} catch {
				// Ignore script loading errors in local dev helper tooling.
			}
		};

		void loadScripts();

		return () => {
			cancelled = true;
		};
	}, [shouldDisable]);

	return null;
}
