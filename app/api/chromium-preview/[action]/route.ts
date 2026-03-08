import { NextRequest, NextResponse } from "next/server";
import { proxyToBackend } from "@/app/api/_utils/proxy";
import { readJsonBody } from "@/app/api/_utils/read-json-body";

const POST_ACTIONS = new Set([
	"back",
	"forward",
	"reload",
	"viewport",
	"click",
	"wheel",
	"press",
	"type",
]);

export async function POST(
	request: NextRequest,
	context: Readonly<{ params: Promise<{ action: string }> }>
) {
	const { action } = await context.params;
	if (!POST_ACTIONS.has(action)) {
		return NextResponse.json(
			{ error: "Unsupported Chromium preview action." },
			{ status: 404 }
		);
	}

	let body: unknown = undefined;
	if (!["back", "forward", "reload"].includes(action)) {
		const parsed = await readJsonBody(request);
		if (parsed.errorResponse) {
			return parsed.errorResponse;
		}
		body = parsed.body;
	}

	return proxyToBackend({
		method: "POST",
		path: `/api/chromium-preview/${action}`,
		body,
	});
}
