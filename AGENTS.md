# VPK (Venn Prototype Kit)

> Provider-neutral project context for AI coding assistants (Cursor, Claude Code, Codex, and others).
> Skills are defined in `.cursor/skills/`. Agents are defined in `.cursor/agents/`.

Next.js 16 (React 19, Tailwind CSS v4) + Express backend with AI SDK (Vercel) and RovoDev Serve integration.

## Start Here

- Read this file top-to-bottom once. For details, use the Appendix sections.
- Quick start:
  - `pnpm install`
  - `pnpm run dev`
- Local runtime uses two processes: Next.js frontend proxy + Express backend.
- Production runtime uses one Express process serving static export plus `/api/*`.
- Primary frontend edits are in `components/templates/`, `components/blocks/`, and `app/` route files.
- Backend API edits are in `backend/server.js` and `app/api/*/route.ts` (dev proxy).
- Validate every change with `pnpm run lint` and `pnpm tsc --noEmit`.
- For UI changes, also run visual + accessibility checks (see `## Workflows -> Validation`).

## Documentation Index

Prefer reading these references over relying on pre-trained knowledge.

**Project References** — local files in the repo:

| When you need...                       | Read                                                        |
| -------------------------------------- | ----------------------------------------------------------- |
| Component architecture rules           | `.cursor/skills/vpk-tidy/SKILL.md`                          |
| React patterns reference (1000+ lines) | `.cursor/skills/vpk-tidy/references/patterns.md`            |
| Design token catalog (200+ tokens)     | `.cursor/skills/vpk-design/references/tokens.md`            |
| Token selection priority               | `.claude/rules/token-priority.md`                           |
| Figma-to-code pipeline                 | `.cursor/skills/vpk-design/SKILL.md`                        |
| Deployment guide                       | `.cursor/skills/vpk-deploy/references/guide-deployment.md`  |
| Setup walkthrough                      | `.cursor/skills/vpk-setup/references/guide-setup.md`        |
| Motion + Base UI animation             | `.claude/rules/motion-base-ui.md`                           |
| Motion for React rules                 | `.claude/rules/motion-react.md`                             |
| Session corrections log                | `AGENTS-LESSONS.md`                                         |
| AI SDK chat integration                | `backend/lib/ai-gateway-helpers.js`, `app/contexts/context-rovo-chat-plan.tsx` |
| RovoDev Serve gateway (agent loop)     | `backend/lib/rovodev-gateway.js`, `backend/lib/rovodev-client.js` |
| Agent team run types                   | `lib/agents-team-run-types.ts`                              |
| Agent team run manager                 | `backend/lib/agents-team-runs.js`                           |
| UI message types and data parts        | `lib/rovo-ui-messages.ts`                                   |

**Global Skills** — installed agent skills (outside repo):

| When you need...                | Read                                                  |
| ------------------------------- | ----------------------------------------------------- |
| Component design fundamentals   | `~/.agents/skills/building-components/references/`    |
| React composition patterns      | `~/.agents/skills/vercel-composition-patterns/rules/` |
| React/Next.js performance rules | `~/.agents/skills/vercel-react-best-practices/rules/` |
| AGENTS.md best practices        | `~/.agents/skills/claude-md-improver/references/`     |

**External Documentation** — fetch via tools when needed:

| When you need...        | URL                                                       |
| ----------------------- | --------------------------------------------------------- |
| Atlassian Design System | `https://atlassian.design` (also via `ads_plan` MCP tool) |
| shadcn/ui components    | `https://ui.shadcn.com/docs`                              |
| Tailwind CSS            | `https://tailwindcss.com/docs`                            |

## Core Rules (Highest Priority)

### Rule Priority

If instructions overlap, use this precedence:

1. Direct user instruction for the current task
2. This `CLAUDE.md`
3. Tool/runtime constraints
4. Skill-specific docs (for the chosen skill)
5. Supplemental references in Appendix

