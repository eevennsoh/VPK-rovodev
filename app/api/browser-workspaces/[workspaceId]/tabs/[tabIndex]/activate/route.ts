import { proxyToBackend } from "@/app/api/_utils/proxy";

interface WorkspaceTabActivateRouteContext {
	params: Promise<{
		tabIndex: string;
		workspaceId: string;
	}>;
}

export async function POST(
	_request: Request,
	context: Readonly<WorkspaceTabActivateRouteContext>,
) {
	const { tabIndex, workspaceId } = await context.params;

	return proxyToBackend({
		method: "POST",
		path: `/api/browser-workspaces/${encodeURIComponent(workspaceId)}/tabs/${encodeURIComponent(tabIndex)}/activate`,
		body: {},
	});
}
