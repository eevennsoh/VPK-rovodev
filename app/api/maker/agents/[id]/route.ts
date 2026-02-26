import { NextRequest, NextResponse } from "next/server";
import { proxyToBackend } from "@/app/api/maker/_utils/proxy";
import { readJsonBody } from "@/app/api/_utils/read-json-body";

interface RouteParams {
	params: Promise<{ id: string }>;
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
	try {
		const { id } = await params;
		const { body, errorResponse } = await readJsonBody(request);
		if (errorResponse) {
			return errorResponse;
		}
		return await proxyToBackend({
			method: "PUT",
			path: `/api/maker/agents/${encodeURIComponent(id)}`,
			body,
		});
	} catch (error) {
		console.error("Agents team agent update proxy error:", error);
		return NextResponse.json(
			{
				error: "Internal server error",
				details: error instanceof Error ? error.message : String(error),
			},
			{ status: 500 }
		);
	}
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
	try {
		const { id } = await params;
		return await proxyToBackend({
			method: "DELETE",
			path: `/api/maker/agents/${encodeURIComponent(id)}`,
		});
	} catch (error) {
		console.error("Agents team agent delete proxy error:", error);
		return NextResponse.json(
			{
				error: "Internal server error",
				details: error instanceof Error ? error.message : String(error),
			},
			{ status: 500 }
		);
	}
}
