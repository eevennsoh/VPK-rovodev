import { NextRequest, NextResponse } from "next/server";
import { getBackendUrl } from "@/app/api/_utils/backend-url";

/**
 * API proxy route that forwards chat cancel requests to the backend Express server.
 *
 * This route is used only during local development. In production, the frontend
 * is served by Express and calls /api/chat-cancel on the same origin.
 */
export async function POST(_request: NextRequest) {
	try {
		const backendUrl = getBackendUrl();
		const url = `${backendUrl}/api/chat-cancel`;

		const response = await fetch(url, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
		});

		const data = await response.json();
		return NextResponse.json(data, { status: response.status });
	} catch (error) {
		console.error("Chat cancel proxy error:", error);
		return NextResponse.json(
			{
				cancelled: false,
				error: error instanceof Error ? error.message : String(error),
			},
			{ status: 500 }
		);
	}
}
