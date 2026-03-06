"use client";

const PREVIEW_PROJECTS_PREFIX = "/preview/projects/";
const EXCLUDED_APP_ROOT_SEGMENTS = new Set([
	"apps",
	"confluence",
	"fullscreen-chat",
	"jira",
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

export function isPreviewProjectsRoute(pathname: string | null): boolean {
	if (!pathname || pathname === "") {
		return false;
	}

	const normalizedPathname = normalizePathname(pathname);
	return (
		normalizedPathname === "/preview/projects"
		|| normalizedPathname.startsWith(PREVIEW_PROJECTS_PREFIX)
	);
}

export function isDevToolsExcludedRoute(pathname: string | null): boolean {
	if (!pathname || pathname === "") {
		return false;
	}

	const normalizedPathname = normalizePathname(pathname);

	if (isPreviewProjectsRoute(normalizedPathname)) {
		return true;
	}

	const firstSegment = getFirstPathSegment(normalizedPathname);
	if (!firstSegment) {
		return false;
	}

	return EXCLUDED_APP_ROOT_SEGMENTS.has(firstSegment);
}
