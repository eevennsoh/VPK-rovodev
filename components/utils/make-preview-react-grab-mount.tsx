"use client";

import { useEffect, type RefObject } from "react";

const REACT_GRAB_SCRIPT_ID = "vpk-make-preview-react-grab-script";
const REACT_GRAB_MCP_SCRIPT_ID = "vpk-make-preview-react-grab-mcp-script";
const REACT_GRAB_SCRIPT_SRC = "//unpkg.com/react-grab/dist/index.global.js";
const REACT_GRAB_MCP_SCRIPT_SRC = "//unpkg.com/@react-grab/mcp/dist/client.global.js";
type ReactGrabWindow = Window & {
	__REACT_GRAB__?: {
		activate?: () => void;
		deactivate?: () => void;
		setEnabled?: (enabled: boolean) => void;
	};
};

function ensureIframeScript({
	documentRef,
	id,
	src,
	crossOrigin,
}: Readonly<{
	documentRef: Document;
	id: string;
	src: string;
	crossOrigin?: string;
}>): Promise<void> {
	const existingScript = documentRef.getElementById(id) as HTMLScriptElement | null;
	if (existingScript) {
		return Promise.resolve();
	}

	return new Promise((resolve, reject) => {
		const script = documentRef.createElement("script");
		script.id = id;
		script.src = src;
		script.async = true;
		if (crossOrigin) {
			script.crossOrigin = crossOrigin;
		}

		script.onload = () => resolve();
		script.onerror = () => reject(new Error(`Failed to load script: ${src}`));

		documentRef.head.appendChild(script);
	});
}

export function MakePreviewReactGrabMount({
	iframeRef,
	enabled,
	active,
}: Readonly<{
	iframeRef?: RefObject<HTMLIFrameElement | null>;
	enabled: boolean;
	active: boolean;
	themeMode?: "light" | "dark";
}>) {
	useEffect(() => {
		if (process.env.NODE_ENV !== "development" || !enabled || !iframeRef?.current) {
			return;
		}

		const iframe = iframeRef.current;
		let cancelled = false;

		const mountIntoIframe = async () => {
			let frameDocument: Document | null = null;
			let frameWindow: ReactGrabWindow | null = null;
			try {
				frameDocument = iframe.contentDocument;
				frameWindow = iframe.contentWindow as ReactGrabWindow | null;
			} catch {
				return;
			}

			if (!frameDocument || !frameWindow) {
				return;
			}

			try {
				await ensureIframeScript({
					documentRef: frameDocument,
					id: REACT_GRAB_SCRIPT_ID,
					src: REACT_GRAB_SCRIPT_SRC,
					crossOrigin: "anonymous",
				});

				if (cancelled) {
					return;
				}

				await ensureIframeScript({
					documentRef: frameDocument,
					id: REACT_GRAB_MCP_SCRIPT_ID,
					src: REACT_GRAB_MCP_SCRIPT_SRC,
				});

				if (cancelled) {
					return;
				}

				frameWindow.__REACT_GRAB__?.setEnabled?.(enabled);
				if (active) {
					frameWindow.__REACT_GRAB__?.activate?.();
				} else {
					frameWindow.__REACT_GRAB__?.deactivate?.();
				}
			} catch {
				// Ignore script injection errors for local dev helper tooling.
			}
		};

		const handleLoad = () => {
			void mountIntoIframe();
		};

		iframe.addEventListener("load", handleLoad);
		void mountIntoIframe();

		return () => {
			cancelled = true;
			iframe.removeEventListener("load", handleLoad);
			try {
				const frameWindow = iframe.contentWindow as ReactGrabWindow | null;
				frameWindow?.__REACT_GRAB__?.deactivate?.();
				frameWindow?.__REACT_GRAB__?.setEnabled?.(false);
			} catch {
				// Ignore cross-origin access errors while cleaning up.
			}
		};
	}, [active, enabled, iframeRef]);

	return null;
}
