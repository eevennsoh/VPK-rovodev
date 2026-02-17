import { NextResponse } from "next/server";
import { getBackendUrl } from "@/app/api/_utils/backend-url";

interface ProxyRequestOptions {
	method: "GET" | "POST" | "PUT" | "DELETE";
	path: string;
	body?: unknown;
	expectEventStream?: boolean;
}

function buildErrorMessage(rawText: string, requestPath?: string): string {
	const trimmedText = rawText.trim();
	if (!trimmedText) {
		return "Backend request failed";
	}

	try {
		const parsed = JSON.parse(trimmedText) as {
			error?: unknown;
			message?: unknown;
			details?: unknown;
		};
		if (typeof parsed.error === "string" && parsed.error.trim()) {
			return parsed.error.trim();
		}
		if (typeof parsed.message === "string" && parsed.message.trim()) {
			return parsed.message.trim();
		}
		if (typeof parsed.details === "string" && parsed.details.trim()) {
			return parsed.details.trim();
		}
	} catch {
		// Ignore JSON parse errors for plain-text responses.
	}

	if (
		(requestPath?.startsWith("/api/agents-team/runs") ?? false) &&
		/Cannot (GET|POST) \/api\/agents-team\/runs/i.test(trimmedText)
	) {
		return "Backend is running without agents-team run routes. Restart the backend dev server to load the latest code.";
	}

	return trimmedText;
}

export async function proxyToBackend(
	options: Readonly<ProxyRequestOptions>
): Promise<NextResponse> {
	const backendUrl = getBackendUrl();
	const url = `${backendUrl}${options.path}`;

	let response: Response;
	try {
		response = await fetch(url, {
			method: options.method,
			headers: {
				"Content-Type": "application/json",
			},
			body:
				(options.method === "POST" || options.method === "PUT") && options.body !== undefined
					? JSON.stringify(options.body)
					: undefined,
		});
	} catch (error) {
		return NextResponse.json(
			{
				error: "Cannot connect to backend server",
				details: error instanceof Error ? error.message : String(error),
				backendUrl,
				path: options.path,
			},
			{ status: 503 }
		);
	}

	if (!response.ok) {
		const errorText = await response.text();
		return NextResponse.json(
			{ error: buildErrorMessage(errorText, options.path) },
			{ status: response.status }
		);
	}

	const contentType = response.headers.get("content-type") || "";
	if (options.expectEventStream || contentType.includes("text/event-stream")) {
		return new NextResponse(response.body, {
			status: response.status,
			headers: {
				"Content-Type": "text/event-stream",
				"Cache-Control": "no-cache",
				Connection: "keep-alive",
			},
		});
	}

	if (contentType.includes("application/json")) {
		const data = (await response.json()) as unknown;
		return NextResponse.json(data, { status: response.status });
	}

	const headers = new Headers();
	if (contentType) {
		headers.set("Content-Type", contentType);
	}

	const contentDisposition = response.headers.get("content-disposition");
	if (contentDisposition) {
		headers.set("Content-Disposition", contentDisposition);
	}

	const contentLength = response.headers.get("content-length");
	if (contentLength) {
		headers.set("Content-Length", contentLength);
	}

	return new NextResponse(response.body, {
		status: response.status,
		headers,
	});
}
