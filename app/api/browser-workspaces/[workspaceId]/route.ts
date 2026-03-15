import { proxyToBackend } from "@/app/api/_utils/proxy";

interface WorkspaceRouteContext {
	params: Promise<{
		workspaceId: string;
	}>;
}

export async function GET(
	_request: Request,
	context: Readonly<WorkspaceRouteContext>,
) {
	const { workspaceId } = await context.params;

	return proxyToBackend({
		method: "GET",
		path: `/api/browser-workspaces/${encodeURIComponent(workspaceId)}`,
	});
}

export async function DELETE(
	_request: Request,
	context: Readonly<WorkspaceRouteContext>,
) {
	const { workspaceId } = await context.params;

	return proxyToBackend({
		method: "DELETE",
		path: `/api/browser-workspaces/${encodeURIComponent(workspaceId)}`,
	});
}
