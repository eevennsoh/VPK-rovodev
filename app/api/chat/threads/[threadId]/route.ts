import { type NextRequest } from "next/server";
import { proxyToBackend } from "@/app/api/_utils/proxy";
import { readJsonBody } from "@/app/api/_utils/read-json-body";

interface RouteParams {
	params: Promise<{ threadId: string }>;
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
	const { threadId } = await params;
	return proxyToBackend({
		method: "GET",
		path: `/api/chat/threads/${encodeURIComponent(threadId)}`,
	});
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
	const { threadId } = await params;
	const { body, errorResponse } = await readJsonBody(request);
	if (errorResponse) {
		return errorResponse;
	}
	return proxyToBackend({
		method: "PUT",
		path: `/api/chat/threads/${encodeURIComponent(threadId)}`,
		body,
	});
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
	const { threadId } = await params;
	return proxyToBackend({
		method: "DELETE",
		path: `/api/chat/threads/${encodeURIComponent(threadId)}`,
	});
}
