import { NextRequest, NextResponse } from "next/server";
import { proxyToBackend } from "@/app/api/agents-team/_utils/proxy";
import { readJsonBody } from "@/app/api/_utils/read-json-body";

export async function POST(request: NextRequest) {
	try {
		const { body, errorResponse } = await readJsonBody(request);
		if (errorResponse) {
			return errorResponse;
		}
		return await proxyToBackend({
			method: "POST",
			path: "/api/agents-team/runs",
			body,
		});
	} catch (error) {
		console.error("Agents team run creation proxy error:", error);
		return NextResponse.json(
			{
				error: "Internal server error",
				details: error instanceof Error ? error.message : String(error),
			},
			{ status: 500 }
		);
	}
}
