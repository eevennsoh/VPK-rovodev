import { NextRequest, NextResponse } from "next/server";
import { proxyToBackend } from "@/app/api/_utils/proxy";
import { readJsonBody } from "@/app/api/_utils/read-json-body";

export async function GET(request: NextRequest) {
	try {
		const threadId = request.nextUrl.searchParams.get("threadId");
		const documentId = request.nextUrl.searchParams.get("documentId");
		const params = new URLSearchParams();
		if (threadId) {
			params.set("threadId", threadId);
		}
		if (documentId) {
			params.set("documentId", documentId);
		}
		const query = params.toString();
		return await proxyToBackend({
			method: "GET",
			path: `/api/future-chat/documents${query ? `?${query}` : ""}`,
		});
	} catch (error) {
		console.error("Future Chat documents proxy error:", error);
		return NextResponse.json(
			{
				error: "Internal server error",
				details: error instanceof Error ? error.message : String(error),
			},
			{ status: 500 },
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
			path: "/api/future-chat/documents",
			body,
		});
	} catch (error) {
		console.error("Future Chat document save proxy error:", error);
		return NextResponse.json(
			{
				error: "Internal server error",
				details: error instanceof Error ? error.message : String(error),
			},
			{ status: 500 },
		);
	}
}

export async function DELETE(request: NextRequest) {
	try {
		const documentId = request.nextUrl.searchParams.get("documentId");
		const query = documentId ? `?documentId=${encodeURIComponent(documentId)}` : "";
		return await proxyToBackend({
			method: "DELETE",
			path: `/api/future-chat/documents${query}`,
		});
	} catch (error) {
		console.error("Future Chat document delete proxy error:", error);
		return NextResponse.json(
			{
				error: "Internal server error",
				details: error instanceof Error ? error.message : String(error),
			},
			{ status: 500 },
		);
	}
}
