import { type NextRequest } from "next/server";
import { proxyToBackend } from "@/app/api/_utils/proxy";
import { withFutureChatBackendUnavailableFallback } from "@/app/api/future-chat/_utils/backend-unavailable";
import { readJsonBody } from "@/app/api/_utils/read-json-body";

export async function GET(request: NextRequest) {
	const threadId = request.nextUrl.searchParams.get("threadId");
	const query = threadId ? `?threadId=${encodeURIComponent(threadId)}` : "";
	const response = await proxyToBackend({
		method: "GET",
		path: `/api/future-chat/votes${query}`,
	});
	return withFutureChatBackendUnavailableFallback(response, {
		votes: [],
	});
}

export async function PATCH(request: NextRequest) {
	const { body, errorResponse } = await readJsonBody(request);
	if (errorResponse) {
		return errorResponse;
	}

	return proxyToBackend({
		method: "PATCH",
		path: "/api/future-chat/votes",
		body,
	});
}
