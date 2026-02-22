import { NextRequest, NextResponse } from "next/server";
import { getBackendUrl } from "@/app/api/_utils/backend-url";
import { readJsonBody } from "@/app/api/_utils/read-json-body";

/**
 * API proxy route that forwards Question Card skip notifications to the
 * backend Express server.
 *
 * This route is used only during local development. In production, the
 * frontend is served by Express and calls /api/chat-sdk/skip-question on
 * the same origin.
 */
export async function POST(request: NextRequest) {
	try {
		const { body, errorResponse } = await readJsonBody(request);
		if (errorResponse) {
			return errorResponse;
		}

		const backendUrl = getBackendUrl();
		const url = `${backendUrl}/api/chat-sdk/skip-question`;

		const response = await fetch(url, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify(body),
		});

		if (!response.ok) {
			const errorText = await response.text();
			return new NextResponse(errorText || "Backend request failed", {
				status: response.status,
				headers: { "Content-Type": "text/plain; charset=utf-8" },
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
		console.error("Skip question proxy error:", error);
		return NextResponse.json(
			{
				error: "Internal server error",
				details: error instanceof Error ? error.message : String(error),
			},
			{ status: 500 }
		);
	}
}
