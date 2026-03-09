import { type NextRequest } from "next/server";
import { proxyToBackend } from "@/app/api/make/_utils/proxy";

interface RouteParams {
	params: Promise<{ runId: string }>;
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
	const { runId } = await params;
	return proxyToBackend({
		method: "GET",
		path: `/api/make/runs/${encodeURIComponent(runId)}/publish`,
	});
}

export async function POST(request: NextRequest, { params }: RouteParams) {
	const { runId } = await params;
	const body = (await request.json()) as unknown;
	return proxyToBackend({
		method: "POST",
		path: `/api/make/runs/${encodeURIComponent(runId)}/publish`,
		body,
	});
}
