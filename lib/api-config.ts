/**
 * API Configuration for Frontend
 *
 * This file determines which backend the frontend should connect to:
 *
 * LOCAL DEVELOPMENT (npm run dev):
 * - Frontend runs on http://localhost:3000 (Next.js dev server)
 * - Backend runs on http://localhost:8080 (Express server)
 * - API calls go to /api/* which are Next.js API routes
 * - These routes proxy the request to http://localhost:8080
 * - This avoids CORS issues since browser only talks to localhost:3000
 *
 * PRODUCTION DEPLOYMENT:
 * - Both frontend and backend served from same Express server on port 8080
 * - Frontend is static HTML/CSS/JS files
 * - API calls go to /api/* which are handled directly by Express
 * - No Next.js API routes exist in production build
 * - No CORS issues since everything is same domain
 *
 * The key insight: In BOTH cases, the frontend uses relative paths (/api/*)
 * The difference is WHO handles those paths:
 * - Local dev: Next.js API routes proxy to Express backend
 * - Production: Express backend handles them directly
 */

// For the frontend, ALWAYS use relative paths
// This works in both local development and production
const API_BASE_URL = '';

export const API_ENDPOINTS = {
	CHAT_SDK: `${API_BASE_URL}/api/chat-sdk`,
	CHAT_TITLE: `${API_BASE_URL}/api/chat-title`,
	CHAT_CANCEL: `${API_BASE_URL}/api/chat-cancel`,
	HEALTH: `${API_BASE_URL}/api/health`,
	PLAN_RUNS: `${API_BASE_URL}/api/agents-team/runs`,
	PLAN_SKILLS: `${API_BASE_URL}/api/agents-team/skills`,
	PLAN_AGENTS: `${API_BASE_URL}/api/agents-team/agents`,
	PLAN_CONFIG_SUMMARY: `${API_BASE_URL}/api/agents-team/config-summary`,
	PLAN_THREADS: `${API_BASE_URL}/api/agents-team/threads`,
	planRuns: (limit?: number) =>
		`${API_BASE_URL}/api/agents-team/runs${
			typeof limit === "number" ? `?limit=${encodeURIComponent(String(limit))}` : ""
		}`,
	planRun: (runId: string) =>
		`${API_BASE_URL}/api/agents-team/runs/${encodeURIComponent(runId)}`,
	planRunStream: (runId: string) =>
		`${API_BASE_URL}/api/agents-team/runs/${encodeURIComponent(runId)}/stream`,
	planRunDirectives: (runId: string) =>
		`${API_BASE_URL}/api/agents-team/runs/${encodeURIComponent(runId)}/directives`,
	planRunSummary: (runId: string) =>
		`${API_BASE_URL}/api/agents-team/runs/${encodeURIComponent(runId)}/summary`,
	planRunVisualSummary: (runId: string) =>
		`${API_BASE_URL}/api/agents-team/runs/${encodeURIComponent(runId)}/visual-summary`,
	planRunTasks: (runId: string) =>
		`${API_BASE_URL}/api/agents-team/runs/${encodeURIComponent(runId)}/tasks`,
	planRunFiles: (runId: string) =>
		`${API_BASE_URL}/api/agents-team/runs/${encodeURIComponent(runId)}/files`,
	planRunShare: (runId: string) =>
		`${API_BASE_URL}/api/agents-team/runs/${encodeURIComponent(runId)}/share`,
	planSkill: (id: string) =>
		`${API_BASE_URL}/api/agents-team/skills/${encodeURIComponent(id)}`,
	planAgent: (id: string) =>
		`${API_BASE_URL}/api/agents-team/agents/${encodeURIComponent(id)}`,
	planSkillPersist: (id: string) =>
		`${API_BASE_URL}/api/agents-team/skills/${encodeURIComponent(id)}/persist`,
	planAgentPersist: (id: string) =>
		`${API_BASE_URL}/api/agents-team/agents/${encodeURIComponent(id)}/persist`,
	planThreads: (limit?: number) =>
		`${API_BASE_URL}/api/agents-team/threads${
			typeof limit === "number" ? `?limit=${encodeURIComponent(String(limit))}` : ""
		}`,
	planThread: (threadId: string) =>
		`${API_BASE_URL}/api/agents-team/threads/${encodeURIComponent(threadId)}`,
};

/**
 * Get the base API URL
 * Useful for debugging or displaying connection status
 */
export function getApiBaseUrl(): string {
	return API_BASE_URL || window.location.origin;
}

/**
 * Check if running in development mode
 * This checks if we're running on localhost
 */
export function isLocalDevelopment(): boolean {
	if (typeof window === 'undefined') {
		// Server-side: check NODE_ENV
		return process.env.NODE_ENV === 'development';
	}
	// Client-side: check hostname
	return window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
}
