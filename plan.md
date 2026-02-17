# Agents-Team End-to-End Multi-Subagent Loop (AI Gateway workers + Tabbed Summary)

## Summary
Implement a single-run, iterative agents-team experience where:
1. User starts on `/agents-team`, optionally answers question-card prompts, and approves a generated plan.
2. Tasks execute in parallel across 4 worker subagents routed through AI Gateway.
3. After each completed task batch, the system auto-regenerates:
   - executive markdown summary,
   - visual presenter HTML (RovoDev-powered),
   - TTS audio (Google `tts-latest` via AI Gateway),
   - artifact index for Files tab.
4. User lands on a canonical tabbed run workspace (`Chat / Summary / Files`) and can continue prompting to append new tasks to the same mutable run.

Locked decisions from you:
- Execution routing: `AI Gateway-only` for worker tasks.
- Iteration model: `single mutable run`.
- Files tab: `auto-captured artifacts`.
- Summary refresh: `auto after each task batch`.
- Canonical UI: `tabbed Agent Summary page`.

## Scope
- In:
  - Backend run-manager/provider refactor for AI Gateway worker execution.
  - Mutable run lifecycle (append tasks to same run).
  - Auto artifact generation (markdown/html/spec/audio + links/outputs).
  - Canonical tabbed run workspace and integration with existing block components.
- Out:
  - Manual file uploads in Files tab (V1).
  - True multi-port RovoDev worker orchestration (deferred).
  - Replacing current home-page question-card flow (we reuse it as-is for initial plan).

## Public API / Interface Changes

### 1) `lib/agents-team-run-types.ts`
- Extend `AgentRun`:
  - `iteration: number`
  - `artifacts: AgentRunArtifact[]`
  - `activeBatchId: string | null`
- Add:
  - `AgentRunArtifact`:
    - `id`, `type` (`summary-md` | `visual-html` | `genui-json` | `audio` | `task-output` | `link`),
    - `title`, `path`, `url`, `mimeType`, `sizeBytes`, `createdAt`, `iteration`, `taskId?`.

### 2) New/updated backend endpoints (`backend/server.js`)
- `POST /api/agents-team/runs/:runId/tasks`
  - Append tasks to existing run (same run id), increment iteration, restart scheduler if idle.
- `GET /api/agents-team/runs/:runId/files`
  - Return artifact manifest for Files tab.
- Keep existing:
  - `/summary`, `/visual-summary`, `/stream`, `/directives`.
- `POST /api/sound-generation` remains public; internal synthesis logic will be reused by run manager.

### 3) Dev proxy routes (`app/api/agents-team/...`)
- Add:
  - `app/api/agents-team/runs/[runId]/tasks/route.ts`
  - `app/api/agents-team/runs/[runId]/files/route.ts`
- Update `lib/api-config.ts` with:
  - `agentsTeamRunTasks(runId)`
  - `agentsTeamRunFiles(runId)`

## Backend Implementation Plan

### A) Re-enable AI Gateway provider path for worker execution
Files:
- `backend/lib/agents-team-runs.js`
- `backend/lib/ai-gateway-provider.js` (replace stub with working provider helpers)
- optionally `backend/lib/ai-gateway-helpers.js` (reuse existing helpers, add non-stream text helper if needed)

Changes:
1. Introduce provider selection inside run manager:
   - Worker tasks (`task.agentName !== "Visual Presenter"`): AI Gateway text generation.
   - Visual presenter summary HTML: RovoDev (`generateTextViaRovoDev`) with equipped skills.
2. Keep planning/home chat flow unchanged (RovoDev question-card + plan widget).
3. Maintain concurrency cap `MAX_CONCURRENT_AGENTS = 4`.

### B) Mutable run lifecycle (single run, iterative append)
Files:
- `backend/lib/agents-team-runs.js`

Changes:
1. Add `appendTasks(runId, planDelta, contextPrompt)`:
   - Normalize task ids (unique per run), validate dependencies (existing + new).
   - Mark run back to `running` when new tasks are appended.
   - Increment `iteration`.
2. Keep previous task outputs and summaries; new summaries supersede as latest, older artifacts stay accessible.
3. Allow directives during resumed execution.
4. Ensure scheduler is re-entrant and safe if called while already running.

### C) Auto summary + visual + audio synthesis after each batch
Files:
- `backend/lib/agents-team-runs.js`
- extract reusable TTS core from `backend/server.js` into `backend/lib/sound-generation.js`

Changes:
1. On batch completion:
   - Generate markdown executive summary (AI Gateway worker synthesizer).
   - Generate visual HTML via Visual Presenter (RovoDev + `frontend-design` skill context).
   - Generate audio from executive summary via Google TTS (`tts-latest`, provider `google`).
