import { NextRequest, NextResponse } from "next/server";
import { proxyToBackend } from "@/app/api/agents-team/_utils/proxy";

interface RouteParams {
	params: Promise<{ runId: string }>;
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
	try {
		const { runId } = await params;
		return await proxyToBackend({
			method: "GET",
			path: `/api/agents-team/runs/${encodeURIComponent(runId)}`,
		});
	} catch (error) {
		console.error("Agents team run status proxy error:", error);
		return NextResponse.json(
			{
				error: "Internal server error",
				details: error instanceof Error ? error.message : String(error),
			},
			{ status: 500 }
		);
	}
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
	try {
		const { runId } = await params;
		return await proxyToBackend({
			method: "DELETE",
			path: `/api/agents-team/runs/${encodeURIComponent(runId)}`,
		});
	} catch (error) {
		console.error("Agents team run delete proxy error:", error);
		return NextResponse.json(
			{
				error: "Internal server error",
				details: error instanceof Error ? error.message : String(error),
			},
			{ status: 500 }
		);
	}
}