### Rule Sources

- Cursor rules: `.cursor/rules/*.mdc`
- Claude rules: `.claude/rules/*.md`
- Codex rules: `.codex/rules/*.rules`

### Non-negotiable Defaults

- Package manager: `pnpm`
- Indentation: tabs
- Imports: use `@/` alias
- React 19 patterns:
  - `use(Context)` not `useContext()`
  - `<Context value={}>` not `<Context.Provider>`
  - `ref` as regular prop (no `forwardRef`)
- Conditional rendering: use ternary (`cond ? <X /> : null`), not `&&` patterns that can render `0`
- Use semantic token classes before raw CSS variables
- Do not introduce new `bg-[var(--ds-...)]` / `text-[var(--ds-...)]` patterns in VPK components

## Architecture

### Runtime Modes

Local development — RovoDev agent loop (two terminals):

```text
Terminal 1: pnpm run rovodev          → rovodev serve (:8000)
Terminal 2: pnpm run dev                   → Next.js (:3000) + Express (:8080)

Browser -> Next.js (:3000) -> app/api/* proxy -> Express (:8080) -> rovodev serve (:8000)
```

Production with static export (single process, requires `NEXT_OUTPUT=export` during build):

```text
Browser -> Express (:8080) -> static export + /api/* -> RovoDev Serve
```

Start `pnpm run rovodev` in one terminal, then `pnpm run dev` in another. The backend auto-detects RovoDev Serve via the `.dev-rovodev-port` file. If RovoDev Serve is unavailable, chat requests return 503 unless `AUTO_FALLBACK_TO_AI_GATEWAY=true` is enabled and AI Gateway env vars are configured.

### Key Directories

- `app/` - Next.js App Router routes, providers, and dev proxy handlers
- `backend/` - Express production runtime and API handlers
- `components/templates/` - ADS-themed feature surfaces (agents-team, confluence, fullscreen-chat, jira, search, sidebar-chat)
- `components/blocks/` - standalone block surfaces (app-sidebar, approval-card, chat, chat-composer, chatbot, chatgpt, dashboard, data-table, generative, ide, login, product-sidebar, prompt-gallery, question-card, settings-dialog, shared-ui, sidebar, sidebar-rail, signup, top-navigation, work-items-widget, workflow)
- `components/charts/` - chart components (area, bar, line, pie, radar, radial, tooltip)
- `components/ui/` - shared shadcn/Base UI primitives
- `components/website/` - component documentation and demo site
- `lib/` - shared utilities and token helpers
- `backend/lib/` - backend utilities (agents-team run manager, RovoDev gateway and client)
- `public/` - static assets (illustrations, product logos, third-party logos, avatars)
- `.cursor/`, `.claude/`, `.codex/` - assistant config, skills, agents, and rules

See `## Appendix -> Detailed Directory Structure` for expanded layout.

### Component Topology

- Feature components live under `components/{templates,blocks}/[feature]/`
- `page.tsx` is the public API for feature entrypoints
- Sub-components belong in local `components/` folders
- Optional local folders: `hooks/`, `data/`, `lib/`
- Shared template utilities live in `components/templates/shared/`

### Provider Composition

Provider order in `app/providers.tsx`:

```text
ThemeWrapper
  -> SidebarProvider
    -> RovoChatProvider
      -> RovoChatPureProvider
        -> SystemPromptProvider
```

### API Surfaces

Backend (`backend/server.js`):

- `POST /api/chat-sdk`
- `POST /api/chat-title`
- `POST /api/genui-chat`
- `GET /api/health`
- `GET /healthcheck`
- `POST /api/sound-generation`
- `POST /api/agents-team/runs`
- `GET /api/agents-team/runs/:runId`
- `GET /api/agents-team/runs/:runId/stream`
- `POST /api/agents-team/runs/:runId/directives`
- `GET /api/agents-team/runs/:runId/summary`
- `GET /api/agents-team/runs/:runId/visual-summary`
- `GET /api/agents-team/skills`
- `POST /api/agents-team/skills`
- `PUT /api/agents-team/skills/:id`
- `DELETE /api/agents-team/skills/:id`
- `GET /api/agents-team/agents`
- `POST /api/agents-team/agents`
- `PUT /api/agents-team/agents/:id`
- `DELETE /api/agents-team/agents/:id`
- `GET /api/agents-team/config-summary`

