import { type NextRequest } from "next/server";
import { proxyToBackend } from "@/app/api/_utils/proxy";

export async function POST(request: NextRequest) {
	const query = request.nextUrl.search;
	return proxyToBackend({
		method: "POST",
		path: `/api/chat-cancel${query}`,
	});
}
