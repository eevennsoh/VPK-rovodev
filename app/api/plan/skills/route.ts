import { NextRequest, NextResponse } from "next/server";
import { proxyToBackend } from "@/app/api/plan/_utils/proxy";
import { readJsonBody } from "@/app/api/_utils/read-json-body";

export async function GET() {
	try {
		return await proxyToBackend({
			method: "GET",
			path: "/api/plan/skills",
		});
	} catch (error) {
		console.error("Agents team skills list proxy error:", error);
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
		const contentType = request.headers.get("content-type") ?? "";
		if (contentType.includes("text/markdown")) {
			const rawBody = await request.text();
			return await proxyToBackend({
				method: "POST",
				path: "/api/plan/skills",
				rawBody: rawBody,
				contentType: "text/markdown",
			});
		}
		const { body, errorResponse } = await readJsonBody(request);
		if (errorResponse) {
			return errorResponse;
		}
		return await proxyToBackend({
			method: "POST",
			path: "/api/plan/skills",
			body,
		});
	} catch (error) {
		console.error("Agents team skill creation proxy error:", error);
		return NextResponse.json(
			{
				error: "Internal server error",
				details: error instanceof Error ? error.message : String(error),
			},
			{ status: 500 }
		);
	}
}
