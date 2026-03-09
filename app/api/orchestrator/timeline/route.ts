import { NextRequest, NextResponse } from "next/server";
import { fetchBackend } from "@/app/api/_utils/backend-url";

/**
 * Dev proxy for the orchestrator timeline endpoint.
 * Returns a plain-text timeline of cross-panel activity.
 */

export async function GET(request: NextRequest) {
	try {
		const { searchParams } = new URL(request.url);
		const params = new URLSearchParams();

		const portIndex = searchParams.get("portIndex");
		const limit = searchParams.get("limit");
		if (portIndex !== null) params.set("portIndex", portIndex);
		if (limit !== null) params.set("limit", limit);

		const queryString = params.toString();
		const response = (
			await fetchBackend(
				`/api/orchestrator/timeline${queryString ? `?${queryString}` : ""}`,
				{
			method: "GET",
			headers: { "Content-Type": "application/json" },
				},
			)
		).response;

		const data = await response.json();
		return NextResponse.json(data, { status: response.status });
	} catch (error) {
		console.error("Orchestrator timeline proxy error:", error);
		return NextResponse.json(
			{ error: "Failed to proxy orchestrator timeline request" },
			{ status: 502 }
		);
	}
}