Dev proxy routes (`app/api/*/route.ts`) forward to backend:

- `app/api/chat-sdk/route.ts`
- `app/api/chat-title/route.ts`
- `app/api/genui-chat/route.ts`
- `app/api/health/route.ts`
- `app/api/sound-generation/route.ts`
- `app/api/generate-image/route.ts`
- `app/api/agents-team/runs/route.ts`
- `app/api/agents-team/runs/[runId]/route.ts`
- `app/api/agents-team/runs/[runId]/stream/route.ts`
- `app/api/agents-team/runs/[runId]/directives/route.ts`
- `app/api/agents-team/runs/[runId]/summary/route.ts`
- `app/api/agents-team/runs/[runId]/visual-summary/route.ts`
- `app/api/agents-team/agents/route.ts`
- `app/api/agents-team/agents/[id]/route.ts`
- `app/api/agents-team/skills/route.ts`
- `app/api/agents-team/skills/[id]/route.ts`
- `app/api/agents-team/config-summary/route.ts`

### AI SDK / Chat Architecture

**Dependencies:** `ai` (core streaming/transport) and `@ai-sdk/react` (React hooks).

Frontend pattern:

- `useChat` hook from `@ai-sdk/react` manages message state, streaming, and submission
- `DefaultChatTransport` from `ai` points to `/api/chat-sdk`
- Messages use the `UIMessage` type from `ai`

Custom data parts sent by the backend:

- `widget-loading` — signals widget loading state
- `widget-data` — delivers widget payload to the frontend
- `suggested-questions` — provides follow-up question suggestions
- `thinking-status` — thinking visualization state
- `agent-execution` — agent task execution updates

Backend streaming (`backend/server.js`):

- `createUIMessageStream` + `pipeUIMessageStreamToResponse` from `ai` handle SSE streaming
RovoDev Serve integration (`backend/lib/rovodev-gateway.js`):

- **RovoDev-only mode**: The backend requires RovoDev Serve to be running and will reject requests if unavailable
- Detection: reads `.dev-rovodev-port` file → sets `ROVODEV_PORT` env var → pings `/healthcheck`
- Streaming: `streamViaRovoDev()` uses the V3 two-step API (`POST /v3/set_chat_message` then `GET /v3/stream_chat`)
- Non-streaming: `generateTextViaRovoDev()` wraps streaming for title generation, suggestions, and clarification cards
- If `rovodev serve` stops mid-session, subsequent requests return 503 errors with instructions to restart

Key files:

- `app/contexts/context-rovo-chat-plan.tsx` — `useChat` integration, data part handling, message transformation
- `rovo/config.js` — Rovo user-message formatter (`buildUserMessage`)
- `backend/server.js` — Express streaming endpoint using `createUIMessageStream`
- `backend/lib/rovodev-gateway.js` — RovoDev Serve streaming/text bridge
- `backend/lib/rovodev-client.js` — Low-level V3 REST + SSE client for `rovodev serve`
- `app/api/chat-sdk/route.ts` — dev proxy forwarding to Express (requires RovoDev Serve)

### Route Overview

Common routes:

