import { NextRequest, NextResponse } from "next/server";
import { proxyToBackend } from "@/app/api/_utils/proxy";
import { readJsonBody } from "@/app/api/_utils/read-json-body";

const GET_ACTIONS = new Set(["snapshot", "screenshot", "stream"]);
const POST_ACTIONS = new Set([
	"navigate",
	"back",
	"forward",
	"reload",
	"viewport",
	"click",
	"click-ref",
	"hover-ref",
	"fill-ref",
	"type-ref",
	"select-ref",
	"scroll",
	"wheel",
	"press",
	"type",
]);

interface WorkspaceActionRouteContext {
	params: Promise<{
		action: string;
		workspaceId: string;
	}>;
}

export async function GET(
	request: NextRequest,
	context: Readonly<WorkspaceActionRouteContext>,
) {
	const { action, workspaceId } = await context.params;
	if (!GET_ACTIONS.has(action)) {
		return NextResponse.json(
			{ error: "Unsupported browser workspace action." },
			{ status: 404 },
		);
	}

	return proxyToBackend({
		method: "GET",
		path: `/api/browser-workspaces/${encodeURIComponent(workspaceId)}/${encodeURIComponent(action)}${request.nextUrl.search}`,
	});
}

export async function POST(
	request: NextRequest,
	context: Readonly<WorkspaceActionRouteContext>,
) {
	const { action, workspaceId } = await context.params;
	if (!POST_ACTIONS.has(action)) {
		return NextResponse.json(
			{ error: "Unsupported browser workspace action." },
			{ status: 404 },
		);
	}

	let body: unknown = undefined;
	if (!["back", "forward", "reload"].includes(action)) {
		const parsed = await readJsonBody(request);
		if (parsed.errorResponse) {
			return parsed.errorResponse;
		}
		body = parsed.body ?? {};
	}

	return proxyToBackend({
		method: "POST",
		path: `/api/browser-workspaces/${encodeURIComponent(workspaceId)}/${encodeURIComponent(action)}`,
		body,
	});
}
