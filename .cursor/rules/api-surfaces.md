---
description: API endpoint reference — backend routes, orchestrator, and dev proxy mappings
globs: backend/server.js, app/api/**/*.ts, backend/lib/*.js
alwaysApply: false
paths:
  - backend/server.js
  - app/api/**/*.ts
  - backend/lib/*.js
---

# API Surfaces

## Backend (`backend/server.js`)

- `POST /api/chat-sdk`
- `POST /api/chat-title`
- `POST /api/genui-chat`
- `GET /api/health`
- `GET /healthcheck`
- `POST /api/sound-generation`
- `POST /api/plan/runs`
- `GET /api/plan/runs/:runId`
- `GET /api/plan/runs/:runId/stream`
- `POST /api/plan/runs/:runId/directives`
- `GET /api/plan/runs/:runId/summary`
- `GET /api/plan/runs/:runId/visual-summary`
- `GET /api/plan/skills`
- `POST /api/plan/skills`
- `PUT /api/plan/skills/:id`
- `DELETE /api/plan/skills/:id`
- `GET /api/plan/agents`
- `POST /api/plan/agents`
- `PUT /api/plan/agents/:id`
- `DELETE /api/plan/agents/:id`
- `GET /api/plan/config-summary`
- `GET /api/chat/threads`
- `GET /api/chat/threads/:threadId`
- `POST /api/chat/threads`
- `PUT /api/chat/threads/:threadId`
- `DELETE /api/chat/threads/:threadId`

## Orchestrator (cross-panel debugging)

- `GET /api/orchestrator/log`
- `GET /api/orchestrator/timeline`
- `DELETE /api/orchestrator/log`

## Dev proxy routes (`app/api/*/route.ts`)

Forward to backend:

- `app/api/chat-sdk/route.ts`
- `app/api/chat-title/route.ts`
- `app/api/genui-chat/route.ts`
- `app/api/health/route.ts`
- `app/api/sound-generation/route.ts`
- `app/api/generate-image/route.ts`
- `app/api/plan/runs/route.ts`
- `app/api/plan/runs/[runId]/route.ts`
- `app/api/plan/runs/[runId]/stream/route.ts`
- `app/api/plan/runs/[runId]/directives/route.ts`
- `app/api/plan/runs/[runId]/summary/route.ts`
- `app/api/plan/runs/[runId]/visual-summary/route.ts`
- `app/api/plan/agents/route.ts`
- `app/api/plan/agents/[id]/route.ts`
- `app/api/plan/skills/route.ts`
- `app/api/plan/skills/[id]/route.ts`
- `app/api/plan/config-summary/route.ts`
- `app/api/chat/threads/route.ts`
- `app/api/chat/threads/[threadId]/route.ts`
