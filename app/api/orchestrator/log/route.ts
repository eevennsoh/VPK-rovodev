import { NextRequest, NextResponse } from "next/server";
import { getBackendUrl } from "@/app/api/_utils/backend-url";

/**
 * Dev proxy for the orchestrator log endpoint.
 * Forwards GET (read log) and DELETE (clear log) to the Express backend.
 */

export async function GET(request: NextRequest) {
	try {
		const backendUrl = getBackendUrl();
		const { searchParams } = new URL(request.url);
		const params = new URLSearchParams();

		const portIndex = searchParams.get("portIndex");
		const limit = searchParams.get("limit");
		if (portIndex !== null) params.set("portIndex", portIndex);
		if (limit !== null) params.set("limit", limit);

		const queryString = params.toString();
		const url = `${backendUrl}/api/orchestrator/log${queryString ? `?${queryString}` : ""}`;

		const response = await fetch(url, {
			method: "GET",
			headers: { "Content-Type": "application/json" },
		});

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
		const backendUrl = getBackendUrl();
		const response = await fetch(`${backendUrl}/api/orchestrator/log`, {
			method: "DELETE",
			headers: { "Content-Type": "application/json" },
		});

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
