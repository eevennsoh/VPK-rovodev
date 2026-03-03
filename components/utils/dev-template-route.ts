"use client";

const PREVIEW_TEMPLATES_PREFIX = "/preview/templates/";
const EXCLUDED_APP_ROOT_SEGMENTS = new Set([
	"confluence",
	"fullscreen-chat",
	"jira",
	"make",
	"plan",
	"search",
	"sidebar-chat",
]);

function normalizePathname(pathname: string): string {
	if (pathname.length > 1 && pathname.endsWith("/")) {
		return pathname.slice(0, -1);
	}

	return pathname;
}

function getFirstPathSegment(pathname: string): string | null {
	const [firstSegment] = pathname.split("/").filter(Boolean);
	return firstSegment ?? null;
}

export function isDevToolsExcludedRoute(pathname: string | null): boolean {
	if (!pathname || pathname === "") {
		return false;
	}

	const normalizedPathname = normalizePathname(pathname);

	if (
		normalizedPathname === "/preview/templates"
		|| normalizedPathname.startsWith(PREVIEW_TEMPLATES_PREFIX)
	) {
		return true;
	}

	const firstSegment = getFirstPathSegment(normalizedPathname);
	if (!firstSegment) {
		return false;
	}

	return EXCLUDED_APP_ROOT_SEGMENTS.has(firstSegment);
}
