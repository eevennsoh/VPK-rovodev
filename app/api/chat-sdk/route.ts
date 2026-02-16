import { NextRequest, NextResponse } from "next/server";
import { getBackendUrl } from "@/app/api/_utils/backend-url";
import { readJsonBody } from "@/app/api/_utils/read-json-body";

/**
 * API proxy route that forwards AI SDK chat requests to the backend Express server.
 *
 * This route is used only during local development. In production, the frontend
 * is served by Express and calls /api/chat-sdk on the same origin.
 */
export async function POST(request: NextRequest) {
	try {
		const { body, errorResponse } = await readJsonBody(request);
		if (errorResponse) {
			return errorResponse;
		}

		const backendUrl = getBackendUrl();
		const url = `${backendUrl}/api/chat-sdk`;

		const response = await fetch(url, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify(body),
		});

		if (!response.ok) {
			const retryAfter = response.headers.get("retry-after");
			const errorText = await response.text();
			let errorMessage = "Backend request failed";

			if (errorText.trim()) {
				try {
					const parsed = JSON.parse(errorText) as {
						error?: unknown;
						message?: unknown;
						details?: unknown;
					};

					if (typeof parsed.error === "string" && parsed.error.trim()) {
						errorMessage = parsed.error.trim();
					} else if (typeof parsed.message === "string" && parsed.message.trim()) {
						errorMessage = parsed.message.trim();
					} else if (typeof parsed.details === "string" && parsed.details.trim()) {
						errorMessage = parsed.details.trim();
					} else {
						errorMessage = errorText.trim();
					}
				} catch {
					errorMessage = errorText.trim();
				}
			}

			const headers = new Headers({
				"Content-Type": "text/plain; charset=utf-8",
			});
			if (retryAfter) {
				headers.set("Retry-After", retryAfter);
			}

			return new NextResponse(errorMessage, {
				status: response.status,
				headers,
			});
		}

		if (response.headers.get("content-type")?.includes("text/event-stream")) {
			return new NextResponse(response.body, {
				status: response.status,
				headers: {
					"Content-Type": "text/event-stream",
					"Cache-Control": "no-cache",
					Connection: "keep-alive",
				},
			});
		}

		const data = await response.json();
		return NextResponse.json(data);
	} catch (error) {
		console.error("Chat SDK proxy error:", error);
		return NextResponse.json(
			{
				error: "Internal server error",
				details: error instanceof Error ? error.message : String(error),
			},
			{ status: 500 }
		);
	}
}
