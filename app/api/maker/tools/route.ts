import { NextResponse } from "next/server";
import { proxyToBackend } from "@/app/api/maker/_utils/proxy";

export async function GET() {
	try {
		return await proxyToBackend({
			method: "GET",
			path: "/api/maker/tools",
		});
	} catch (error) {
		console.error("Agents team tools list proxy error:", error);
		return NextResponse.json(
			{
				error: "Internal server error",
				details: error instanceof Error ? error.message : String(error),
			},
			{ status: 500 }
		);
	}
}
