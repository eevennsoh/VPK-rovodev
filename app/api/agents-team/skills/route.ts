import { NextRequest, NextResponse } from "next/server";
import { proxyToBackend } from "@/app/api/agents-team/_utils/proxy";
import { readJsonBody } from "@/app/api/_utils/read-json-body";

export async function GET() {
	try {
		return await proxyToBackend({
			method: "GET",
			path: "/api/agents-team/skills",
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
		const { body, errorResponse } = await readJsonBody(request);
		if (errorResponse) {
			return errorResponse;
		}
		return await proxyToBackend({
			method: "POST",
			path: "/api/agents-team/skills",
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
