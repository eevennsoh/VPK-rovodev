import { useMemo } from "react";
import type { RovoUIMessage, ThinkingToolCallSummary } from "@/lib/rovo-ui-messages";
import {
	getThinkingToolCallSummaries,
	getMessageToolParts,
	getMessageText,
} from "@/lib/rovo-ui-messages";

export interface BrowserArtifacts {
	currentUrl: string | null;
	latestScreenshot: string | null;
	latestSnapshot: string | null;
	isToolRunning: boolean;
	hasArtifacts: boolean;
}

/* -------------------------------------------------------------------------- */
/*  Tool name matchers — handle MCP prefixes and plain names                   */
/* -------------------------------------------------------------------------- */

const BROWSER_TOOL_NAMES = [
	"browser_navigate",
	"browser_snapshot",
	"browser_take_screenshot",
	"browser_click",
	"browser_type",
	"browser_close",
	"browser_hover",
	"browser_press_key",
	"browser_select_option",
	"browser_fill_form",
	"browser_evaluate",
	"browser_wait_for",
	"browser_drag",
];

function isBrowserToolName(toolName: string): boolean {
	return BROWSER_TOOL_NAMES.some((name) => toolName.includes(name));
}

function isNavigateTool(toolName: string): boolean {
	return toolName.includes("browser_navigate");
}

function isScreenshotTool(toolName: string): boolean {
	return toolName.includes("browser_take_screenshot");
}

function isSnapshotTool(toolName: string): boolean {
	return toolName.includes("browser_snapshot");
}

/* -------------------------------------------------------------------------- */
/*  Value extractors                                                           */
/* -------------------------------------------------------------------------- */

