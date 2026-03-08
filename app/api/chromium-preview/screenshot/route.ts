import { NextRequest } from "next/server";
import { proxyToBackend } from "@/app/api/_utils/proxy";

export async function GET(request: NextRequest) {
	const search = request.nextUrl.search;

	return proxyToBackend({
		method: "GET",
		path: `/api/chromium-preview/screenshot${search}`,
	});
}
