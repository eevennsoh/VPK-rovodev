import { NextRequest, NextResponse } from "next/server";
import { proxyToBackend } from "@/app/api/make/_utils/proxy";

interface RouteParams {
	params: Promise<{ runId: string }>;
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
	try {
		const { runId } = await params;
		return await proxyToBackend({
			method: "GET",
			path: `/api/make/runs/${encodeURIComponent(runId)}/publish`,
		});
	} catch (error) {
		console.error("Forge publish status proxy error:", error);
		return NextResponse.json(
			{
				error: "Internal server error",
				details: error instanceof Error ? error.message : String(error),
			},
			{ status: 500 },
		);
	}
}

export async function POST(request: NextRequest, { params }: RouteParams) {
	try {
		const { runId } = await params;
		const body = (await request.json()) as unknown;
		return await proxyToBackend({
			method: "POST",
			path: `/api/make/runs/${encodeURIComponent(runId)}/publish`,
			body,
		});
	} catch (error) {
		console.error("Forge publish proxy error:", error);
		return NextResponse.json(
			{
				error: "Internal server error",
				details: error instanceof Error ? error.message : String(error),
			},
			{ status: 500 },
		);
	}
}
