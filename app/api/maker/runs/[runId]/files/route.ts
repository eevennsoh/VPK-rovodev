import { NextRequest, NextResponse } from "next/server";
import { proxyToBackend } from "@/app/api/maker/_utils/proxy";

interface RouteParams {
	params: Promise<{ runId: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
	try {
		const { runId } = await params;
		const queryString = request.nextUrl.search;
		return await proxyToBackend({
			method: "GET",
			path: `/api/maker/runs/${encodeURIComponent(runId)}/files${queryString}`,
		});
	} catch (error) {
		console.error("Agents team files proxy error:", error);
		return NextResponse.json(
			{
				error: "Internal server error",
				details: error instanceof Error ? error.message : String(error),
			},
			{ status: 500 }
		);
	}
}
