import { NextResponse } from "next/server";
import { proxyToBackend } from "@/app/api/make/_utils/proxy";

export async function GET() {
	try {
		return await proxyToBackend({
			method: "GET",
			path: "/api/make/forge/dev-spaces",
		});
	} catch (error) {
		console.error("Forge dev spaces proxy error:", error);
		return NextResponse.json(
			{
				error: "Internal server error",
				details: error instanceof Error ? error.message : String(error),
			},
			{ status: 500 },
		);
	}
}