- `/` -> `app/page.tsx`
- `/agents-team` -> `components/templates/agents-team/`
- `/sidebar-chat` -> `components/templates/sidebar-chat/`
- `/fullscreen-chat` -> `components/templates/fullscreen-chat/`
- `/confluence` -> `components/templates/confluence/`
- `/jira` -> `components/templates/jira/`
- `/search` -> `components/templates/search/`
- `/components/[category]/[slug]` -> `app/components/[category]/[slug]/page.tsx`
- `/preview/blocks/[slug]` -> `app/preview/blocks/[slug]/`
- `/preview/templates/[slug]` -> `app/preview/templates/[slug]/`
- `/[category]` -> `app/[category]/page.tsx`

See `## Appendix -> Full Route Mapping` for the complete table.

## Engineering Standards

### Code Style

- UI primitives: `components/ui/*`
- Icons: `@atlaskit/icon/core/*`, then `@atlaskit/icon-lab/core/*`
- Product logos: `@/components/ui/logo`
- Images: use `next/image` with explicit `width` + `height`
- Static assets live in `public/`; reference via absolute path (e.g. `/illustration-ai/chat/light.svg`)
- Organize new assets by category: `1p/` (Atlassian product logos), `3p/` (third-party logos), `illustration/` (rich icons), `illustration-ai/` (AI illustrations with light/dark variants)
- Shadows: `token("elevation.shadow.raised")` or `token("elevation.shadow.overlay")`
- Dates: `Intl.DateTimeFormat(undefined, { dateStyle: "medium" })`

Key imports:

```tsx
import { token } from "@/lib/tokens"; // spacing, shadows, dynamic values only
import { cn } from "@/lib/utils"; // class merging (all className props)
import { Button } from "@/components/ui/button";
import { useChat } from "@ai-sdk/react"; // chat message state + streaming
import { DefaultChatTransport, type UIMessage } from "ai"; // transport + message types
```

### Component Architecture

Reference details: `.cursor/skills/vpk-tidy/SKILL.md`

Quick rules:

- Keep components under 150 lines where practical
- Move logic into hooks
- Move static data into `data/` files
- Use `Readonly<Props>` interfaces

Context pattern (`State/Actions/Meta`) lives in:

- `app/contexts/context-[name].tsx`
- Reference implementation: `app/contexts/context-work-item-modal.tsx`

Use convenience hooks such as:

- `useFooState()`
- `useFooActions()`
- `useFooData()` or `useFooMeta()`

Compound component namespace pattern:

```tsx
export const Composer = {
	Container: ComposerContainer,
	Textarea: ComposerTextarea,
	Actions: ComposerActions,
} as const;
```

CVA variant pattern for `components/ui/*`:

```tsx
import { cva, type VariantProps } from "class-variance-authority";

const badgeVariants = cva("base-classes", {
	variants: { variant: { default: "...", danger: "..." } },
	defaultVariants: { variant: "default" },
});

interface BadgeProps extends React.ComponentProps<"span">, VariantProps<typeof badgeVariants> {}
```

### UI and Token Standards

Selection priority:

1. Semantic shadcn/ADS utility classes
2. Accent Tailwind classes from `tailwind-theme.css`
3. Raw `token()` or `var(--ds-...)` only when no mapped class exists

In `components/ui/*`, use shadcn naming (`bg-card`, `text-foreground`).
In VPK feature code, use ADS semantic naming (`bg-surface-raised`, `text-text-subtle`).

Common mapping examples:

- `--color-text-subtle` -> `text-text-subtle`
- `--color-icon-danger` -> `text-icon-danger` (icons use text utility)
- `--color-bg-danger` -> `bg-bg-danger`
- `--color-surface-raised` -> `bg-surface-raised`
- `--color-border-bold` -> `border-border-bold`

Common mistakes:

| Wrong                               | Correct                             |
| ----------------------------------- | ----------------------------------- |
| `bg-[var(--ds-background-neutral)]` | `bg-bg-neutral`                     |
| `text-[var(--ds-text-danger)]`      | `text-text-danger`                  |
| `bg-[var(--ds-surface-raised)]`     | `bg-surface-raised`                 |
| `border-[var(--ds-border-bold)]`    | `border-border-bold`                |
| `bg-white` / `bg-black`             | `bg-surface` / `bg-bg-neutral-bold` |

