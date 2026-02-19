import type { GenerativeContentType } from "@/components/templates/shared/lib/generative-widget";

const FALLBACK_LOGO_SRC = "/1p/rovo.svg";

const EXPLICIT_SOURCE_NAME_TO_LOGO: Record<string, string> = {
	"google-drive": "/3p/google-drive/20.svg",
	"google-calendar": "/3p/google-calendar/20.svg",
	slack: "/3p/slack/20.svg",
	figma: "/3p/figma/20.svg",
	jira: "/1p/rovo.svg",
	confluence: "/1p/rovo.svg",
	rovo: "/1p/rovo.svg",
	github: "/3p/github/20.svg",
	gitlab: "/3p/gitlab/20.svg",
};

function normalizeSourceName(name: string): string {
	return name
		.toLowerCase()
		.replace(/&/g, " and ")
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "");
}

function resolveSourceNameLogo(sourceName?: string): string | null {
	if (!sourceName) {
		return null;
	}

	const normalized = normalizeSourceName(sourceName);
	const direct = EXPLICIT_SOURCE_NAME_TO_LOGO[normalized];
	if (direct) {
		return direct;
	}

	const commonSuffixes = ["-app", "-product", "-cloud"];
	for (const suffix of commonSuffixes) {
		if (!normalized.endsWith(suffix)) {
			continue;
		}
		const trimmed = normalized.slice(0, -suffix.length);
		const match = EXPLICIT_SOURCE_NAME_TO_LOGO[trimmed];
		if (match) {
			return match;
		}
	}

	return null;
}

export function resolveGenerativeWidgetLogoSrc(options: {
	sourceLogoSrc?: string;
	sourceName?: string;
}): string {
	const directLogo =
		typeof options.sourceLogoSrc === "string"
			? options.sourceLogoSrc.trim()
			: "";
	if (directLogo.length > 0) {
		return directLogo;
	}

	const sourceLogo = resolveSourceNameLogo(options.sourceName);
	if (sourceLogo) {
		return sourceLogo;
	}

	return FALLBACK_LOGO_SRC;
}

export function formatContentTypeLabel(contentType: GenerativeContentType): string {
	if (contentType === "image") {
		return "Image";
	}

	if (contentType === "sound") {
		return "Sound";
	}

	if (contentType === "chart") {
		return "Chart";
	}

	if (contentType === "ui") {
		return "UI";
	}

	return "Content";
}
