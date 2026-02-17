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
	AGENTS_TEAM_RUNS: `${API_BASE_URL}/api/agents-team/runs`,
	AGENTS_TEAM_SKILLS: `${API_BASE_URL}/api/agents-team/skills`,
	AGENTS_TEAM_AGENTS: `${API_BASE_URL}/api/agents-team/agents`,
	AGENTS_TEAM_CONFIG_SUMMARY: `${API_BASE_URL}/api/agents-team/config-summary`,
	agentsTeamRun: (runId: string) =>
		`${API_BASE_URL}/api/agents-team/runs/${encodeURIComponent(runId)}`,
	agentsTeamRunStream: (runId: string) =>
		`${API_BASE_URL}/api/agents-team/runs/${encodeURIComponent(runId)}/stream`,
	agentsTeamRunDirectives: (runId: string) =>
		`${API_BASE_URL}/api/agents-team/runs/${encodeURIComponent(runId)}/directives`,
	agentsTeamRunSummary: (runId: string) =>
		`${API_BASE_URL}/api/agents-team/runs/${encodeURIComponent(runId)}/summary`,
	agentsTeamRunVisualSummary: (runId: string) =>
		`${API_BASE_URL}/api/agents-team/runs/${encodeURIComponent(runId)}/visual-summary`,
	agentsTeamRunTasks: (runId: string) =>
		`${API_BASE_URL}/api/agents-team/runs/${encodeURIComponent(runId)}/tasks`,
	agentsTeamRunFiles: (runId: string) =>
		`${API_BASE_URL}/api/agents-team/runs/${encodeURIComponent(runId)}/files`,
	agentsTeamSkill: (id: string) =>
		`${API_BASE_URL}/api/agents-team/skills/${encodeURIComponent(id)}`,
	agentsTeamAgent: (id: string) =>
		`${API_BASE_URL}/api/agents-team/agents/${encodeURIComponent(id)}`,
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
