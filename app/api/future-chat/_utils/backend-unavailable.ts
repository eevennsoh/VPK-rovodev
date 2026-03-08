import { NextResponse } from "next/server";

const FUTURE_CHAT_BACKEND_UNAVAILABLE_MESSAGE =
	"Cannot connect to backend server";

export async function withFutureChatBackendUnavailableFallback(
	response: NextResponse,
	fallbackBody: Record<string, unknown>,
): Promise<NextResponse> {
	if (response.status !== 503) {
		return response;
	}

	const payload = (await response.clone().json().catch(() => null)) as
		| { error?: unknown }
		| null;
	if (payload?.error !== FUTURE_CHAT_BACKEND_UNAVAILABLE_MESSAGE) {
		return response;
	}

	return NextResponse.json(
		{
			...fallbackBody,
			backendUnavailable: true,
			error: FUTURE_CHAT_BACKEND_UNAVAILABLE_MESSAGE,
		},
		{ status: 200 },
	);
}
