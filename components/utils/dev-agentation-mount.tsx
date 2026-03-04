"use client";

import { useEffect } from "react";

const AGENTATION_STYLE_IDS = [
	"feedback-tool-styles-annotation-popup-css-styles",
	"feedback-tool-styles-page-toolbar-css-styles",
] as const;

function clearAgentationArtifacts() {
	if (typeof window === "undefined") {
		return;
	}

	try {
		window.localStorage.removeItem("feedback-toolbar-position");
	} catch {
		// Ignore storage failures in restricted browser contexts.
	}

	for (const styleId of AGENTATION_STYLE_IDS) {
		window.document.getElementById(styleId)?.remove();
	}

	window.document.querySelectorAll("[data-feedback-toolbar],[id*='feedback-toolbar'],script[src*='agentation']").forEach((element) => {
		element.remove();
	});
}

export function DevAgentationMount() {
	useEffect(() => {
		if (process.env.NODE_ENV !== "development") {
			return;
		}

		clearAgentationArtifacts();

		const rafId = window.requestAnimationFrame(() => {
			clearAgentationArtifacts();
		});
		const timeoutId = window.setTimeout(() => {
			clearAgentationArtifacts();
		}, 120);

		const observer = new MutationObserver(() => {
			clearAgentationArtifacts();
		});
		observer.observe(window.document.documentElement, {
			childList: true,
			subtree: true,
		});

		return () => {
			window.cancelAnimationFrame(rafId);
			window.clearTimeout(timeoutId);
			observer.disconnect();
		};
	}, []);

	return null;
}
