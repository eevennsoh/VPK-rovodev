import { NextRequest, NextResponse } from "next/server";
import { proxyToBackend } from "@/app/api/_utils/proxy";
import { readJsonBody } from "@/app/api/_utils/read-json-body";

export async function GET(request: NextRequest) {
	try {
		const threadId = request.nextUrl.searchParams.get("threadId");
		const query = threadId ? `?threadId=${encodeURIComponent(threadId)}` : "";
		return await proxyToBackend({
			method: "GET",
			path: `/api/future-chat/votes${query}`,
		});
	} catch (error) {
		console.error("Future Chat votes fetch proxy error:", error);
		return NextResponse.json(
			{
				error: "Internal server error",
				details: error instanceof Error ? error.message : String(error),
			},
			{ status: 500 },
		);
	}
}

export async function PATCH(request: NextRequest) {
	try {
		const { body, errorResponse } = await readJsonBody(request);
		if (errorResponse) {
			return errorResponse;
		}

		return await proxyToBackend({
			method: "PATCH",
			path: "/api/future-chat/votes",
			body,
		});
	} catch (error) {
		console.error("Future Chat vote update proxy error:", error);
		return NextResponse.json(
			{
				error: "Internal server error",
				details: error instanceof Error ? error.message : String(error),
			},
			{ status: 500 },
		);
	}
}