2. Persist all outputs in run folder with iteration suffix:
   - `summary.iteration-{n}.md/json`
   - `visual-summary.iteration-{n}.html/json`
   - `genui-summary.iteration-{n}.json`
   - `audio-summary.iteration-{n}.mp3` (+ metadata json)
3. Build/update `artifacts.json` manifest and expose through `getRunFiles`.

### D) Files manifest auto-capture
Files:
- `backend/lib/agents-team-runs.js`

Capture sources:
1. Generated artifacts (summary/html/spec/audio).
2. Per-task output snapshots as text artifacts.
3. Extracted links from summary/task markdown (URL regex) as `link` artifacts.

## Frontend Implementation Plan

### A) Canonical run workspace with tabs
Files:
- `app/agents-team/runs/[runId]/page.tsx`
- new `components/templates/agents-team/components/run-workspace.tsx`
- reuse patterns from `components/blocks/agent-summary/page.tsx`, `components/blocks/agent-grid/page.tsx`, `components/blocks/agent-progress/page.tsx`

Changes:
1. Replace current section-only run page with tabbed layout:
   - `Chat`
   - `Summary`
   - `Files`
2. Keep existing `RunSummarySection` content as Summary tab core.
3. Embed audio player at top of Summary tab using generated run audio artifact.
4. Keep visual summary iframe container from existing flow.

### B) Chat tab behavior (iteration loop)
Files:
- `components/templates/agents-team/components/run-workspace.tsx`
- optionally new hook `components/templates/agents-team/hooks/use-run-iteration.ts`

Behavior:
1. Prompt input submits follow-up request for additional tasks.
2. Backend produces plan delta + appends tasks via `/tasks`.
3. Existing stream updates power grid/progress refresh.
4. User remains in same run; summary/files auto-refresh after completion.

### C) Files tab UI
Files:
- new `components/templates/agents-team/components/run-files-tab.tsx`

Behavior:
1. Fetch `/api/agents-team/runs/:runId/files`.
2. Group by iteration and artifact type.
3. Provide:
   - open/download links for html/audio/json/md,
   - copy URL for link artifacts,
   - metadata (created time, size, source task).

### D) Home page flow integration
Files:
- `components/templates/agents-team/page.tsx`
- `components/templates/agents-team/hooks/use-execution-mode.ts`

Changes:
1. Keep initial question-card + plan approval flow as is.
2. After run starts/finishes, route to canonical run workspace.
3. Reuse `ExecutionGridView` and `TaskTrackerCard` styles in run workspace where applicable.

## Subagent Implementation Breakdown (for actual build phase)
1. Backend Agent A: provider routing + run manager mutable lifecycle.
2. Backend Agent B: summary/visual/audio artifact pipeline + files manifest.
3. Frontend Agent C: tabbed run workspace + summary/audio/files rendering.
4. Frontend Agent D: chat-tab iteration submission + streaming/progress wiring.
5. Integrator: type sync, proxy routes, API config, regression pass.

## Test Cases and Scenarios

### Backend functional
1. Create run from initial approved plan -> 4 tasks execute with dependency order.
2. Append iteration tasks to completed run -> run re-enters `running`, then completes.
3. Worker task generation uses AI Gateway path; Visual Presenter uses RovoDev path.
4. On synthesis failure:
   - summary fallback still produced,
   - visual fallback html produced,
   - audio failure does not break run completion.
5. Files endpoint returns full artifact manifest across iterations.

### Frontend functional
1. `/agents-team/runs/[runId]` loads tabs and defaults to Summary.
2. Summary tab shows:
   - markdown synthesis,
   - interactive summary (if renderable),
   - visual iframe,
   - audio player (when artifact exists).
3. Chat tab can add tasks and trigger next iteration.
4. Files tab lists generated docs/audio/html/links and supports open/download.
5. Status and progress update live through SSE during reruns.

### Validation commands
1. `pnpm run lint`
2. `pnpm tsc --noEmit`
3. `pnpm run audit:previews` (if preview/demo files touched)

### UI verification
1. Light + dark themes.
2. States: loading, running, completed, failed, empty-files, partial artifacts.
3. Long summaries / missing visual / missing audio fallback.
4. Keyboard accessibility and semantic controls for tabs/player/actions.
5. Narrow viewport layout for tabs, iframe, and files list.

## Assumptions and Defaults
1. AI Gateway credentials/env vars are available for worker text generation and Google TTS.
2. RovoDev remains required for planning/chat and Visual Presenter HTML generation.
3. Iterative V1 uses auto-generated artifacts only; no manual file uploads.
4. Existing question-card flow is reused only for initial run creation (not every follow-up iteration).
5. Backward compatibility: old run data without `iteration/artifacts` is handled with safe defaults (`iteration=1`, `artifacts=[]`).
