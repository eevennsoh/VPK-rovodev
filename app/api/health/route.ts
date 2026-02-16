import { NextResponse } from 'next/server';
import { getBackendUrl } from '@/app/api/_utils/backend-url';

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
        const backendUrl = getBackendUrl();
        const url = `${backendUrl}/api/health`;

        const response = await fetch(url, {
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
                details: error instanceof Error ? error.message : String(error),
                backend_url: getBackendUrl()
            },
            { status: 503 }
        );
    }
}
