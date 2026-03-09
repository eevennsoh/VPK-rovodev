import { NextResponse } from 'next/server';
import {
	BackendConnectionError,
	fetchBackend,
	getBackendUrlCandidates,
} from '@/app/api/_utils/backend-url';

/**
 * API proxy route that forwards health check requests to the backend Express server
 * 
 * This route is ONLY used during local development (npm run dev).
 * In production, this route does not exist - the frontend calls the backend directly
 * since they're served from the same domain.
 * 
 * Used to verify that the backend is running and properly configured.
 */
export async function GET() {
	try {
		const { response } = await fetchBackend('/api/health', {
			method: 'GET',
			headers: {
				'Content-Type': 'application/json',
			},
		});

		if (!response.ok) {
			const errorText = await response.text();
			return NextResponse.json(
				{ error: 'Backend health check failed', details: errorText },
				{ status: response.status }
			);
		}

		const data = await response.json();
		return NextResponse.json(data);
	} catch (error) {
		console.error('Health check proxy error:', error);
		return NextResponse.json(
			{
				status: 'BACKEND_UNREACHABLE',
				error: 'Cannot connect to backend server',
				details: error instanceof BackendConnectionError
					? error.cause instanceof Error
						? error.cause.message
						: String(error.cause)
					: error instanceof Error
						? error.message
						: String(error),
				backend_urls: error instanceof BackendConnectionError
					? error.backendUrls
					: getBackendUrlCandidates()
			},
			{ status: 503 }
		);
	}
}
