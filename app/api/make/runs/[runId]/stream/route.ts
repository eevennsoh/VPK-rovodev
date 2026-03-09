import { type NextRequest } from "next/server";
import { proxyToBackend } from "@/app/api/make/_utils/proxy";

export const dynamic = "force-dynamic";

interface RouteParams {
	params: Promise<{ runId: string }>;
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
	const { runId } = await params;
	return proxyToBackend({
		method: "GET",
		path: `/api/make/runs/${encodeURIComponent(runId)}/stream`,
		expectEventStream: true,
	});
}
