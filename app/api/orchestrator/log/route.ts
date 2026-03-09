import { NextRequest, NextResponse } from "next/server";
import { fetchBackend } from "@/app/api/_utils/backend-url";

/**
 * Dev proxy for the orchestrator log endpoint.
 * Forwards GET (read log) and DELETE (clear log) to the Express backend.
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
			await fetchBackend(`/api/orchestrator/log${queryString ? `?${queryString}` : ""}`, {
			method: "GET",
			headers: { "Content-Type": "application/json" },
			})
		).response;

		const data = await response.json();
		return NextResponse.json(data, { status: response.status });
	} catch (error) {
		console.error("Orchestrator log proxy error:", error);
		return NextResponse.json(
			{ error: "Failed to proxy orchestrator log request" },
			{ status: 502 }
		);
	}
}

export async function DELETE() {
	try {
		const response = (
			await fetchBackend("/api/orchestrator/log", {
			method: "DELETE",
			headers: { "Content-Type": "application/json" },
			})
		).response;

		const data = await response.json();
		return NextResponse.json(data, { status: response.status });
	} catch (error) {
		console.error("Orchestrator log clear proxy error:", error);
		return NextResponse.json(
			{ error: "Failed to proxy orchestrator log clear request" },
			{ status: 502 }
		);
	}
}
