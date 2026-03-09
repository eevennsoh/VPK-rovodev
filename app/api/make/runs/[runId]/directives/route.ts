import { type NextRequest } from "next/server";
import { proxyToBackend } from "@/app/api/make/_utils/proxy";
import { readJsonBody } from "@/app/api/_utils/read-json-body";

interface RouteParams {
	params: Promise<{ runId: string }>;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
	const { runId } = await params;
	const { body, errorResponse } = await readJsonBody(request);
	if (errorResponse) {
		return errorResponse;
	}
	return proxyToBackend({
		method: "POST",
		path: `/api/make/runs/${encodeURIComponent(runId)}/directives`,
		body,
	});
}
