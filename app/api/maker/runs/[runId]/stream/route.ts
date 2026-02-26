import { NextRequest, NextResponse } from "next/server";
import { proxyToBackend } from "@/app/api/maker/_utils/proxy";

export const dynamic = "force-dynamic";

interface RouteParams {
	params: Promise<{ runId: string }>;
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
	try {
		const { runId } = await params;
		return await proxyToBackend({
			method: "GET",
			path: `/api/maker/runs/${encodeURIComponent(runId)}/stream`,
			expectEventStream: true,
		});
	} catch (error) {
		console.error("Agents team run stream proxy error:", error);
		return NextResponse.json(
			{
				error: "Internal server error",
				details: error instanceof Error ? error.message : String(error),
			},
			{ status: 500 }
		);
	}
}
