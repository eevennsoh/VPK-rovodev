import { NextRequest, NextResponse } from "next/server";
import { getBackendUrl } from "@/app/api/_utils/backend-url";
import { readJsonBody } from "@/app/api/_utils/read-json-body";

/**
 * API proxy route that forwards plan title enrichment requests to the backend Express server.
 *
 * This route is used only during local development. In production, the frontend
 * is served by Express and calls /api/plan-title on the same origin.
 */
export async function POST(request: NextRequest) {
	try {
		const { body, errorResponse } = await readJsonBody(request);
		if (errorResponse) {
			return errorResponse;
		}

		const backendUrl = getBackendUrl();
		const url = `${backendUrl}/api/plan-title`;

		const response = await fetch(url, {
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
					};

					if (typeof parsed.error === "string" && parsed.error.trim()) {
						errorMessage = parsed.error.trim();
					} else {
						errorMessage = errorText.trim();
					}
				} catch {
					errorMessage = errorText.trim();
				}
			}

			return NextResponse.json(
				{ error: errorMessage },
				{ status: response.status },
			);
		}

		const data = await response.json();
		return NextResponse.json(data);
	} catch (error) {
		console.error("Plan title proxy error:", error);
		return NextResponse.json(
			{
				error: "Internal server error",
				details: error instanceof Error ? error.message : String(error),
			},
			{ status: 500 },
		);
	}
}
