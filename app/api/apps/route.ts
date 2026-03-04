import { NextResponse } from "next/server";
import { proxyToBackend } from "@/app/api/make/_utils/proxy";

export async function GET() {
	try {
		return await proxyToBackend({
			method: "GET",
			path: "/api/apps",
		});
	} catch (error) {
		console.error("Apps listing proxy error:", error);
		return NextResponse.json(
			{
				error: "Internal server error",
				details: error instanceof Error ? error.message : String(error),
			},
			{ status: 500 },
		);
	}
}
