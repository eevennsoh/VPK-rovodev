import { type NextRequest } from "next/server";
import { proxyToBackend } from "@/app/api/make/_utils/proxy";

interface RouteParams {
	params: Promise<{ slug: string }>;
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
	const { slug } = await params;
	return proxyToBackend({
		method: "GET",
		path: `/api/apps/${encodeURIComponent(slug)}`,
	});
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
	const { slug } = await params;
	return proxyToBackend({
		method: "DELETE",
		path: `/api/apps/${encodeURIComponent(slug)}`,
	});
}
