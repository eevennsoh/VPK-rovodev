import { NextRequest, NextResponse } from "next/server";
import { proxyToBackend } from "@/app/api/_utils/proxy";

interface RouteProps {
	params: Promise<{ fileId: string }>;
}

export async function GET(_: NextRequest, { params }: RouteProps) {
	try {
		const { fileId } = await params;
		return await proxyToBackend({
			method: "GET",
			path: `/api/future-chat/files/${encodeURIComponent(fileId)}`,
		});
	} catch (error) {
		console.error("Future Chat file fetch proxy error:", error);
		return NextResponse.json(
			{
				error: "Internal server error",
				details: error instanceof Error ? error.message : String(error),
			},
			{ status: 500 },
		);
	}
}