const FULL_URL_PATTERN = /https?:\/\/[^\s"'<>),]+/;
const BARE_DOMAIN_PATTERN = /(?:www\.)?[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z]{2,})+(?:\/[^\s"'<>),]*)?/i;

function normalizeUrl(raw: string): string {
	const trimmed = raw.trim().replace(/[.,;:!?)]+$/u, "");
	if (/^https?:\/\//i.test(trimmed)) return trimmed;
	return `https://${trimmed}`;
}

function extractUrl(input: unknown): string | null {
	if (input && typeof input === "object" && "url" in input) {
		const url = (input as { url: unknown }).url;
		if (typeof url === "string" && url.trim()) {
			return normalizeUrl(url);
		}
	}
	return null;
}

function extractUrlFromString(text: string): string | null {
	const fullMatch = FULL_URL_PATTERN.exec(text);
	if (fullMatch) return normalizeUrl(fullMatch[0]);

	const bareMatch = BARE_DOMAIN_PATTERN.exec(text);
	if (bareMatch) return normalizeUrl(bareMatch[0]);

	return null;
}

function extractFilename(input: unknown): string | null {
	if (input && typeof input === "object" && "filename" in input) {
		const filename = (input as { filename: unknown }).filename;
		if (typeof filename === "string" && filename.trim()) {
			return filename.trim();
		}
	}
	return null;
}

function filenameToPublicUrl(filename: string): string {
	if (filename.startsWith("public/")) {
		return `/${filename.slice("public/".length)}`;
	}
	if (filename.startsWith("/")) {
		return filename;
	}
	return `/${filename}`;
}

function extractSnapshotText(summary: ThinkingToolCallSummary): string | null {
	const output = summary.outputPreview ?? summary.output;
	if (typeof output === "string" && output.trim()) {
		return output.trim();
	}
	return null;
}

/**
 * Attempt to extract a URL from a generic tool's input or output.
 * Used for tools like "bash" that might contain browser navigation URLs.
 */
function extractUrlFromGenericTool(summary: ThinkingToolCallSummary): string | null {
	// Check input (e.g. bash command containing a URL)
	if (typeof summary.input === "string") {
		const url = extractUrlFromString(summary.input);
		if (url) return url;
	}
	if (summary.input && typeof summary.input === "object") {
		const inputStr = JSON.stringify(summary.input);
		const url = extractUrlFromString(inputStr);
		if (url) return url;
	}
	return null;
}

/**
 * Check if a tool output looks like an accessibility snapshot (tree-like text).
 */
function looksLikeAccessibilityTree(text: string): boolean {
	// Accessibility snapshots typically have indented tree structure with roles
	// like "heading", "link", "button", "textbox", etc.
	const accessibilityMarkers = [
		/- (?:heading|link|button|textbox|navigation|banner|main|contentinfo)/i,
		/\[ref=/,
		/role=/i,
	];
	return accessibilityMarkers.some((pattern) => pattern.test(text));
}

/* -------------------------------------------------------------------------- */
/*  Main hook                                                                  */
/* -------------------------------------------------------------------------- */

export function useBrowserArtifacts(
	uiMessages: ReadonlyArray<RovoUIMessage>,
): BrowserArtifacts {
	return useMemo(() => {
		let currentUrl: string | null = null;
		let latestScreenshot: string | null = null;
		let latestSnapshot: string | null = null;
		let isToolRunning = false;
		let hasToolActivity = false;

		for (const message of uiMessages) {
			// 0. Extract URLs from user messages (e.g. "navigate to theverge.com")
			if (message.role === "user") {
				const text = getMessageText(message);
				if (text) {
					const url = extractUrlFromString(text);
					if (url) currentUrl = url;
				}
			}

			// 1. Check file parts for screenshots (highest priority source)
			for (const part of message.parts) {
				if (
					part.type === "file" &&
					"mediaType" in part &&
					typeof part.mediaType === "string" &&
					part.mediaType.startsWith("image/") &&
					"url" in part &&
					typeof part.url === "string"
				) {
					latestScreenshot = part.url;
				}
			}

			// 2. Check tool-invocation parts (AI SDK ToolUIParts)
			const toolParts = getMessageToolParts(message);
			for (const toolPart of toolParts) {
				const toolName = "toolName" in toolPart ? String(toolPart.toolName) : "";
				hasToolActivity = true;

				if (isBrowserToolName(toolName)) {
					if (isNavigateTool(toolName) && "args" in toolPart) {
						const url = extractUrl(toolPart.args);
						if (url) currentUrl = url;
					}

					if (
						isScreenshotTool(toolName) &&
						"result" in toolPart &&
						toolPart.result
					) {
						// Screenshot result might contain image data or filename
						const result = toolPart.result;
						if (typeof result === "string" && result.startsWith("data:image/")) {
							latestScreenshot = result;
						}
						if (typeof result === "object" && result !== null && "filename" in result) {
							const filename = (result as { filename: unknown }).filename;
							if (typeof filename === "string") {
								latestScreenshot = filenameToPublicUrl(filename);
							}
						}
					}

					if (
						isSnapshotTool(toolName) &&
						"result" in toolPart &&
						typeof toolPart.result === "string" &&
						toolPart.result.trim()
					) {
						latestSnapshot = String(toolPart.result).trim();
					}
				}
			}

			// 3. Check thinking tool call summaries
			const summaries = getThinkingToolCallSummaries(message);
			for (const summary of summaries) {
				hasToolActivity = true;

				if (summary.state === "running") {
					isToolRunning = true;
				}

				if (isBrowserToolName(summary.toolName)) {
					// Named browser tool — extract data directly
					if (isNavigateTool(summary.toolName)) {
						const url = extractUrl(summary.input);
						if (url) currentUrl = url;
					}

					if (isScreenshotTool(summary.toolName) && summary.state === "completed") {
						const filename = extractFilename(summary.input);
						if (filename) {
							latestScreenshot = filenameToPublicUrl(filename);
						}
					}

					if (isSnapshotTool(summary.toolName) && summary.state === "completed") {
						const text = extractSnapshotText(summary);
						if (text) latestSnapshot = text;
					}
				} else {
					// Generic tool (e.g. "bash") — try heuristic extraction
					const url = extractUrlFromGenericTool(summary);
					if (url) currentUrl = url;

					// Check if output looks like an accessibility snapshot
					if (summary.state === "completed") {
						const output = summary.outputPreview ?? summary.output;
						if (typeof output === "string" && looksLikeAccessibilityTree(output)) {
							latestSnapshot = output.trim();
						}
					}
				}
			}
		}

		// On the Agent Browser page, any tool activity means browser work is happening
		const hasArtifacts = hasToolActivity;

		return {
			currentUrl,
			latestScreenshot,
			latestSnapshot,
			isToolRunning,
			hasArtifacts,
		};
	}, [uiMessages]);
}
