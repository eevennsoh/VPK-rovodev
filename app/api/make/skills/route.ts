import { type NextRequest } from "next/server";
import { proxyToBackend } from "@/app/api/make/_utils/proxy";
import { readJsonBody } from "@/app/api/_utils/read-json-body";

export async function GET() {
	return proxyToBackend({
		method: "GET",
		path: "/api/make/skills",
	});
}

export async function POST(request: NextRequest) {
	const contentType = request.headers.get("content-type") ?? "";
	if (contentType.includes("text/markdown")) {
		const rawBody = await request.text();
		return proxyToBackend({
			method: "POST",
			path: "/api/make/skills",
			rawBody,
			contentType: "text/markdown",
		});
	}
	const { body, errorResponse } = await readJsonBody(request);
	if (errorResponse) {
		return errorResponse;
	}
	return proxyToBackend({
		method: "POST",
		path: "/api/make/skills",
		body,
	});
}
