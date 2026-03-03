"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { isDevToolsExcludedRoute } from "@/components/utils/dev-template-route";

const AGENTATION_STYLE_IDS = [
	"feedback-tool-styles-annotation-popup-css-styles",
	"feedback-tool-styles-page-toolbar-css-styles",
] as const;

function clearAgentationFromPreviewFrame() {
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

export function PreviewFrameGuard() {
	const pathname = usePathname();
	const shouldClear = isDevToolsExcludedRoute(pathname);

	useEffect(() => {
		if (!shouldClear) {
			return;
		}

		clearAgentationFromPreviewFrame();
	}, [shouldClear]);

	return null;
}
