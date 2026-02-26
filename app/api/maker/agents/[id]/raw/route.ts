import { NextRequest, NextResponse } from "next/server";
import { proxyToBackend } from "@/app/api/maker/_utils/proxy";

interface RouteParams {
	params: Promise<{ id: string }>;
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
	try {
		const { id } = await params;
		return await proxyToBackend({
			method: "GET",
			path: `/api/maker/agents/${encodeURIComponent(id)}/raw`,
		});
	} catch (error) {
		console.error("Agents team agent raw proxy error:", error);
		return NextResponse.json(
			{
				error: "Internal server error",
				details: error instanceof Error ? error.message : String(error),
			},
			{ status: 500 }
		);
	}
}
