import { NextRequest } from "next/server";
import { proxyToBackend } from "@/app/api/_utils/proxy";
import { readJsonBody } from "@/app/api/_utils/read-json-body";

interface BrowserWorkspacePreviewSessionRouteContext {
	params: Promise<{
		workspaceId: string;
	}>;
}

export async function POST(
	request: NextRequest,
	context: Readonly<BrowserWorkspacePreviewSessionRouteContext>,
) {
	const { workspaceId } = await context.params;
	const parsed = await readJsonBody(request);
	if (parsed.errorResponse) {
		return parsed.errorResponse;
	}

	return proxyToBackend({
		method: "POST",
		path: `/api/browser-workspaces/${encodeURIComponent(workspaceId)}/preview-session`,
		body: parsed.body ?? {},
	});
}
