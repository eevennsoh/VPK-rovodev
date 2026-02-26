import { NextRequest, NextResponse } from "next/server";
import { proxyToBackend } from "@/app/api/plan/_utils/proxy";

interface RouteParams {
	params: Promise<{ runId: string }>;
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
	try {
		const { runId } = await params;
		return await proxyToBackend({
			method: "GET",
			path: `/api/plan/runs/${encodeURIComponent(runId)}/visual-summary`,
		});
	} catch (error) {
		console.error("Agents team visual summary proxy error:", error);
		return NextResponse.json(
			{
				error: "Internal server error",
				details: error instanceof Error ? error.message : String(error),
			},
			{ status: 500 }
		);
	}
}