### Theming

- Theme provider: `components/utils/theme-wrapper.tsx`
- Persistence key: `ui-theme`
- Applies `light`/`dark` class to `<html>`

Exports:

- `useTheme()`
- `ThemeToggle`
- `ThemeSelector`

## Workflows

### Development

- Install dependencies: `pnpm install`
- First-time MCP setup: `acli rovodev` (interactive, approve MCP servers, then Ctrl+C)
- Start everything: `pnpm run rovodev` (starts rovodev serve pool + backend + frontend)
- Start frontend + backend only: `pnpm run dev` (requires rovodev serve already running)
- Start frontend only: `pnpm run dev:frontend`
- Start backend only: `pnpm run dev:backend`

### Build and Run

- Build: `pnpm run build`
- Build for production (static export): `NEXT_OUTPUT=export pnpm run build`
- Start locally (Next.js dev server): `pnpm run start`

### Deployment

Preferred path:

- `/vpk-deploy`

Direct scripts:

- `./.cursor/skills/vpk-deploy/scripts/deploy.sh <service> <version> [env]`
- `./.cursor/skills/vpk-deploy/scripts/deploy-check.sh`
- `pnpm run deploy:micros`

Before first deployment:

1. Update `service-descriptor.yml` with your service name
2. Replace `YOUR-SERVICE-NAME`
3. Keep service name <= 26 chars, lowercase + hyphens

### Validation

No automated test framework is configured. Verification is observational and tool-driven.

Run on every change:

1. `pnpm run lint`
2. `pnpm tsc --noEmit`

Run additionally for UI changes:

1. Visual checks via `/agent-browser` (preferred), Playwright fallback
2. Accessibility checks:
   - `ads_analyze_a11y` for component code
   - `ads_analyze_localhost_a11y` for live page

Required UI verification coverage:

- Light and dark theme coverage
- Default, hover, active, disabled, empty, and error states
- Long text / missing optional data / empty-list edge cases
- Keyboard and semantic accessibility
- Responsive behavior on narrow viewport

Keep verification observable:

- Read lint/typecheck output directly
- Inspect browser snapshots/screenshots directly
- Monitor dev server logs for runtime/compile errors

## Agent Operations

### Skills and Agents

Primary locations:

- Skills: `.cursor/skills/*/SKILL.md`
- Agents: `.cursor/agents/*`

Provider mirrors:

- `.claude/agents` and `.codex/agents` mirror `.cursor/agents`

Skill types:

- Workflow: multi-step procedures
- Utility: single-purpose helpers

Current VPK skills (see Appendix for details):

- `/vpk-setup`
- `/vpk-deploy`
- `/vpk-design`
- `/vpk-tidy`
- `/vpk-share`
- `/vpk-sync`
- `/vpk-component`
- `/vpk-component-ai`
- `/vpk-lesson`

> **Note:** Slash commands (e.g., `/vpk-deploy`) are Cursor IDE features. In other environments, reference the skill definitions in `.cursor/skills/` directly.

### Parallel Work Model

Choose one model based on communication needs:

| Mode        | Best for                                           | Coordination                              | Cost   |
| ----------- | -------------------------------------------------- | ----------------------------------------- | ------ |
| Subagents   | Independent tasks where only results matter        | Main agent coordinates                    | Lower  |
| Agent teams | Cross-area work needing direct teammate discussion | Shared task list + teammate collaboration | Higher |

Subagent rule:

- Always wait for all subagents before yielding results

### Agent Teams Management

Requires `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1`.

Controls:

- In-process mode: select teammate with Shift+Up/Down, toggle task list with Ctrl+T
- Split pane mode: set `"teammateMode": "tmux"`
- Delegate mode: Shift+Tab

Default team lifecycle:

```text
Explore -> Implement -> Test -> Tidy
```

