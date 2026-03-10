import { NextResponse } from "next/server";
import { getBackendUrl } from "@/app/api/_utils/backend-url";

/**
 * Returns the backend WebSocket URL for the Realtime voice connection.
 *
 * In dev mode, the Next.js proxy cannot handle WebSocket upgrades,
 * so the client needs the direct Express backend URL. This endpoint
 * resolves the backend URL server-side (via .dev-backend-port file,
 * BACKEND_URL env, or worktree port reservation) and returns it.
 */
export function GET() {
	const backendUrl = getBackendUrl(); // e.g. "http://localhost:8082"
	const wsUrl = backendUrl
		.replace(/^http:/, "ws:")
		.replace(/^https:/, "wss:");

	return NextResponse.json({ wsUrl });
}
