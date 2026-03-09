import { NextRequest, NextResponse } from "next/server";
import {
	BackendConnectionError,
	fetchBackend,
	getBackendUrlCandidates,
} from "@/app/api/_utils/backend-url";
import { readJsonBody } from "@/app/api/_utils/read-json-body";

/**
 * Dev proxy for genui-chat requests to the backend Express server.
 *
 * Forwards the request body as-is (including optional strictSpec /
 * allowWebLookup flags) and streams the raw text response back.
 */
export async function POST(request: NextRequest) {
	try {
		const { body, errorResponse } = await readJsonBody(request);
		if (errorResponse) {
			return errorResponse;
		}

		const { response } = await fetchBackend("/api/genui-chat", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify(body),
		});

		if (!response.ok) {
			const errorText = await response.text();
			let errorMessage = "Backend request failed";

			if (errorText.trim()) {
				try {
					const parsed = JSON.parse(errorText) as {
						error?: unknown;
						message?: unknown;
					};

					if (typeof parsed.error === "string" && parsed.error.trim()) {
						errorMessage = parsed.error.trim();
					} else if (typeof parsed.message === "string" && parsed.message.trim()) {
						errorMessage = parsed.message.trim();
					} else {
						errorMessage = errorText.trim();
					}
				} catch {
					errorMessage = errorText.trim();
				}
			}

			return new NextResponse(errorMessage, {
				status: response.status,
				headers: { "Content-Type": "text/plain; charset=utf-8" },
			});
		}

		return new NextResponse(response.body, {
			status: response.status,
			headers: {
				"Content-Type": "text/plain; charset=utf-8",
				"Cache-Control": "no-cache",
				Connection: "keep-alive",
			},
		});
	} catch (error) {
		if (error instanceof BackendConnectionError) {
			return NextResponse.json(
				{
					error: "Cannot connect to backend server",
					details: error.cause instanceof Error ? error.cause.message : String(error.cause),
					backendUrls: error.backendUrls,
				},
				{ status: 503 },
			);
		}

		console.error("Genui chat proxy error:", error);
		return NextResponse.json(
			{
				error: "Internal server error",
				details: error instanceof Error ? error.message : String(error),
				backendUrls: getBackendUrlCandidates(),
			},
			{ status: 500 },
		);
	}
}
