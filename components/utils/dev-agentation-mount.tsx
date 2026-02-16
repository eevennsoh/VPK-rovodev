"use client";

import { usePathname } from "next/navigation";
import dynamic from "next/dynamic";

const DevAgentationClient = dynamic(
	() => import("@/components/utils/dev-agentation-client").then((mod) => mod.DevAgentationClient),
	{ ssr: false }
);

function isPreviewRoute(pathname: string) {
	return pathname === "/preview" || pathname.startsWith("/preview/");
}

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

export function DevAgentationMount() {
	const pathname = usePathname();

	if (process.env.NODE_ENV !== "development") {
		return null;
	}

	if (!isTopLevelWindow()) {
		return null;
	}

	if (isPreviewRoute(pathname)) {
		return null;
	}

	return <DevAgentationClient />;
}
