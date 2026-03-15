import { proxyToBackend } from "@/app/api/_utils/proxy";

interface WorkspaceTabRouteContext {
	params: Promise<{
		tabIndex: string;
		workspaceId: string;
	}>;
}

export async function DELETE(
	_request: Request,
	context: Readonly<WorkspaceTabRouteContext>,
) {
	const { tabIndex, workspaceId } = await context.params;

	return proxyToBackend({
		method: "DELETE",
		path: `/api/browser-workspaces/${encodeURIComponent(workspaceId)}/tabs/${encodeURIComponent(tabIndex)}`,
	});
}
