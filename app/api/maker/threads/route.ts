import { NextRequest, NextResponse } from "next/server";
import { proxyToBackend } from "@/app/api/maker/_utils/proxy";
import { readJsonBody } from "@/app/api/_utils/read-json-body";

export async function GET(request: NextRequest) {
	try {
		const limit = request.nextUrl.searchParams.get("limit");
		const query = limit ? `?limit=${encodeURIComponent(limit)}` : "";
		return await proxyToBackend({
			method: "GET",
			path: `/api/maker/threads${query}`,
		});
	} catch (error) {
		console.error("Agents team thread listing proxy error:", error);
		return NextResponse.json(
			{
				error: "Internal server error",
				details: error instanceof Error ? error.message : String(error),
			},
			{ status: 500 }
		);
	}
}

export async function POST(request: NextRequest) {
	try {
		const { body, errorResponse } = await readJsonBody(request);
		if (errorResponse) {
			return errorResponse;
		}
		return await proxyToBackend({
			method: "POST",
			path: "/api/maker/threads",
			body,
		});
	} catch (error) {
		console.error("Agents team thread creation proxy error:", error);
		return NextResponse.json(
			{
				error: "Internal server error",
				details: error instanceof Error ? error.message : String(error),
			},
			{ status: 500 }
		);
	}
}
