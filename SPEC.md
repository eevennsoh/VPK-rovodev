# SPEC: Custom Skills & Custom Agents for Plan Template

## 1. Executive Summary

**Problem Statement:** The Plan template (`/plan`) has basic CRUD scaffolding for skills and agents, but the experience is shallow — skills are stored as flat text blobs in-memory, agents are simple config objects hardcoded in seed files, and neither follows industry standards. Users cannot create skills or agents that actually extend the main agent's capabilities in a meaningful, reusable way.

**Proposed Solution:** Replace the in-memory seed-based system with a filesystem-backed architecture that writes real [Agent Skills](https://agentskills.io) SKILL.md files and [Claude Code](https://code.claude.com/docs/en/sub-agents)-format agent .md files directly to `.rovodev/skills/` and `.rovodev/subagents/`. RovoDev Serve consumes these files natively as the agent runtime. The UI provides an AI-first creation flow via question cards, manual editing via modal dialogs, and import/export for portability.

**Success Criteria:**

1. A user can create a custom skill via the AI-assisted question card flow — the result is a valid SKILL.md directory in `.rovodev/skills/` conforming to the agentskills.io spec.
2. A user can create a custom agent with a model, tools (populated from MCP), and equipped skills — the result is a valid .md file in `.rovodev/subagents/` conforming to the Claude Code subagent spec.
3. Created skills are auto-equipped on the main agent. The main agent decides at runtime whether to use them based on task relevance.
4. All equipped skill content is injected into agent system prompts during plan execution.
5. Skills and agents persist as files on disk and survive server restarts.
6. Users can export skills/agents as portable files and import them via file picker or paste.

---

## 2. User Experience & Functionality

### User Personas

| Persona               | Description                                                                                                                                                                  |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Prototype Builder** | Internal developer using VPK to build AI-powered product prototypes. Wants to extend the plan agent with domain-specific knowledge (e.g., Jira workflow rules, code review standards). |
| **Demo Presenter**    | Someone demoing the Plan template to stakeholders. Needs to quickly create impressive skills/agents that visibly change agent behavior.                                      |
| **AI Tinkerer**       | Power user experimenting with different agent configurations, models, and skill combinations to optimize task execution quality.                                              |

### User Stories

#### Skills

| #  | Story | Acceptance Criteria |
| -- | ----- | ------------------- |
| S1 | As a user, I want to create a new skill via AI-guided question cards so the process is intuitive and the output is well-structured. | - Clicking "Add skill" enters AI-assisted creation mode. <br> - AI uses the existing `skill-development.md` guide to generate question cards. <br> - Question card replaces the chat composer input. <br> - AI determines the questions and card format (text inputs, radio options, etc.). <br> - After answers are collected, AI generates the SKILL.md and saves to `.rovodev/skills/{slug}/SKILL.md`. <br> - Skill appears in sidebar immediately. <br> - Skill is auto-equipped on the main agent (no confirmation needed). |
| S2 | As a user, I want to edit an existing skill via a modal dialog so I can iterate on its instructions. | - Clicking a skill in the sidebar opens the edit dialog pre-filled with current name, description, and content. <br> - Content field uses a Tiptap-powered markdown editor with a formatting toolbar (headers, bold, code blocks, lists). <br> - Changes are saved to disk via PUT endpoint. <br> - Inline field validation errors on save failure. |
| S3 | As a user, I want to type a human-readable name and have the slug auto-generated. | - Name field accepts free text (e.g., "Code Review"). <br> - Slug auto-generates below the field as a preview (e.g., `Slug: code-review`). <br> - Slug follows agentskills.io rules: lowercase alphanumeric + hyphens, 1–64 chars, no leading/trailing/consecutive hyphens. <br> - If slug already exists, show inline error: "A skill named code-review already exists." |
| S4 | As a user, I want to see which agents reference a skill so I understand the impact of changes. | - Skill edit dialog shows a read-only list of agents whose `skills` frontmatter includes this skill name. |
| S5 | As a user, I want to delete a custom skill with a clear warning about consequences. | - Delete button shows an alert modal warning which agents reference this skill. <br> - On confirm, the SKILL.md directory is deleted from disk. <br> - Agent .md files that reference the skill are NOT modified (orphan references are left for RovoDev to handle gracefully). |
| S6 | As a user, I want to import a skill from a SKILL.md file or pasted content. | - "Import" button in sidebar footer opens an import dialog. <br> - Two import methods: file picker (select a SKILL.md) and paste (raw SKILL.md content with frontmatter + body). <br> - System parses frontmatter, validates, and saves to `.rovodev/skills/{name}/SKILL.md`. |
| S7 | As a user, I want to export a skill as a portable SKILL.md file. | - Download icon button on each skill row in sidebar. <br> - Downloads the SKILL.md file directly. |

#### Agents

| #  | Story | Acceptance Criteria |
| -- | ----- | ------------------- |
| A1 | As a user, I want to create a custom agent via AI-guided question cards. | - Clicking "Add agent" enters AI-assisted creation mode. <br> - AI uses the existing `agent-development.md` guide to generate question cards. <br> - After answers are collected, AI generates the agent .md file and saves to `.rovodev/subagents/{name}.md`. <br> - Agent appears in sidebar immediately. |
| A2 | As a user, I want to manually edit an agent's configuration after AI generates it. | - After AI generates the config, user can switch to a modal dialog form to review and edit before saving. <br> - Dialog shows: name, description, system prompt (always visible, not hidden), model selector, tools, equipped skills, max turns, permission mode, disallowed tools. <br> - System prompt field is always prominently displayed. |
| A3 | As a user, I want to select tools from the MCP server's available tool list. | - Tool list is fetched from the Atlassian MCP server once at app startup and cached. <br> - Agent dialog shows available tools as selectable options from the MCP tool list. |
| A4 | As a user, I want to equip skills on an agent so it gains domain-specific knowledge. | - Checkbox list of all available skills (read from `.rovodev/skills/`) in the agent dialog. <br> - Selected skills are written to the agent's `skills` frontmatter field. <br> - All equipped skill content is injected into the agent's system prompt during execution (no selective filtering). <br> - Soft warning at 10+ skills equipped on a single agent (context window concern). |
| A5 | As a user, I want to duplicate an existing agent as a starting point. | - "Duplicate" action creates a copy with "(copy)" suffix in the name. <br> - New .md file saved to `.rovodev/subagents/`. |
| A6 | As a user, I want to export an agent as a portable .md file. | - Download icon button on each agent row in sidebar. <br> - Downloads the agent .md file directly. |
| A7 | As a user, I want to import an agent from a .md file or pasted content. | - "Import" button in sidebar footer. <br> - File picker + paste methods (same as skill import). |

### Non-Goals

- **Skill marketplace / registry** — No public publishing or browsing. Skills are local to `.rovodev/`.
- **Skill versioning / rollback** — No version history or diff view. Future consideration.
- **Multi-file skill authoring UI** — No UI for creating `scripts/`, `references/`, or `assets/` subdirectories. Users can add these manually on disk.
- **Agent-to-agent communication** — Agents execute independently.
- **Automated skill quality scoring** — Manual iteration only.
- **Isolated agent testing** — No mini-chat for testing a single agent. Users test agents via full plan execution.
- **Draft / session-scoped skills** — Skills persist globally on creation. No draft lifecycle.

---

## 3. AI System Requirements

### Skill Resolution at Runtime

When the orchestrator dispatches a task to an agent:

1. Read the agent's `skills` frontmatter field (list of skill names).
2. For each skill name, read the corresponding SKILL.md from `.rovodev/skills/{name}/SKILL.md`.
3. Inject ALL equipped skill content into the agent's system prompt (no selective filtering per task).
4. Format: wrap each skill in a clear delimiter:

```
--- Equipped Skill: {skill.name} ---
{skill.description}

{skill.content}
--- End Skill ---
```

### Skill Activation on Main Agent

When a new skill is created, it is auto-equipped on the main agent. No confirmation is shown — the main agent decides at runtime whether to use the skill based on task relevance. The user can manually unequip skills from the main agent via the agent edit dialog.

### AI-Assisted Creation Flow

The primary creation path uses the existing question card component:

1. User clicks "Add skill" or "Add agent" in the sidebar footer.
2. System enters creation mode (via `context-creation-mode.tsx`).
3. AI loads the appropriate guide (`custom/skill-development.md` or `custom/agent-development.md`).
4. AI generates question cards that replace the chat composer input.
5. The AI determines the question format (text inputs, radio options, etc.) based on the guide's instructions.
6. User answers the questions via the card UI.
7. AI generates the complete SKILL.md or agent .md file content.
8. User can switch to the modal dialog to manually review/edit before saving.
9. File is written to `.rovodev/skills/{slug}/SKILL.md` or `.rovodev/subagents/{name}.md`.

### Reasoning Stream: Skill Usage Visibility

During plan execution, when an agent uses equipped skills, the reasoning component shows a collapsible section:

- **Collapsed state:** Skill icon + skill name + first line of description.
- **Expanded state:** Full skill content that was injected into the agent's prompt.

This matches the existing pattern for tool call visibility in the reasoning stream.

### Evaluation Strategy

- **Skill activation accuracy**: Does the main agent select the right skill for a given task? Test with 10 representative prompts per skill.
- **Subagent task completion**: Does the agent complete assigned tasks using its equipped skills? Run 5 plan executions with custom agents.
- **Spec conformance**: All created skills must pass agentskills.io name/description validation rules.

---

## 4. Technical Specifications

### Architecture Overview

```
┌─────────────────────────────────────────────────────┐
│  Frontend (Next.js)                                 │
│                                                     │
│  PlanProvider (context-plan.tsx)              │
│    ├── usePlanConfig() ──── Read from disk API      │
│    ├── useConfigDialogs() ── Dialog state            │
│    └── useExecutionMode() ── Run orchestration       │
│                                                     │
│  UI Components:                                     │
│    ├── SkillDialog (edit form with Tiptap editor)   │
│    ├── AgentDialog (edit form with MCP tool list)   │
│    ├── SidebarFooter (lists + import/export)        │
│    └── Question Cards (AI-assisted creation)        │
│                                                     │
└──────────────────┬──────────────────────────────────┘
                   │ REST API (thin file proxy)
┌──────────────────▼──────────────────────────────────┐
│  Backend (Express) — Thin File I/O Layer            │
│                                                     │
│  Reads/writes directly to .rovodev/ filesystem:     │
│    ├── GET  /skills     → ls .rovodev/skills/       │
│    ├── POST /skills     → write SKILL.md to disk    │
│    ├── PUT  /skills/:id → update SKILL.md on disk   │
│    ├── DELETE /skills/:id → rm -rf skill directory  │
│    ├── GET  /agents     → ls .rovodev/subagents/    │
│    ├── POST /agents     → write .md to disk         │
│    ├── PUT  /agents/:id → update .md on disk        │
│    └── DELETE /agents/:id → rm agent .md file       │
│                                                     │
│  No in-memory state. Re-reads disk on every request.│
│                                                     │
│  RovoDev Gateway (unchanged)                        │
│    └── Streams agent responses via SSE              │
│                                                     │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│  .rovodev/ (Filesystem — Source of Truth)           │
│                                                     │
│  skills/ → symlink to .cursor/skills/               │
│    ├── code-review/                                 │
│    │   └── SKILL.md        (agentskills.io format)  │
│    ├── frontend-design/                             │
│    │   └── SKILL.md                                 │
│    └── ...                                          │
│                                                     │
│  subagents/ → renamed from agents/                  │
│    ├── visual-presenter.md (Claude Code format)     │
│    ├── code-reviewer.md                             │
│    └── ...                                          │
│                                                     │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│  RovoDev Serve (Agent Runtime)                      │
│                                                     │
│  Natively reads .rovodev/skills/ and subagents/     │
│  Executes agents with injected skill content        │
│  (Need to verify: auto-discovery vs restart)        │
│                                                     │
└─────────────────────────────────────────────────────┘
```

### File Formats

#### Skill Format (agentskills.io SKILL.md)

Storage path: `.rovodev/skills/{skill-name}/SKILL.md`

```yaml
---
name: code-review
description: Reviews code for quality issues, security vulnerabilities, and best practices. Use when the user asks to review code, check for bugs, or audit a pull request.
---

# Code Review

## When to use this skill
Use this skill when reviewing code for quality, security, or best practices...

## Steps
1. Read the target files
2. Analyze for common issues
3. Provide actionable feedback

## Examples
...
```

**Frontmatter fields (from agentskills.io spec):**

| Field           | Required | Constraints |
| --------------- | -------- | ----------- |
| `name`          | Yes      | 1–64 chars. Lowercase alphanumeric + hyphens only. No leading/trailing/consecutive hyphens. Must match parent directory name. |
| `description`   | Yes      | 1–1024 chars. Non-empty. Describes what the skill does and when to use it. |
| `license`       | No       | License name or reference. |
| `compatibility` | No       | Max 500 chars. Environment requirements. |
| `metadata`      | No       | Arbitrary key-value map. |
| `allowed-tools` | No       | Space-delimited list of pre-approved tools. |

#### Agent Format (Claude Code subagent .md)

Storage path: `.rovodev/subagents/{agent-name}.md`

```yaml
---
name: code-reviewer
description: Expert code review specialist. Reviews code for quality, security, and maintainability. Use when code changes need review.
tools: Read, Grep, Glob, Bash
model: sonnet
maxTurns: 20
skills:
  - code-review
  - security-audit
permissionMode: default
disallowedTools: Write, Edit
---

You are a senior code reviewer ensuring high standards of code quality and security.

When invoked:
1. Run git diff to see recent changes
2. Focus on modified files
3. Begin review immediately

Review checklist:
- Code is clear and readable
- No exposed secrets or API keys
- Input validation implemented
- Good test coverage
```

**Frontmatter fields (from Claude Code subagent spec):**

| Field             | Required | Description |
| ----------------- | -------- | ----------- |
| `name`            | Yes      | Unique identifier. Lowercase letters and hyphens. |
| `description`     | Yes      | When the orchestrator should delegate to this agent. |
| `tools`           | No       | Tools the agent can use. Inherits all if omitted. Populated from MCP server tool list. |
| `disallowedTools` | No       | Tools to deny (removed from inherited/specified list). |
| `model`           | No       | `sonnet`, `opus`, `haiku`, or `inherit`. Defaults to `inherit`. |
| `maxTurns`        | No       | Maximum agentic turns before stopping. |
| `skills`          | No       | Skill names to preload into context at startup. |
| `permissionMode`  | No       | `default`, `acceptEdits`, `dontAsk`, `bypassPermissions`, or `plan`. |

**Markdown body** = the agent's system prompt.

### Data Models (Frontend TypeScript)

Update `lib/plan-config-types.ts` to reflect the filesystem-backed model:

```typescript
// Skill — parsed from SKILL.md frontmatter + body
interface PlanSkill {
	name: string              // agentskills.io slug (also directory name)
	description: string       // agentskills.io: 1-1024 chars
	content: string           // Markdown body after frontmatter
	// Optional agentskills.io fields
	license?: string
	compatibility?: string
	metadata?: Record<string, string>
	allowedTools?: string
	// Derived
	isBuiltIn: boolean        // exists in repo's .cursor/skills/ (not user-created)
	filePath: string          // absolute path to SKILL.md
}

// Agent — parsed from Claude Code subagent .md frontmatter + body
interface PlanAgent {
	name: string              // slug identifier
	description: string
	systemPrompt: string      // markdown body (the system prompt)
	model: string             // "sonnet" | "opus" | "haiku" | "inherit"
	tools: string[]           // allowed tools
	disallowedTools?: string[]
	skills: string[]          // equipped skill names
	maxTurns?: number
	permissionMode?: string
	// Derived
	isBuiltIn: boolean        // e.g., vpk-agent-* files
	filePath: string          // absolute path to .md file
}

// Input types for creation
type PlanSkillInput = Pick<PlanSkill, "name" | "description" | "content">
type PlanAgentInput = Pick<PlanAgent, "name" | "description" | "systemPrompt" | "model" | "tools" | "skills"> & {
	disallowedTools?: string[]
	maxTurns?: number
	permissionMode?: string
}
```

### API Endpoints (Backend)

The backend becomes a thin filesystem proxy. No in-memory state. Re-reads from disk on every request.

**Skills:**

| Method | Path | Behavior |
| ------ | ---- | -------- |
| `GET` | `/api/plan/skills` | List all directories in `.rovodev/skills/`, parse each SKILL.md frontmatter + body, return as JSON array. |
| `POST` | `/api/plan/skills` | Validate input, create directory `.rovodev/skills/{name}/`, write SKILL.md with frontmatter + body. Return 409 if directory already exists. |
| `PUT` | `/api/plan/skills/:name` | Read existing SKILL.md, merge updates, write back. |
| `DELETE` | `/api/plan/skills/:name` | Delete the skill directory and all contents. |
| `GET` | `/api/plan/skills/:name/raw` | Return raw SKILL.md file content (for export). |

**Agents:**

| Method | Path | Behavior |
| ------ | ---- | -------- |
| `GET` | `/api/plan/agents` | List all .md files in `.rovodev/subagents/`, parse frontmatter + body, return as JSON array. |
| `POST` | `/api/plan/agents` | Validate input, write `.rovodev/subagents/{name}.md` with YAML frontmatter + markdown body. Return 409 if file already exists. |
| `PUT` | `/api/plan/agents/:name` | Read existing .md, merge updates, write back. |
| `DELETE` | `/api/plan/agents/:name` | Delete the .md file. |
| `GET` | `/api/plan/agents/:name/raw` | Return raw .md file content (for export). |

**MCP Tools:**

| Method | Path | Behavior |
| ------ | ---- | -------- |
| `GET` | `/api/plan/tools` | Fetch available tools from the MCP server. Cached at startup. |

### Storage Layout

```
.rovodev/
├── skills/ → symlink to .cursor/skills/
│   ├── code-review/
│   │   └── SKILL.md
│   ├── frontend-design/
│   │   └── SKILL.md
│   ├── vpk-component/
│   │   ├── SKILL.md
│   │   └── references/
│   │       ├── checklist-full.md
│   │       └── ...
│   └── ... (all existing + user-created skills)
│
├── subagents/ → renamed from agents/
│   ├── vpk-agent-extractor.md     (built-in, badge: "Built-in")
│   ├── vpk-agent-implementer.md   (built-in, badge: "Built-in")
│   ├── vpk-agent-validator.md     (built-in, badge: "Built-in")
│   ├── code-reviewer.md           (user-created)
│   └── ... (user-created agents)
│
├── hooks → symlink to .cursor/hooks
└── atlassian_connections.json
```

### Migration Plan (Clean Break)

Remove entirely:

| File | Reason |
| ---- | ------ |
| `backend/lib/plan-config.js` | In-memory config manager replaced by filesystem reads. |
| `backend/lib/plan-config-seed.js` | Seed data replaced by real SKILL.md / .md files on disk. |
| `lib/plan-config-seed.ts` | Frontend seed data no longer needed. |
| Persist endpoints (`POST /skills/:id/persist`, `POST /agents/:id/persist`) | No separate persistence step — files are written directly on create/update. |

Rename:

| From | To | Reason |
| ---- | -- | ------ |
| `.rovodev/agents/` (symlink) | `.rovodev/subagents/` | Align with Claude Code "subagents" terminology. Different AI platforms use different naming conventions; "subagents" is most accurate for delegated agents. |

### Security & Privacy

- **Input sanitization**: Skill content is markdown injected into LLM prompts. Length-bounded at 50,000 chars max for the `content` field.
- **Tool restrictions**: Agent `tools` field validated against the MCP server's available tool list.
- **Filesystem safety**: Backend validates that all file operations stay within `.rovodev/skills/` and `.rovodev/subagents/`. No path traversal.
- **No external network**: Skills are local-only. No data leaves the VPK instance beyond what the agent loop already does via RovoDev Serve.

---

## 5. UI Specifications

### Sidebar Footer

```
┌─────────────────────────────────────┐
│  Skills                        [+]  │  ← "+" opens AI-assisted creation
│  ├── code-review          [↓] [✎]  │  ← [↓] download, [✎] edit
│  ├── frontend-design      [↓] [✎]  │
│  ├── vpk-component        [↓] [✎]  │
│  └── ...                            │
│  [Import]                           │  ← Import button in footer
│                                     │
│  Agents                       [+]   │
│  ├── code-reviewer        [↓] [✎]  │
│  ├── vpk-agent-extractor  Built-in  │  ← Text badge for built-in
│  ├── vpk-agent-impl...   Built-in   │
│  └── ...                            │
│  [Import]                           │
└─────────────────────────────────────┘
```

- Skills and agents listed **alphabetically** by name.
- Built-in agents (vpk-agent-*) show a muted "Built-in" text badge.
- All items show a download icon button for export.
- Custom items show an edit button that opens the modal dialog.

### Skill Edit Dialog (Modal)

```
┌─────────────────────────────────────────────────┐
│  Edit Skill                              [×]    │
│                                                 │
│  Name                                           │
│  ┌─────────────────────────────────────────────┐│
│  │ Code Review                                 ││
│  └─────────────────────────────────────────────┘│
│  Slug: code-review                              │  ← auto-generated preview
│                                                 │
│  Description                                    │
│  ┌─────────────────────────────────────────────┐│
│  │ Reviews code for quality issues and...      ││
│  └─────────────────────────────────────────────┘│
│  23/1024 characters                             │
│                                                 │
│  Equipped by: code-reviewer, security-agent     │  ← read-only agent list
│                                                 │
│  Content                                        │
│  ┌─ B  I  H1 H2  ` ``` ─ • ──────────────────┐│  ← Tiptap toolbar
│  │ # Code Review                               ││
│  │                                              ││
│  │ ## When to use                               ││
│  │ Use this skill when...                       ││
│  │                                              ││
│  └─────────────────────────────────────────────┘│
│                                                 │
│         [Delete]              [Cancel]  [Save]  │
└─────────────────────────────────────────────────┘
```

- **Validation**: Inline field errors. Name uniqueness checked on blur. Description length shown with counter.
- **Delete**: Alert modal warns which agents reference this skill. File is deleted; agent .md files are not modified.

### Agent Edit Dialog (Modal)

```
┌─────────────────────────────────────────────────┐
│  Edit Agent                              [×]    │
│                                                 │
│  Name                                           │
│  ┌─────────────────────────────────────────────┐│
│  │ Code Reviewer                               ││
│  └─────────────────────────────────────────────┘│
│  Slug: code-reviewer                            │
│                                                 │
│  Description                                    │
│  ┌─────────────────────────────────────────────┐│
│  │ Expert code review specialist...            ││
│  └─────────────────────────────────────────────┘│
│                                                 │
│  System Prompt                                  │
│  ┌─────────────────────────────────────────────┐│
│  │ You are a senior code reviewer...           ││
│  │                                              ││
│  │ When invoked:                                ││
│  │ 1. Run git diff...                           ││
│  └─────────────────────────────────────────────┘│
│                                                 │
│  Model              ┌──────────────────────────┐│
│                     │ sonnet              ▾    ││
│                     └──────────────────────────┘│
│                                                 │
│  Max Turns           ┌────────┐                 │
│                      │ 20     │                 │
│                      └────────┘                 │
│                                                 │
│  Permission Mode    ┌──────────────────────────┐│
│                     │ default             ▾    ││
│                     └──────────────────────────┘│
│                                                 │
│  Allowed Tools      (from MCP server)           │
│  ┌─────────────────────────────────────────────┐│
│  │ ☑ Read  ☑ Grep  ☑ Glob  ☑ Bash            ││
│  │ ☐ Write  ☐ Edit  ☐ ...                     ││
│  └─────────────────────────────────────────────┘│
│                                                 │
│  Disallowed Tools                               │
│  ┌─────────────────────────────────────────────┐│
│  │ Write, Edit                                 ││
│  └─────────────────────────────────────────────┘│
│                                                 │
│  Equipped Skills    ⚠ 10+ skills may impact     │
│  ┌─────────────────────────────────────────────┐│  performance
│  │ ☑ code-review                               ││
│  │ ☑ security-audit                            ││
│  │ ☐ frontend-design                           ││
│  └─────────────────────────────────────────────┘│
│                                                 │
│  [Delete] [Duplicate]         [Cancel]  [Save]  │
└─────────────────────────────────────────────────┘
```

### Import Dialog

```
┌─────────────────────────────────────────────────┐
│  Import Skill                            [×]    │
│                                                 │
│  ┌─────────────────────────────────────────────┐│
│  │                                             ││
│  │    📄 Drop a SKILL.md file here             ││
│  │    or click to browse                       ││
│  │                                             ││
│  └─────────────────────────────────────────────┘│
│                                                 │
│  ── or paste SKILL.md content ──                │
│                                                 │
│  ┌─────────────────────────────────────────────┐│
│  │ ---                                         ││
│  │ name: code-review                           ││
│  │ description: Reviews code...                ││
│  │ ---                                         ││
│  │ # Code Review                               ││
│  │ ...                                         ││
│  └─────────────────────────────────────────────┘│
│                                                 │
│                        [Cancel]  [Import]        │
└─────────────────────────────────────────────────┘
```

### Delete Confirmation (Alert Modal)

```
┌─────────────────────────────────────────────────┐
│  ⚠ Delete "code-review"?                       │
│                                                 │
│  This skill is referenced by the following      │
│  agents:                                        │
│    • code-reviewer                              │
│    • security-agent                             │
│                                                 │
│  These agents will continue to reference this   │
│  skill, but it will no longer be available at   │
│  runtime.                                       │
│                                                 │
│                        [Cancel]  [Delete]        │
└─────────────────────────────────────────────────┘
```

---

## 6. Validation Rules

### Skill Name (from agentskills.io spec)

```typescript
const SKILL_NAME_REGEX = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/
const SKILL_NAME_MAX = 64
const NO_CONSECUTIVE_HYPHENS = /--/

function validateSkillName(name: string): string | null {
	if (!name) return "Name is required"
	if (name.length > SKILL_NAME_MAX) return "Name must be 64 characters or less"
	if (NO_CONSECUTIVE_HYPHENS.test(name)) return "Name cannot contain consecutive hyphens"
	if (!SKILL_NAME_REGEX.test(name)) return "Name must be lowercase letters, numbers, and hyphens only"
	return null
}
```

### Skill Description

```typescript
const SKILL_DESCRIPTION_MAX = 1024

function validateSkillDescription(desc: string): string | null {
	if (!desc) return "Description is required"
	if (desc.length > SKILL_DESCRIPTION_MAX) return "Description must be 1024 characters or less"
	return null
}
```

### Slug Generation

```typescript
function generateSlug(displayName: string): string {
	return displayName
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "")
		.replace(/-{2,}/g, "-")
		.slice(0, 64)
}
```

### Skill Content

```typescript
const SKILL_CONTENT_RECOMMENDED_MAX = 50_000 // chars (~12,500 tokens)
// Soft limit — show warning, don't block save
```

### Equipped Skills per Agent

```typescript
const SKILLS_PER_AGENT_SOFT_LIMIT = 10
// Show warning: "10+ equipped skills may impact agent performance due to context window usage"
```

---

## 7. Risks & Roadmap

### MVP Scope (All In)

All of the following are in scope for the MVP:

- AI-assisted skill/agent creation via question cards
- Manual editing via modal dialogs (Tiptap editor for skill content)
- Filesystem-backed persistence (`.rovodev/skills/` and `.rovodev/subagents/`)
- Clean break: remove old in-memory config manager, seed files, persist endpoints
- Rename `.rovodev/agents/` to `.rovodev/subagents/`
- SKILL.md export (download) and import (file picker + paste) for skills
- Agent .md export and import
- MCP tool list integration for agent tool selection
- Skill usage visibility in reasoning stream (collapsible section)
- Display name → auto-slug with preview
- Built-in agent badges in sidebar
- Alphabetical sidebar ordering
- Inline field validation errors
- Delete confirmation alert modal with agent reference warning
- agentskills.io-compliant validation
- Claude Code subagent-format agent files

### Post-MVP

| Feature | Description |
| ------- | ----------- |
| Multi-file skill authoring | UI for creating scripts/, references/, assets/ subdirectories |
| Agent testing mini-chat | Isolated single-agent testing without full plan execution |
| RovoDev auto-discovery verification | Test and document whether RovoDev Serve picks up new files without restart |
| Skill templates / starter library | Pre-built skill templates for common use cases |
| Agent collaboration patterns | Agent-to-agent handoff during plan execution |
| Skill usage analytics | Track which skills were activated and by which agents |
| Memory support | Persistent agent memory across sessions (user/project/local scopes) |

### Technical Risks

| Risk | Likelihood | Impact | Mitigation |
| ---- | ---------- | ------ | ---------- |
| Skill content too large for context window | Medium | High | Enforce 50K char soft limit; show warning at 5000+ tokens per agentskills.io recommendation |
| RovoDev Serve doesn't auto-discover new files | Medium | Medium | Test during implementation. Fallback: document restart requirement. |
| Symlink breakage on `.rovodev/skills/` → `.cursor/skills/` | Low | High | Validate symlink integrity on backend startup. |
| Agent with 10+ equipped skills degrades response quality | Medium | Medium | Soft warning at 10 skills per agent. Document context window trade-offs. |
| Concurrent file writes from multiple browser tabs | Low | Medium | Backend uses atomic write (write to temp file, rename). |

---

## 8. Implementation Blueprint

### Files to Remove

| File | Reason |
| ---- | ------ |
| `backend/lib/plan-config.js` | In-memory config manager. Replaced by filesystem reads. |
| `backend/lib/plan-config-seed.js` | Backend seed data. Replaced by real files in `.rovodev/`. |
| `lib/plan-config-seed.ts` | Frontend seed data. No longer needed. |

### Files to Modify

| File | Changes |
| ---- | ------- |
| `backend/server.js` | Replace config manager calls with direct filesystem reads/writes to `.rovodev/`. Remove persist endpoints. Add `/api/plan/tools` for MCP tool list. |
| `lib/plan-config-types.ts` | Update `PlanSkill` and `PlanAgent` interfaces to match SKILL.md / subagent .md formats. Add validation constants. Remove `id`, `createdAt`, `updatedAt` (use filesystem metadata). |
| `components/templates/plan/hooks/use-plan-config.ts` | Replace in-memory CRUD with API calls to filesystem-backed endpoints. Add slug generation. Add MCP tool list fetch at startup. |
| `components/templates/plan/hooks/use-config-dialogs.ts` | Update dialog handlers for new flow (AI-first creation, manual edit after). |
| `components/templates/plan/components/skill-dialog.tsx` | Add Tiptap editor for content field. Add display name → slug preview. Add "equipped by" agent list. Add inline validation. Update delete to use alert modal with agent reference warning. |
| `components/templates/plan/components/agent-dialog.tsx` | Add MCP tool list checkboxes. Add disallowedTools field. Add permissionMode dropdown. Add skills checkbox with soft limit warning. Add duplicate action. Update delete alert modal. |
| `components/templates/plan/components/sidebar-footer.tsx` | Add download button per item. Add import button. Add "Built-in" text badge for built-in agents. Sort alphabetically. |
| `components/templates/plan/components/config-dialogs.tsx` | Add import dialog component (file picker + paste). |

### Files to Create

| File | Purpose |
| ---- | ------- |
| `components/templates/plan/components/import-dialog.tsx` | Import dialog with file picker and paste textarea for SKILL.md / agent .md files. |
| `components/templates/plan/components/delete-alert.tsx` | Alert modal for delete confirmation showing affected agent references. |

### Open Questions

| # | Question | Owner | Status |
| - | -------- | ----- | ------ |
| 1 | Does RovoDev Serve auto-discover new skills/agents when files are added to `.rovodev/`, or does it require a restart? | Backend | Needs testing |
| 2 | Is Tiptap already installed in the VPK project dependencies? If so, which package (`@tiptap/react`, `@tiptap/starter-kit`, etc.)? | Frontend | Needs verification |
| 3 | What is the exact MCP endpoint/method to fetch the available tool list from the Atlassian MCP server? | Backend | Needs investigation |
| 4 | After renaming `.rovodev/agents/` to `.rovodev/subagents/`, does the symlink target also need updating? Current symlink points to `.cursor/agents/`. | Infra | Needs decision |
