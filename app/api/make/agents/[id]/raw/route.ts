import { type NextRequest } from "next/server";
import { proxyToBackend } from "@/app/api/make/_utils/proxy";

interface RouteParams {
	params: Promise<{ id: string }>;
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
	const { id } = await params;
	return proxyToBackend({
		method: "GET",
		path: `/api/make/agents/${encodeURIComponent(id)}/raw`,
	});
}
