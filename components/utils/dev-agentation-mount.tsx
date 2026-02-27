"use client";

import dynamic from "next/dynamic";

const DevAgentationClient = dynamic(
	() => import("@/components/utils/dev-agentation-client").then((mod) => mod.DevAgentationClient),
	{ ssr: false }
);

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
	if (process.env.NODE_ENV !== "development") {
		return null;
	}

	if (!isTopLevelWindow()) {
		return null;
	}

	return <DevAgentationClient />;
}
