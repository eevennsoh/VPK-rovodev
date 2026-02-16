import { NextRequest, NextResponse } from "next/server";

interface ReadJsonBodyResult<T> {
	body: T | null;
	errorResponse: NextResponse | null;
}

export async function readJsonBody<T = unknown>(
	request: NextRequest
): Promise<ReadJsonBodyResult<T>> {
	const rawBody = await request.text();
	if (!rawBody.trim()) {
		return {
			body: null,
			errorResponse: NextResponse.json(
				{ error: "Request body is required." },
				{ status: 400 }
			),
		};
	}

	try {
		return {
			body: JSON.parse(rawBody) as T,
			errorResponse: null,
		};
	} catch {
		return {
			body: null,
			errorResponse: NextResponse.json(
				{ error: "Invalid JSON request body." },
				{ status: 400 }
			),
		};
	}
}
