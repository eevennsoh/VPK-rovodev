import { NextRequest } from "next/server";
import { proxyToBackend } from "@/app/api/_utils/proxy";
import { readJsonBody } from "@/app/api/_utils/read-json-body";

export async function GET() {
	return proxyToBackend({
		method: "GET",
		path: "/api/browser-workspaces",
	});
}

export async function POST(request: NextRequest) {
	const parsed = await readJsonBody(request);
	if (parsed.errorResponse) {
		return parsed.errorResponse;
	}

	return proxyToBackend({
		method: "POST",
		path: "/api/browser-workspaces",
		body: parsed.body ?? {},
	});
}
