# VPK (Venn Prototype Kit)

> Provider-neutral project context for AI coding assistants (Cursor, Claude Code, Codex, and others).
> Skills are defined in `.cursor/skills/`. Agents are defined in `.cursor/agents/`.

Next.js 16 (React 19, Tailwind CSS v4) + Express backend with AI SDK (Vercel) and RovoDev Serve integration.

## Start Here

- Read this file top-to-bottom once. For details, use the Appendix sections.
- Quick start:
  - `pnpm install`
  - `pnpm run dev`
- Local runtime uses three processes: RovoDev Serve + Express backend + Next.js frontend proxy.
- Production runtime uses one Express process serving static export plus `/api/*`.
- Primary frontend edits are in `components/templates/`, `components/blocks/`, and `app/` route files.
- Backend API edits are in `backend/server.js` and `app/api/*/route.ts` (dev proxy).
- Validate every change with `pnpm run lint` and `pnpm tsc --noEmit`.
- For UI changes, also run visual + accessibility checks (see `## Workflows (Extended) -> Validation`).

## Documentation Index

Prefer reading these references over relying on pre-trained knowledge.

**Project References** — local files in the repo:

| When you need...                       | Read                                                        |
| -------------------------------------- | ----------------------------------------------------------- |
| Component architecture rules           | `.cursor/skills/vpk-tidy/SKILL.md`                          |
| React patterns reference (1000+ lines) | `.cursor/skills/vpk-tidy/references/patterns.md`            |
| Design token catalog (200+ tokens)     | `.cursor/skills/vpk-design/references/tokens.md`            |
| Token selection priority               | `.cursor/rules/token-priority.md`                           |
| Figma-to-code pipeline                 | `.cursor/skills/vpk-design/SKILL.md`                        |
| Deployment guide                       | `.cursor/skills/vpk-deploy/references/guide-deployment.md`  |
| Setup walkthrough                      | `.cursor/skills/vpk-setup/references/guide-setup.md`        |
| Motion + Base UI animation             | `.cursor/rules/motion-base-ui.md`                           |
| Motion for React rules                 | `.cursor/rules/motion-react.md`                             |
| Session corrections log                | `AGENTS-LESSONS.md`                                         |
| AI SDK chat integration                | `rovo/config.js`, `app/contexts/context-rovo-chat.tsx`      |
| AI Gateway helpers                     | `backend/lib/ai-gateway-helpers.js`                         |
| RovoDev Serve gateway (agent loop)     | `backend/lib/rovodev-gateway.js`, `backend/lib/rovodev-client.js` |
| Agent team run types                   | `lib/plan-run-types.ts`                              |
| Agent team run manager                 | `backend/lib/plan-runs.js`                           |
| UI message types and data parts        | `lib/rovo-ui-messages.ts`                                   |
| Architecture overview                  | `.cursor/docs/architecture-overview.md`                     |
| Extended workflows                     | `.cursor/docs/workflows-extended.md`                        |
| Agent operations                       | `.cursor/docs/agent-operations.md`                          |
| Appendix (dir structure, env vars)     | `.cursor/docs/appendix.md`                                  |

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
2. This file
3. Tool/runtime constraints
4. Skill-specific docs (for the chosen skill)
5. Supplemental references in Appendix

### Rule Sources

- Cursor rules: `.cursor/rules/*.mdc`
- Claude rules: `.claude/rules/*.md` (symlinks to `.cursor/rules/`)
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

## Workflows

### Development

- Install dependencies: `pnpm install`
- First-time MCP setup: `acli rovodev` (interactive, approve MCP servers, then Ctrl+C)
- Start everything: `pnpm run rovodev` (starts 1 rovodev serve instance + backend + frontend; use `pnpm run rovodev -- 6` for full pool)
- Start frontend + backend only: `pnpm run dev` (requires rovodev serve already running)
- Start frontend only: `pnpm run dev:frontend`
- Start backend only: `pnpm run dev:backend`
- Start with tmux (8 panes): `pnpm run rovodev:tmux`

## Gotchas

- Worktree ports are deterministic; check with `pnpm ports`.
- Runtime port files: `.dev-frontend-port`, `.dev-backend-port`
- Dev API calls traverse Next.js proxy then Express; debug both layers.
- No directories are excluded from TypeScript type-checking (only `node_modules`). All errors are visible and trackable.
- Never import transitive pnpm dependencies directly — pnpm's strict isolation only allows imports from `package.json` direct dependencies. Use internal mechanisms (e.g., `globalThis.__PLATFORM_FEATURE_FLAGS__`) or add the package explicitly.

> Additional gotchas load automatically from `.claude/rules/` when editing matching files:
> - `gotchas-ui.md` — Base UI menus, Popover, Toggle, Sonner (when editing `components/**`)
> - `gotchas-chat.md` — RovoDev mode, session corruption, AI SDK (when editing chat/backend files)
> - `gotchas-react.md` — state updates, derived state, CSS gap (when editing `*.tsx`)

## Architecture

Architecture overview including runtime modes, key directories, component topology, provider composition, and route overview.

@.cursor/docs/architecture-overview.md

> API endpoints and chat architecture load as contextual rules when editing backend or chat files.
> See `.cursor/rules/api-surfaces.md` and `.cursor/rules/chat-architecture.md`.

## Workflows (Extended)

Build, deployment, and validation workflows.

@.cursor/docs/workflows-extended.md

## Agent Operations

Skills, parallel work model, agent teams, behavioral rules, and lessons tracking.

@.cursor/docs/agent-operations.md

## Appendix

Directory structure, environment variables, provider reference, skills catalog, team workflow reference, and validation checklists.

@.cursor/docs/appendix.md

## Contextual Rules

The following `.cursor/rules/` files load automatically when editing matching file patterns (Claude Code reads them via `.claude/rules/` symlinks):

| Rule file | Loads when editing | Content |
| --- | --- | --- |
| `token-priority.md` | `components/**/*.tsx`, `app/**/*.tsx`, `*.css` | Token selection, theming, motion tokens |
| `component-architecture.md` | `components/**/*.tsx`, `app/contexts/**/*.tsx` | Context pattern, compound components, CVA |
| `chat-architecture.md` | `context-rovo-chat.tsx`, `backend/server.js`, `rovodev-*.js`, `rovo/**` | AI SDK, useChat, RovoDev, data parts |
| `api-surfaces.md` | `backend/server.js`, `app/api/**/*.ts`, `backend/lib/*.js` | All endpoint listings |
| `gotchas-ui.md` | `components/**/*.tsx` | Base UI menus, Popover, Toggle, Sonner |
| `gotchas-chat.md` | `context-rovo-chat.tsx`, `rovodev-*.js` | RovoDev mode, session, message deletion |
| `gotchas-react.md` | `**/*.tsx` | State updates, derived state, CSS gap |
| `motion-base-ui.md` | `*.tsx`, `*.jsx` | Animating Base UI with Motion |
| `motion-react.md` | `*.tsx`, `*.jsx` | Motion for React patterns |
