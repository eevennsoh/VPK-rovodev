import { type NextRequest } from "next/server";
import { proxyToBackend } from "@/app/api/make/_utils/proxy";
import { readJsonBody } from "@/app/api/_utils/read-json-body";

interface RouteParams {
	params: Promise<{ id: string }>;
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
	const { id } = await params;
	const { body, errorResponse } = await readJsonBody(request);
	if (errorResponse) {
		return errorResponse;
	}
	return proxyToBackend({
		method: "PUT",
		path: `/api/make/skills/${encodeURIComponent(id)}`,
		body,
	});
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
	const { id } = await params;
	return proxyToBackend({
		method: "DELETE",
		path: `/api/make/skills/${encodeURIComponent(id)}`,
	});
}
