import { NextRequest, NextResponse } from "next/server";
import {
	BackendConnectionError,
	fetchBackend,
	getBackendUrlCandidates,
} from "@/app/api/_utils/backend-url";
import { readJsonBody } from "@/app/api/_utils/read-json-body";

/**
 * API proxy route that forwards speech transcription requests to the backend Express server.
 *
 * This route is used only during local development. In production, the frontend
 * is served by Express and calls /api/speech-transcription on the same origin.
 */
export async function POST(request: NextRequest) {
	try {
		const { body, errorResponse } = await readJsonBody(request);
		if (errorResponse) {
			return errorResponse;
		}

		const { response } = await fetchBackend("/api/speech-transcription", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify(body),
			signal: request.signal,
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

			return NextResponse.json(
				{ error: errorMessage },
				{ status: response.status }
			);
		}

		const result = await response.json();
		return NextResponse.json(result);
	} catch (error) {
		if (error instanceof Error && error.name === "AbortError") {
			return new NextResponse(null, { status: 204 });
		}

		if (error instanceof BackendConnectionError) {
			return NextResponse.json(
				{
					error: "Cannot connect to backend server",
					details: error.cause instanceof Error ? error.cause.message : String(error.cause),
					backendUrls: error.backendUrls,
				},
				{ status: 503 }
			);
		}

		console.error("Speech transcription proxy error:", error);
		return NextResponse.json(
			{
				error: "Internal server error",
				details: error instanceof Error ? error.message : String(error),
				backendUrls: getBackendUrlCandidates(),
			},
			{ status: 500 }
		);
	}
}
