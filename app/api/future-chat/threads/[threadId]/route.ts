import { NextRequest, NextResponse } from "next/server";
import { proxyToBackend } from "@/app/api/_utils/proxy";
import { withFutureChatBackendUnavailableFallback } from "@/app/api/future-chat/_utils/backend-unavailable";
import { readJsonBody } from "@/app/api/_utils/read-json-body";

interface RouteProps {
	params: Promise<{ threadId: string }>;
}

export async function GET(_: NextRequest, { params }: RouteProps) {
	try {
		const { threadId } = await params;
		const response = await proxyToBackend({
			method: "GET",
			path: `/api/future-chat/threads/${encodeURIComponent(threadId)}`,
		});
		return await withFutureChatBackendUnavailableFallback(response, {
			thread: null,
		});
	} catch (error) {
		console.error("Future Chat thread fetch proxy error:", error);
		return NextResponse.json(
			{
				error: "Internal server error",
				details: error instanceof Error ? error.message : String(error),
			},
			{ status: 500 },
		);
	}
}

export async function PUT(request: NextRequest, { params }: RouteProps) {
	try {
		const { threadId } = await params;
		const { body, errorResponse } = await readJsonBody(request);
		if (errorResponse) {
			return errorResponse;
		}

		return await proxyToBackend({
			method: "PUT",
			path: `/api/future-chat/threads/${encodeURIComponent(threadId)}`,
			body,
		});
	} catch (error) {
		console.error("Future Chat thread update proxy error:", error);
		return NextResponse.json(
			{
				error: "Internal server error",
				details: error instanceof Error ? error.message : String(error),
			},
			{ status: 500 },
		);
	}
}

export async function DELETE(_: NextRequest, { params }: RouteProps) {
	try {
		const { threadId } = await params;
		return await proxyToBackend({
			method: "DELETE",
			path: `/api/future-chat/threads/${encodeURIComponent(threadId)}`,
		});
	} catch (error) {
		console.error("Future Chat thread delete proxy error:", error);
		return NextResponse.json(
			{
				error: "Internal server error",
				details: error instanceof Error ? error.message : String(error),
			},
			{ status: 500 },
		);
	}
}
