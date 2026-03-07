import { NextRequest, NextResponse } from "next/server";
import { readJsonBody } from "@/app/api/_utils/read-json-body";
import { proxyToBackend } from "@/app/api/_utils/proxy";

export async function POST(request: NextRequest) {
	try {
		const { body, errorResponse } = await readJsonBody(request);
		if (errorResponse) {
			return errorResponse;
		}

		return await proxyToBackend({
			method: "POST",
			path: "/api/future-chat/chat",
			body,
			expectEventStream: true,
		});
	} catch (error) {
		console.error("Future Chat proxy error:", error);
		return NextResponse.json(
			{
				error: "Internal server error",
				details: error instanceof Error ? error.message : String(error),
			},
			{ status: 500 },
		);
	}
}
