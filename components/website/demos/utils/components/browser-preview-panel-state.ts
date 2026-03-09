export type BrowserPreviewRenderMode = "embedded" | "artifact" | "empty";

function hasEmbeddedPreviewUrl(currentUrl: string | null): boolean {
	return typeof currentUrl === "string" && /^https?:\/\//i.test(currentUrl.trim());
}

function hasArtifactScreenshot(latestScreenshot: string | null): boolean {
	return typeof latestScreenshot === "string" && latestScreenshot.trim().length > 0;
}

export function getBrowserPreviewRenderMode(
	currentUrl: string | null,
	latestScreenshot: string | null,
): BrowserPreviewRenderMode {
	if (hasEmbeddedPreviewUrl(currentUrl)) {
		return "embedded";
	}

	if (hasArtifactScreenshot(latestScreenshot)) {
		return "artifact";
	}

	return "empty";
}
