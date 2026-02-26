import { NextRequest, NextResponse } from "next/server";
import { proxyToBackend } from "@/app/api/plan/_utils/proxy";
import { readJsonBody } from "@/app/api/_utils/read-json-body";

interface RouteParams {
	params: Promise<{ threadId: string }>;
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
	try {
		const { threadId } = await params;
		return await proxyToBackend({
			method: "GET",
			path: `/api/plan/threads/${encodeURIComponent(threadId)}`,
		});
	} catch (error) {
		console.error("Agents team thread get proxy error:", error);
		return NextResponse.json(
			{
				error: "Internal server error",
				details: error instanceof Error ? error.message : String(error),
			},
			{ status: 500 }
		);
	}
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
	try {
		const { threadId } = await params;
		const { body, errorResponse } = await readJsonBody(request);
		if (errorResponse) {
			return errorResponse;
		}
		return await proxyToBackend({
			method: "PUT",
			path: `/api/plan/threads/${encodeURIComponent(threadId)}`,
			body,
		});
	} catch (error) {
		console.error("Agents team thread update proxy error:", error);
		return NextResponse.json(
			{
				error: "Internal server error",
				details: error instanceof Error ? error.message : String(error),
			},
			{ status: 500 }
		);
	}
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
	try {
		const { threadId } = await params;
		return await proxyToBackend({
			method: "DELETE",
			path: `/api/plan/threads/${encodeURIComponent(threadId)}`,
		});
	} catch (error) {
		console.error("Agents team thread delete proxy error:", error);
		return NextResponse.json(
			{
				error: "Internal server error",
				details: error instanceof Error ? error.message : String(error),
			},
			{ status: 500 }
		);
	}
}
