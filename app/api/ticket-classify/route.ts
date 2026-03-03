import { type NextRequest, NextResponse } from "next/server";

import { getBackendUrl } from "@/app/api/_utils/backend-url";
import { readJsonBody } from "@/app/api/_utils/read-json-body";

export async function POST(request: NextRequest) {
	try {
		const { body, errorResponse } = await readJsonBody(request);
		if (errorResponse) return errorResponse;

		const response = await fetch(`${getBackendUrl()}/api/ticket-classify`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(body),
		});

		if (!response.ok) {
			const errorText = await response.text();
			let errorMessage = "Failed to classify tickets";
			try {
				const parsed = JSON.parse(errorText);
				errorMessage = parsed?.error || parsed?.details || errorMessage;
			} catch {
				errorMessage = errorText || errorMessage;
			}
			return NextResponse.json(
				{ error: errorMessage },
				{ status: response.status },
			);
		}

		const data = await response.json();
		return NextResponse.json(data);
	} catch (error) {
		return NextResponse.json(
			{
				error: "Internal server error",
				details: error instanceof Error ? error.message : String(error),
			},
			{ status: 500 },
		);
	}
}