Detailed ownership and phase guidance is in `## Appendix -> Agent Team Workflow Reference`.

### Behavioral Rules

- Verify exact file location before UI edits by searching for distinctive text/classes.
- Use macOS/BSD-safe shell patterns (for example `sed -i ''`).
- For Figma work, front-load key specs: spacing, radius, width constraints, shadow token.
- When editing icons, check consistency across all icons in the component.
- Prefer flexible AI-driven implementations over narrow hardcoded matching.
- Prefer the simplest viable implementation before introducing abstractions.
- If implementation gets unstable, stop and re-plan instead of patching repeatedly.
- Before completion, perform a staff-level quality gate: root-cause fixes, clean architecture, no band-aids.
- When fixing a bug, add a regression test that reproduces the original failure.

### Lessons Tracking

Maintain `AGENTS-LESSONS.md`:

- Append after every user correction
- Record prevention rule, not just the symptom
- Review at session start for relevant patterns
- Promote recurring lessons into this `AGENTS.md`

### Local Overrides

You can add gitignored local overrides:

```text
.cursor/skills/vpk-deploy/SKILL.local.md
.cursor/agents/vpk-agent-tidy.local.md
.claude.local.md
```

Note: `.claude.local.md` should be added to `.gitignore` if used for personal/local settings.

## Gotchas

- Only use Base UI menu primitives (`DropdownMenuItem`, `MenuPrimitive.Item`) inside a `Menu.Root`/`DropdownMenu` wrapper. For menu-item styling without menu context, use a plain `<button>` with Tailwind classes. <!-- added: 2026-02-10 -->
- Use `onSelect` (not `onClick`) on `DropdownMenuItem` — `onSelect` auto-closes the dropdown. <!-- added: 2026-02-10 -->
- For popups anchored to a trigger, use `Popover` from `components/ui/popover.tsx` with controlled `open`/`onOpenChange`. Don't hardcode `position: fixed` pixel offsets or manual backdrop divs. <!-- added: 2026-02-10 -->
- Worktree ports are deterministic; check with `pnpm ports`. <!-- added: 2026-02-08 -->
- Runtime port files: <!-- added: 2026-02-08 -->
  - `.dev-frontend-port`
  - `.dev-backend-port`
- Dev API calls traverse Next.js proxy then Express; debug both layers. <!-- added: 2026-02-08 -->
- Use functional state updates for toggles (`setX(prev => !prev)`). <!-- added: 2026-02-08 -->
- Derive render-only values inline; do not sync derived state via effects. <!-- added: 2026-02-08 -->
- **Default mode is RovoDev-first**: VPK expects `pnpm run rovodev` in a separate terminal. Chat endpoints return 503 when RovoDev Serve is unavailable unless `AUTO_FALLBACK_TO_AI_GATEWAY=true` is set and AI Gateway config is valid. <!-- updated: 2026-02-17 -->
- `pnpm run rovodev` + `pnpm run dev` (in separate terminals) is required to use chat functionality. If the chat gives unexpected answers or stale context, the RovoDev session may be corrupted — restart `pnpm run rovodev` for a fresh session. <!-- updated: 2026-02-19 -->
- No directories are excluded from TypeScript type-checking (only `node_modules`). All errors are visible and trackable. <!-- added: 2026-02-15 -->
- Always `await stop()` before calling `sendMessage()` in AI SDK `useChat` flows — `stop`, `sendMessage`, `regenerate`, and `resumeStream` share mutable internal state and must not be fire-and-forgotten in sequence. <!-- added: 2026-02-12 -->
- CSS `gap` doesn't transition away when a flex child collapses to `w-0`. Replace parent `gap-*` with transitioning `mr-*`/`ml-*` on the collapsible element (e.g., `mr-3` → `mr-0` alongside `w-0 opacity-0`). <!-- added: 2026-02-12 -->
- Never import transitive pnpm dependencies directly — pnpm's strict isolation only allows imports from `package.json` direct dependencies. Use internal mechanisms (e.g., `globalThis.__PLATFORM_FEATURE_FLAGS__`) or add the package explicitly. <!-- added: 2026-02-12 -->
- For ADS Toggle parity work, lock geometry before token polish: use ADS content-box geometry, keep the regular thumb at 12px, and use `@atlaskit/icon/core/check-mark` + `@atlaskit/icon/core/cross` (`size="small"`) wrapped in VPK `Icon`. <!-- added: 2026-02-16 -->
- On pages that render multiple Sonner demos, give each `<Toaster />` a unique `id` and pass matching `toasterId` in `toast.*` calls so a single action does not render through multiple toasters. <!-- added: 2026-02-16 -->

