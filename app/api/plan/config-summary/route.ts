import { NextResponse } from "next/server";
import { proxyToBackend } from "@/app/api/plan/_utils/proxy";

export async function GET() {
	try {
		return await proxyToBackend({
			method: "GET",
			path: "/api/plan/config-summary",
		});
	} catch (error) {
		console.error("Agents team config summary proxy error:", error);
		return NextResponse.json(
			{
				error: "Internal server error",
				details: error instanceof Error ? error.message : String(error),
			},
			{ status: 500 }
		);
	}
}
