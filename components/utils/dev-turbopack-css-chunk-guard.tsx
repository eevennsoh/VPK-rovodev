"use client";

import { useEffect } from "react";

const APP_GLOBALS_CHUNK_PATTERN = /\/_next\/static\/chunks\/app_globals_[^/]+\.css(?:\?.*)?$/;
const STYLESHEET_MARKER = "data-vpk-dev-css-chunk-guard";

function ensureStylesheetLink(head: HTMLHeadElement, href: string) {
	const existingStylesheet = Array.from(
		head.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"][href]')
	).some((link) => link.getAttribute("href") === href);

	if (existingStylesheet) {
		return;
	}

	const link = document.createElement("link");
	link.rel = "stylesheet";
	link.href = href;
	link.disabled = true;
	link.setAttribute(STYLESHEET_MARKER, "true");
	head.appendChild(link);
}

function syncAppGlobalsStylesheetLink(head: HTMLHeadElement) {
	const preloadLinks = head.querySelectorAll<HTMLLinkElement>('link[rel="preload"][as="style"][href]');

	for (const preloadLink of Array.from(preloadLinks)) {
		const href = preloadLink.getAttribute("href");

		if (!href || !APP_GLOBALS_CHUNK_PATTERN.test(href)) {
			continue;
		}

		ensureStylesheetLink(head, href);
	}
}

export function DevTurbopackCssChunkGuard() {
	useEffect(() => {
		if (process.env.NODE_ENV !== "development") {
			return;
		}

		const head = document.head;
		if (!head) {
			return;
		}

		syncAppGlobalsStylesheetLink(head);

		const observer = new MutationObserver(() => {
			syncAppGlobalsStylesheetLink(head);
		});

		observer.observe(head, { childList: true });

		return () => {
			observer.disconnect();
		};
	}, []);

	return null;
}