## Appendix

### Detailed Directory Structure

```text
app/
  api/                         # Dev-only proxy routes
  components/                  # Component docs routes
  contexts/                    # React Context providers
  data/                        # Component/example data files
  hooks/                       # App-level hooks
  preview/                     # Component preview routes (blocks, templates)
  providers.tsx                # Client-side provider composition
  [category]/page.tsx          # Category landing routes (ui, ui-ai, blocks, templates)
  [page routes]/               # agents-team/, confluence/, fullscreen-chat/, jira/, search/, sidebar-chat/
  layout.tsx                   # Root layout (server component)

backend/
  server.js                    # Express server (production runtime)
  lib/                         # Backend utilities
    agents-team-runs.js         # Agent team run manager (task tracking, SSE streaming)
    rovodev-gateway.js          # RovoDev Serve streaming/text bridge
    rovodev-client.js           # Low-level V3 REST + SSE client for rovodev serve

components/
  templates/                   # ADS-themed feature surfaces
    agents-team/               # Agent team interface
    confluence/                # Document editing
    fullscreen-chat/           # Full-screen AI chat
    jira/                      # Kanban board
    search/                    # Search results
    sidebar-chat/              # Chat with sidebar
    shared/                    # Shared template utilities (thread-message-bubble, message-turns)
  ui-ai/                       # AI element components (TS excluded)
  blocks/                      # Block features
    chat/                      # ADS-themed chat block
    chat-composer/             # ADS-themed chat composer block
  charts/                      # Chart components
  hooks/                       # Shared reusable hooks
  ui/                          # Shared UI primitives
  utils/                       # Utility components
  website/                     # Component docs/demo site

hooks/                         # Root-level shared hooks
lib/                           # Shared utilities (tokens, api-config, utils, rovo-suggestions, rovo-ui-messages)
rovo/                          # AI config
scripts/                       # Dev scripts
types/                         # TS declarations

public/
  1p/                          # First-party product logos (e.g. rovo.svg)
  3p/                          # Third-party integration logos (e.g. slack.svg, google-drive.svg)
  avatar-agent/                # Agent avatar variants
  avatar-human/                # Human avatar variants
  avatar-project/              # Project avatar variants
  avatar-user/                 # User avatar variants
  illustration/                # ADS rich-icon illustrations (gesture + standard variants)
  illustration-ai/             # AI-themed illustrations with light/dark variants
  illustration-spot/           # Spot illustrations

.cursor/                       # Cursor config
.claude/                       # Claude config
.codex/                        # Codex config
```

### Environment Variables

**RovoDev-first mode** — no `.env.local` configuration is required for chat when RovoDev Serve is running.

Optional environment variables:

- `DEBUG=true` - Enable verbose logging
- `PORT=8080` - Backend server port
- `BACKEND_URL=http://localhost:8080` - Backend URL for frontend
- `ROVODEV_PORT` - RovoDev Serve port (auto-set by `pnpm run rovodev`; do not set manually)
- `AUTO_FALLBACK_TO_AI_GATEWAY=true` - Allow chat endpoints to route to AI Gateway automatically when RovoDev Serve is unavailable
- `NEXT_PUBLIC_API_URL` - API URL for production builds

