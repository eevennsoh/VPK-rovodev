import { type NextRequest } from "next/server";
import { proxyToBackend } from "@/app/api/_utils/proxy";
import { readJsonBody } from "@/app/api/_utils/read-json-body";

export async function GET(request: NextRequest) {
	const limit = request.nextUrl.searchParams.get("limit");
	const query = limit ? `?limit=${encodeURIComponent(limit)}` : "";
	return proxyToBackend({
		method: "GET",
		path: `/api/chat/threads${query}`,
	});
}

export async function POST(request: NextRequest) {
	const { body, errorResponse } = await readJsonBody(request);
	if (errorResponse) {
		return errorResponse;
	}
	return proxyToBackend({
		method: "POST",
		path: "/api/chat/threads",
		body,
	});
}
