import { NextRequest, NextResponse } from "next/server";
import { proxyToBackend } from "@/app/api/make/_utils/proxy";

interface RouteParams {
	params: Promise<{ slug: string }>;
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
	try {
		const { slug } = await params;
		return await proxyToBackend({
			method: "GET",
			path: `/api/apps/${encodeURIComponent(slug)}`,
		});
	} catch (error) {
		console.error("App detail proxy error:", error);
		return NextResponse.json(
			{
				error: "Internal server error",
				details: error instanceof Error ? error.message : String(error),
			},
			{ status: 500 },
		);
	}
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
	try {
		const { slug } = await params;
		return await proxyToBackend({
			method: "DELETE",
			path: `/api/apps/${encodeURIComponent(slug)}`,
		});
	} catch (error) {
		console.error("App delete proxy error:", error);
		return NextResponse.json(
			{
				error: "Internal server error",
				details: error instanceof Error ? error.message : String(error),
			},
			{ status: 500 },
		);
	}
}