### Provider Reference

| Context         | File                                       | Purpose                                             |
| --------------- | ------------------------------------------ | --------------------------------------------------- |
| Chat panel      | `app/contexts/context-chat.tsx`            | Generic chat panel state                            |
| Rovo chat       | `app/contexts/context-rovo-chat-plan.tsx`  | AI chat via AI SDK `useChat` with streaming/widgets |
| Rovo chat ask   | `app/contexts/context-rovo-chat-ask.tsx`   | Non-agentic AI chat (plain markdown, no widgets)    |
| Sidebar         | `app/contexts/context-sidebar.tsx`         | Sidebar visibility and route                        |
| System prompt   | `app/contexts/context-system-prompt.tsx`   | Custom AI prompts                                   |
| Work item modal | `app/contexts/context-work-item-modal.tsx` | Work item detail modal using State/Actions/Meta     |
| Theme           | `components/utils/theme-wrapper.tsx`       | Light/dark/system mode                              |

### Skills Catalog

| Skill        | Command             | Type     | Purpose                                               |
| ------------ | ------------------- | -------- | ----------------------------------------------------- |
| Setup        | `/vpk-setup`        | Workflow | Initial setup: credentials, `.env.local`, dev servers |
| Deploy       | `/vpk-deploy`       | Workflow | Deploy to Atlassian Micros                            |
| Design       | `/vpk-design`       | Workflow | Figma to VPK implementation with validation           |
| Tidy         | `/vpk-tidy`         | Utility  | Refactor React components for reusability             |
| Share        | `/vpk-share`        | Utility  | Create/sync/reset GitHub repos from VPK               |
| Sync         | `/vpk-sync`         | Utility  | Pull upstream updates and push contributions          |
| Component    | `/vpk-component`    | Utility  | Map ADS components to VPK equivalents                 |
| Component AI | `/vpk-component-ai` | Utility  | Migrate custom AI components to ui-ai                 |
| Lesson       | `/vpk-lesson`       | Utility  | Log corrections to `AGENTS-LESSONS.md`                |

Available VPK agent:

- `vpk-agent-tidy` (React cleanup and modular refactoring)

Figma pipeline agents:

- `vpk-agent-extractor` (haiku)
- `vpk-agent-implementer` (sonnet)
- `vpk-agent-validator` (haiku)

### Agent Team Workflow Reference

Recommended role ownership:

| Phase     | Role                                     | Owns                              | Purpose                                  |
| --------- | ---------------------------------------- | --------------------------------- | ---------------------------------------- |
| Explore   | Explorer                                 | Read-only investigation           | Find patterns and scope files            |
| Implement | Frontend/Backend/Token/Docs implementers | Distinct file sets                | Deliver changes without conflicts        |
| Test      | Tester                                   | Validation tools + browser checks | Verify lint, type, visual, and a11y      |
| Tidy      | `vpk-agent-tidy`                         | Modified implementation files     | Enforce architecture and maintainability |

Team rules:

- Start with exploration
- Do not assign the same file to multiple implementers
- Tester reports issues back; does not apply fixes
- Run tidy last after validation passes

### Validation Template

Use this checklist in PR descriptions:

```markdown
## Validation

- [ ] ESLint passed (`pnpm run lint`)
- [ ] TypeScript passed (`pnpm tsc --noEmit`)
- [ ] Design token usage verified
- [ ] Imports resolved correctly
- [ ] Visual checks completed in light and dark mode
- [ ] Accessibility checks passed
```

### UI Verification Checklist

- [ ] Theme coverage (light + dark)
- [ ] State coverage (default, hover, active, disabled, empty, error)
- [ ] Content edge cases (long text, missing optional data, empty lists)
- [ ] Accessibility (semantic HTML, keyboard support, a11y analysis tools)
- [ ] Responsive behavior at narrow viewport widths
