"use client";

import { useEffect } from "react";
import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { isDevToolsExcludedRoute } from "@/components/utils/dev-template-route";

const DevAgentationClient = dynamic(
	() => import("@/components/utils/dev-agentation-client").then((mod) => mod.DevAgentationClient),
	{ ssr: false }
);

const AGENTATION_STYLE_IDS = [
	"feedback-tool-styles-annotation-popup-css-styles",
	"feedback-tool-styles-page-toolbar-css-styles",
] as const;

function isTopLevelWindow() {
	if (typeof window === "undefined") {
		return true;
	}

	try {
		return window.self === window.top;
	} catch {
		return false;
	}
}

function clearAgentationArtifacts() {
	if (typeof window === "undefined") {
		return;
	}

	for (const styleId of AGENTATION_STYLE_IDS) {
		window.document.getElementById(styleId)?.remove();
	}

	window.document.querySelectorAll("[data-feedback-toolbar]").forEach((element) => {
		element.remove();
	});
}

export function DevAgentationMount() {
	const pathname = usePathname();
	const shouldDisable = isDevToolsExcludedRoute(pathname);

	useEffect(() => {
		if (process.env.NODE_ENV !== "development" || !shouldDisable) {
			return;
		}

		clearAgentationArtifacts();
	}, [shouldDisable]);

	if (process.env.NODE_ENV !== "development") {
		return null;
	}

	if (!isTopLevelWindow()) {
		return null;
	}

	if (shouldDisable) {
		return null;
	}

	return <DevAgentationClient />;
}
