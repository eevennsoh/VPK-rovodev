import { NextRequest, NextResponse } from "next/server";
import {
	BackendConnectionError,
	fetchBackend,
	getBackendUrlCandidates,
} from "@/app/api/_utils/backend-url";

/**
 * API proxy route that forwards chat cancel requests to the backend Express server.
 *
 * This route is used only during local development. In production, the frontend
 * is served by Express and calls /api/chat-cancel on the same origin.
 */
export async function POST(request: NextRequest) {
	try {
		const query = request.nextUrl.search;
		const { response } = await fetchBackend(`/api/chat-cancel${query}`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
		});

		const data = await response.json();
		return NextResponse.json(data, { status: response.status });
	} catch (error) {
		if (error instanceof BackendConnectionError) {
			return NextResponse.json(
				{
					cancelled: false,
					error: "Cannot connect to backend server",
					details: error.cause instanceof Error ? error.cause.message : String(error.cause),
					backendUrls: error.backendUrls,
				},
				{ status: 503 }
			);
		}

		console.error("Chat cancel proxy error:", error);
		return NextResponse.json(
			{
				cancelled: false,
				error: error instanceof Error ? error.message : String(error),
				backendUrls: getBackendUrlCandidates(),
			},
			{ status: 500 }
		);
	}
}
