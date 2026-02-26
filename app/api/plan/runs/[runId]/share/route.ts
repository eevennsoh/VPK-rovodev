import { NextRequest, NextResponse } from "next/server";
import { proxyToBackend } from "@/app/api/plan/_utils/proxy";
import { readJsonBody } from "@/app/api/_utils/read-json-body";

interface RouteParams {
	params: Promise<{ runId: string }>;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
	try {
		const { runId } = await params;
		const { body, errorResponse } = await readJsonBody(request);
		if (errorResponse) {
			return errorResponse;
		}

		return await proxyToBackend({
			method: "POST",
			path: `/api/plan/runs/${encodeURIComponent(runId)}/share`,
			body,
		});
	} catch (error) {
		console.error("Agents team share proxy error:", error);
		return NextResponse.json(
			{
				error: "Internal server error",
				details: error instanceof Error ? error.message : String(error),
			},
			{ status: 500 }
		);
	}
}
