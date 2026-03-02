import { NextRequest, NextResponse } from "next/server";
import { proxyToBackend } from "@/app/api/make/_utils/proxy";

interface RouteParams {
	params: Promise<{ id: string }>;
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
	try {
		const { id } = await params;
		return await proxyToBackend({
			method: "GET",
			path: `/api/make/skills/${encodeURIComponent(id)}/raw`,
		});
	} catch (error) {
		console.error("Agents team skill raw proxy error:", error);
		return NextResponse.json(
			{
				error: "Internal server error",
				details: error instanceof Error ? error.message : String(error),
			},
			{ status: 500 }
		);
	}
}
