import { NextRequest } from "next/server";
import { proxyToBackend } from "@/app/api/_utils/proxy";
import { readJsonBody } from "@/app/api/_utils/read-json-body";

interface WorkspaceTabsRouteContext {
	params: Promise<{
		workspaceId: string;
	}>;
}

export async function GET(
	_request: Request,
	context: Readonly<WorkspaceTabsRouteContext>,
) {
	const { workspaceId } = await context.params;

	return proxyToBackend({
		method: "GET",
		path: `/api/browser-workspaces/${encodeURIComponent(workspaceId)}/tabs`,
	});
}

export async function POST(
	request: NextRequest,
	context: Readonly<WorkspaceTabsRouteContext>,
) {
	const { workspaceId } = await context.params;
	const parsed = await readJsonBody(request);
	if (parsed.errorResponse) {
		return parsed.errorResponse;
	}

	return proxyToBackend({
		method: "POST",
		path: `/api/browser-workspaces/${encodeURIComponent(workspaceId)}/tabs`,
		body: parsed.body ?? {},
	});
}
