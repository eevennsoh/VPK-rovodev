import { type NextRequest } from "next/server";
import { proxyToBackend } from "@/app/api/_utils/proxy";
import { withFutureChatBackendUnavailableFallback } from "@/app/api/future-chat/_utils/backend-unavailable";
import { readJsonBody } from "@/app/api/_utils/read-json-body";

interface RouteProps {
	params: Promise<{ threadId: string }>;
}

export async function GET(_: NextRequest, { params }: RouteProps) {
	const { threadId } = await params;
	const response = await proxyToBackend({
		method: "GET",
		path: `/api/future-chat/threads/${encodeURIComponent(threadId)}`,
	});
	return withFutureChatBackendUnavailableFallback(response, {
		thread: null,
	});
}

export async function PUT(request: NextRequest, { params }: RouteProps) {
	const { threadId } = await params;
	const { body, errorResponse } = await readJsonBody(request);
	if (errorResponse) {
		return errorResponse;
	}

	return proxyToBackend({
		method: "PUT",
		path: `/api/future-chat/threads/${encodeURIComponent(threadId)}`,
		body,
	});
}

export async function DELETE(_: NextRequest, { params }: RouteProps) {
	const { threadId } = await params;
	return proxyToBackend({
		method: "DELETE",
		path: `/api/future-chat/threads/${encodeURIComponent(threadId)}`,
	});
}
