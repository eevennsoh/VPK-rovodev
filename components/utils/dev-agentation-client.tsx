"use client";

import { useEffect } from "react";
import { Agentation } from "agentation";

const AGENTATION_POSITION_KEY = "feedback-toolbar-position";

export function DevAgentationClient() {
	useEffect(() => {
		if (typeof window === "undefined") {
			return;
		}

		try {
			if (window.self !== window.top) {
				return;
			}
		} catch {
			return;
		}

		try {
			// Keep toolbar pinned to default corner so it never drifts into content.
			window.localStorage.removeItem(AGENTATION_POSITION_KEY);
		} catch {
			// Ignore storage failures in restricted browser contexts.
		}
	}, []);

	if (typeof window === "undefined") {
		return null;
	}

	try {
		if (window.self !== window.top) {
			return null;
		}
	} catch {
		return null;
	}

	return <Agentation endpoint="http://localhost:4747" />;
}
