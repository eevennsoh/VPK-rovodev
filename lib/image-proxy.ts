const FIGMA_MCP_ASSET_PATH_PREFIX = "/api/mcp/asset/";
const IMAGE_PROXY_ENDPOINT = "/api/image-proxy";

function isHttpUrl(value: string): boolean {
	return /^https?:\/\//i.test(value);
}

function stripWrappingQuotes(value: string): string {
	return value.replace(/^['"`<]+|['"`>]+$/g, "");
}

function stripTrailingPunctuation(value: string): string {
	// Remove common trailing punctuation from copied markdown/plain-text URLs.
	return value.replace(/[),.;:!?]+$/g, "");
}

function extractMarkdownImageUrl(value: string): string | null {
	const markdownImageMatch = value.match(/!\[[^\]]*]\((https?:\/\/[^)\s]+)\)/i);
	return markdownImageMatch?.[1] ?? null;
}

export function normalizeImageSource(value: unknown): string | null {
	if (typeof value !== "string") {
		return null;
	}

	const trimmedValue = value.trim();
	if (!trimmedValue) {
		return null;
	}

	const markdownImageUrl = extractMarkdownImageUrl(trimmedValue);
	const source = markdownImageUrl ?? trimmedValue;
	const normalizedSource = stripTrailingPunctuation(stripWrappingQuotes(source).trim());
	return normalizedSource.length > 0 ? normalizedSource : null;
}

export function isFigmaMcpAssetUrl(value: string): boolean {
	try {
		const parsedUrl = new URL(value);
		const hostname = parsedUrl.hostname.toLowerCase();
		const isFigmaHost = hostname === "figma.com" || hostname === "www.figma.com";
		return isFigmaHost && parsedUrl.pathname.startsWith(FIGMA_MCP_ASSET_PATH_PREFIX);
	} catch {
		return false;
	}
}

export function toImageProxyUrl(sourceUrl: string): string {
	return `${IMAGE_PROXY_ENDPOINT}?src=${encodeURIComponent(sourceUrl)}`;
}

export function resolveImageRenderSrc(value: unknown): string | null {
	const normalizedSource = normalizeImageSource(value);
	if (!normalizedSource) {
		return null;
	}

	if (isHttpUrl(normalizedSource) && isFigmaMcpAssetUrl(normalizedSource)) {
		return toImageProxyUrl(normalizedSource);
	}

	return normalizedSource;
}
