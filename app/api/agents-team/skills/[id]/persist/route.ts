import { NextRequest, NextResponse } from "next/server";
import { proxyToBackend } from "@/app/api/agents-team/_utils/proxy";

interface RouteParams {
	params: Promise<{ id: string }>;
}

export async function POST(_request: NextRequest, { params }: RouteParams) {
	try {
		const { id } = await params;
		return await proxyToBackend({
			method: "POST",
			path: `/api/agents-team/skills/${encodeURIComponent(id)}/persist`,
		});
	} catch (error) {
		console.error("Agents team skill persist proxy error:", error);
		return NextResponse.json(
			{
				error: "Internal server error",
				details: error instanceof Error ? error.message : String(error),
			},
			{ status: 500 }
		);
	}
}
