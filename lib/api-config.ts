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
	PLAN_TITLE: `${API_BASE_URL}/api/plan-title`,
	CHAT_CANCEL: `${API_BASE_URL}/api/chat-cancel`,
	HEALTH: `${API_BASE_URL}/api/health`,
	PLAN_RUNS: `${API_BASE_URL}/api/plan/runs`,
	PLAN_SKILLS: `${API_BASE_URL}/api/plan/skills`,
	PLAN_AGENTS: `${API_BASE_URL}/api/plan/agents`,
	PLAN_TOOLS: `${API_BASE_URL}/api/plan/tools`,
	PLAN_CONFIG_SUMMARY: `${API_BASE_URL}/api/plan/config-summary`,
	CHAT_THREADS: `${API_BASE_URL}/api/chat/threads`,
	planRuns: (limit?: number) =>
		`${API_BASE_URL}/api/plan/runs${
			typeof limit === "number" ? `?limit=${encodeURIComponent(String(limit))}` : ""
		}`,
	planRun: (runId: string) =>
		`${API_BASE_URL}/api/plan/runs/${encodeURIComponent(runId)}`,
	planRunStream: (runId: string) =>
		`${API_BASE_URL}/api/plan/runs/${encodeURIComponent(runId)}/stream`,
	planRunDirectives: (runId: string) =>
		`${API_BASE_URL}/api/plan/runs/${encodeURIComponent(runId)}/directives`,
	planRunSummary: (runId: string) =>
		`${API_BASE_URL}/api/plan/runs/${encodeURIComponent(runId)}/summary`,
	planRunVisualSummary: (runId: string) =>
		`${API_BASE_URL}/api/plan/runs/${encodeURIComponent(runId)}/visual-summary`,
	planRunTasks: (runId: string) =>
		`${API_BASE_URL}/api/plan/runs/${encodeURIComponent(runId)}/tasks`,
	planRunFiles: (runId: string) =>
		`${API_BASE_URL}/api/plan/runs/${encodeURIComponent(runId)}/files`,
	planRunShare: (runId: string) =>
		`${API_BASE_URL}/api/plan/runs/${encodeURIComponent(runId)}/share`,
	planSkill: (name: string) =>
		`${API_BASE_URL}/api/plan/skills/${encodeURIComponent(name)}`,
	planAgent: (name: string) =>
		`${API_BASE_URL}/api/plan/agents/${encodeURIComponent(name)}`,
	planSkillRaw: (name: string) =>
		`${API_BASE_URL}/api/plan/skills/${encodeURIComponent(name)}/raw`,
	planAgentRaw: (name: string) =>
		`${API_BASE_URL}/api/plan/agents/${encodeURIComponent(name)}/raw`,
	chatThreads: (limit?: number) =>
		`${API_BASE_URL}/api/chat/threads${
			typeof limit === "number" ? `?limit=${encodeURIComponent(String(limit))}` : ""
		}`,
	chatThread: (threadId: string) =>
		`${API_BASE_URL}/api/chat/threads/${encodeURIComponent(threadId)}`,
	MAKE_RUNS: `${API_BASE_URL}/api/make/runs`,
	MAKE_SKILLS: `${API_BASE_URL}/api/make/skills`,
	MAKE_AGENTS: `${API_BASE_URL}/api/make/agents`,
	MAKE_TOOLS: `${API_BASE_URL}/api/make/tools`,
	MAKE_CONFIG_SUMMARY: `${API_BASE_URL}/api/make/config-summary`,
	makeRuns: (limit?: number) =>
		`${API_BASE_URL}/api/make/runs${
			typeof limit === "number" ? `?limit=${encodeURIComponent(String(limit))}` : ""
		}`,
	makeRun: (runId: string) =>
		`${API_BASE_URL}/api/make/runs/${encodeURIComponent(runId)}`,
	makeRunStream: (runId: string) =>
		`${API_BASE_URL}/api/make/runs/${encodeURIComponent(runId)}/stream`,
	makeRunDirectives: (runId: string) =>
		`${API_BASE_URL}/api/make/runs/${encodeURIComponent(runId)}/directives`,
	makeRunSummary: (runId: string) =>
		`${API_BASE_URL}/api/make/runs/${encodeURIComponent(runId)}/summary`,
	makeRunTasks: (runId: string) =>
		`${API_BASE_URL}/api/make/runs/${encodeURIComponent(runId)}/tasks`,
	makeRunShare: (runId: string) =>
		`${API_BASE_URL}/api/make/runs/${encodeURIComponent(runId)}/share`,
	makeSkill: (name: string) =>
		`${API_BASE_URL}/api/make/skills/${encodeURIComponent(name)}`,
	makeAgent: (name: string) =>
		`${API_BASE_URL}/api/make/agents/${encodeURIComponent(name)}`,
	makeSkillRaw: (name: string) =>
		`${API_BASE_URL}/api/make/skills/${encodeURIComponent(name)}/raw`,
	makeAgentRaw: (name: string) =>
		`${API_BASE_URL}/api/make/agents/${encodeURIComponent(name)}/raw`,
};
