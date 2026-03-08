import { NextResponse, type NextRequest } from "next/server";
import { getBackendUrl } from "@/app/api/_utils/backend-url";

export async function GET(request: NextRequest) {
	const url = request.nextUrl.searchParams.get("url");
	if (!url) {
		return NextResponse.json(
			{ error: "Missing required query parameter: url" },
			{ status: 400 },
		);
	}

	const backendUrl = getBackendUrl();
	const target = `${backendUrl}/api/web-proxy?url=${encodeURIComponent(url)}`;

	let response: Response;
	try {
		response = await fetch(target, { method: "GET" });
	} catch {
		return NextResponse.json(
			{ error: "Cannot connect to backend server" },
			{ status: 503 },
		);
	}

	if (!response.ok) {
		const text = await response.text();
		return new NextResponse(text, {
			status: response.status,
			headers: { "Content-Type": response.headers.get("content-type") ?? "application/json" },
		});
	}

	const headers = new Headers();
	const contentType = response.headers.get("content-type");
	if (contentType) {
		headers.set("Content-Type", contentType);
	}
	const cacheControl = response.headers.get("cache-control");
	if (cacheControl) {
		headers.set("Cache-Control", cacheControl);
	}

	return new NextResponse(response.body, {
		status: response.status,
		headers,
	});
}
