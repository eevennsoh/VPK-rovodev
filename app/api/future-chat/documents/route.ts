import { type NextRequest } from "next/server";
import { proxyToBackend } from "@/app/api/_utils/proxy";
import { withFutureChatBackendUnavailableFallback } from "@/app/api/future-chat/_utils/backend-unavailable";
import { readJsonBody } from "@/app/api/_utils/read-json-body";

export async function GET(request: NextRequest) {
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
	const response = await proxyToBackend({
		method: "GET",
		path: `/api/future-chat/documents${query ? `?${query}` : ""}`,
	});
	return withFutureChatBackendUnavailableFallback(response, documentId ? {
		document: null,
	} : {
		documents: [],
	});
}

export async function POST(request: NextRequest) {
	const { body, errorResponse } = await readJsonBody(request);
	if (errorResponse) {
		return errorResponse;
	}

	return proxyToBackend({
		method: "POST",
		path: "/api/future-chat/documents",
		body,
	});
}

export async function DELETE(request: NextRequest) {
	const documentId = request.nextUrl.searchParams.get("documentId");
	const query = documentId ? `?documentId=${encodeURIComponent(documentId)}` : "";
	return proxyToBackend({
		method: "DELETE",
		path: `/api/future-chat/documents${query}`,
	});
}
