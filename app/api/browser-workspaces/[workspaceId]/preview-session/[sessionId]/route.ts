import { proxyToBackend } from "@/app/api/_utils/proxy";

interface BrowserWorkspacePreviewSessionByIdRouteContext {
	params: Promise<{
		sessionId: string;
		workspaceId: string;
	}>;
}

export async function DELETE(
	_request: Request,
	context: Readonly<BrowserWorkspacePreviewSessionByIdRouteContext>,
) {
	const { sessionId, workspaceId } = await context.params;

	return proxyToBackend({
		method: "DELETE",
		path: `/api/browser-workspaces/${encodeURIComponent(workspaceId)}/preview-session/${encodeURIComponent(sessionId)}`,
	});
}
