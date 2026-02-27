# Product Requirements Document: Plan Mode Experience in Maker Template

## 1. Executive Summary

**Problem Statement:**
The Maker template currently lacks a structured planning experience. While it has a basic plan mode toggle, there is no integrated workflow for users to systematically break down projects, receive clarifying questions, generate actionable plans with dependency visualization, execute tasks across parallel subagents, and receive a creative summary of results.

**Proposed Solution:**
Build a comprehensive end-to-end Plan Mode experience in the Maker template (`/preview/templates/maker`) that covers the full lifecycle: plan mode default ON -> clarifying questions via RovoDev's `ask_user_questions` tool -> plan generation with Streamdown rendering and Mermaid diagrams -> parallel subagent execution via `invoke_subagents` -> progressive bento box summary view. The plan is presented as a tabbed generative card (Plan tab with Streamdown markdown, Tasks tab with structured checklist from `update_todo`), with a full-screen modal preview and direct "Build" CTA that immediately triggers dependency-ordered parallel execution across 1-4 RovoDev subagent ports.

**Success Criteria:**
1. Plan mode toggle defaults to ON on Maker page load
2. RovoDev's `ask_user_questions` tool surfaces clarifying questions via the existing question card UI
3. Plans render as single markdown documents via Streamdown in a growing generative card with AI-authored Mermaid diagrams
4. Plan card has tabbed view: Plan (Streamdown) and Tasks (structured checklist from `update_todo`)
5. "Build" CTA immediately triggers parallel execution (no approval step); "Open preview" opens full-screen modal
6. Execution grid shows 1-4 subagent panes with full agent transcripts, dynamic grid resizing, and dependency-ordered task distribution
7. Progressive bento box summary view with masonry-laid GenUI cards as agents complete

---

## 2. User Experience & Functionality

### 2.1 User Personas

- **Builders/Makers**: Developers who want to systematically plan app features before building
- **Architects**: Technical leads who need to visualize project structure and dependencies
- **Teams**: Collaborative makers who benefit from structured planning artifacts

### 2.2 User Stories

**Story 1: Default Plan Mode**
```
As a maker visiting /preview/templates/maker,
I want plan mode to be activated by default,
So that my first message triggers a structured planning workflow.
```

**Acceptance Criteria:**
- Plan mode toggle defaults to ON when Maker page loads
- Initial view is identical to the current Maker view; only the plan toggle state is different
- When plan mode is ON, user messages go through the plan workflow (clarification -> plan generation)
- When toggled OFF, RovoDev decides its own response behavior (no forced plan)
- Toggle only affects the next message sent; existing plan cards are not dismissed

**Story 2: Clarifying Questions**
```
As a maker, I want the AI to ask me clarifying questions when my request is unclear,
So that the generated plan is contextual and accurate.
```

**Acceptance Criteria:**
- RovoDev's `ask_user_questions` tool (replaces the previous `request_user_input` tool) surfaces questions via the existing question card UI component
- Clarification is a soft guideline: the AI is encouraged to ask when unclear and can ask multiple times, but is not forced to ask before every plan
- Questions can appear at any point in the workflow (before initial plan, during revision, etc.)
- Composer is locked (disabled) while clarification questions are displayed; user must answer or dismiss before typing
- Answers are retained in the chat context for subsequent interactions

**Story 3: Plan Generation & Streaming**
```
As a maker, I want my plan streamed into the chat as a formatted card,
So that I can read it in real-time and understand the proposed approach.
```

**Acceptance Criteria:**
- `create-plan` generates a single continuous markdown document containing: intent, scope, action items, open questions, and an AI-authored Mermaid dependency diagram
- Plan streams into a growing generative card (card starts small, grows with smooth height animation as content arrives)
- Streamdown renders all markdown: headings, lists, code blocks, emphasis, and Mermaid diagram code blocks
- Existing Streamdown + Mermaid plugin handles rendering and light/dark theme adaptation
- If user cancels streaming (stop button), partial content is kept as-is

**Story 4: Tabbed Plan Card**
```
As a maker reviewing my plan, I want to see both the formatted plan and a structured task checklist,
So that I can understand the approach and the discrete work items.
```

**Acceptance Criteria:**
- Plan card has two tabs: "Plan" and "Tasks"
- Plan tab: Streamdown-rendered markdown body (intent, scope, Mermaid diagram, etc.)
- Tasks tab: Structured read-only checklist populated by a separate `update_todo` tool call that the AI makes after `create-plan`
- Tasks are read-only (no user editing, reordering, or selection)
- Card footer has two CTAs: primary "Build" button and secondary "Open preview" icon/button

**Story 5: Plan Revision**
```
As a maker, I want to iterate on my plan by sending follow-up messages,
So that the plan reflects my evolving requirements.
```

**Acceptance Criteria:**
- Follow-up messages while in plan mode trigger a new plan workflow (the AI may ask clarifying questions again, then generates a new plan)
- The previous plan card collapses to a bubble in the chat thread
- Collapsed plan cards can be expanded to access their CTAs (Build button remains functional)
- Only the latest plan is the primary actionable one
- Non-plannable requests (e.g., "tell me a joke") receive a text-only fallback response, no plan card

**Story 6: Full-Screen Plan Preview**
```
As a maker, I want to open my plan in a full-screen modal for easier reading,
So that I can review long plans without scrolling the chat.
```

**Acceptance Criteria:**
- "Open preview" CTA opens a full-screen modal
- Modal mirrors the inline card's tabbed layout (Plan / Tasks) at a larger size
- Modal has a "Build" button (same behavior as inline Build)
- Modal has a close button to return to the chat view

**Story 7: Immediate Build Execution**
```
As a maker satisfied with my plan, I want to click Build and immediately start execution,
So that I can see my plan being implemented in parallel.
```

**Acceptance Criteria:**
- "Build" CTA immediately triggers subagent execution (no approval/confirm step)
- The existing plan approval flow (approve/revise/reject) is removed; Build is the sole action
- Subagent count is determined by the composer toolbar dropdown (1x-4x, default 1x)
- Execution uses `invoke_subagents` via a single RovoDev call; RovoDev distributes tasks internally
- Each subagent runs on a separate RovoDev Serve port
- Tasks are distributed in dependency order (prerequisites must complete before dependents start)

**Story 8: Parallel Execution Grid**
```
As a maker during execution, I want to see each subagent's live progress,
So that I can monitor what's being built in real-time.
```

**Acceptance Criteria:**
- Execution view replaces the Make tab content (same-tab content swap)
- Plan card collapses/hides; sidebar AgentsProgress component tracks overall progress
- Grid layout is responsive: 1 agent = full-width, 2 = 2 columns, 3 = 2+1, 4 = 2x2
- Grid dynamically resizes to show only active agent panes (idle/waiting agents are not shown)
- Each pane shows the full agent transcript (reasoning, tool calls, outputs) streaming in real-time
- Subagents are identified by task-derived names (e.g., "API Agent", "Frontend Agent")
- On mobile/narrow viewports, panes stack vertically

**Story 9: Error Recovery During Execution**
```
As a maker, I want failed tasks to be automatically retried and dependent tasks paused,
So that I don't lose all progress when one task fails.
```

**Acceptance Criteria:**
- Failed tasks auto-retry up to 2 times (3 total attempts)
- After 3rd failure, task is marked as failed and downstream dependent tasks are paused
- Independent tasks continue executing on other subagents
- User can cancel all subagents at once; partial results from completed tasks are shown

**Story 10: Progressive Bento Box Summary**
```
As a maker after execution, I want to see a creative summary of results,
So that I can review what was built at a glance.
```

**Acceptance Criteria:**
- Summary generates progressively as subagents complete (not waiting for all to finish)
- Results are displayed in a masonry-layout bento box view with varying card sizes based on content priority
- Each result is a GenUI card; content varies per result: text, UI components, images, audio, or combinations
- The bento view replaces the execution grid in the Make tab
- Plan is considered done after execution; user starts fresh via the sidebar's "New chat" button which resets to the initial composer view

### 2.3 Non-Goals

- Home tab content (remains placeholder)
- Search tab content (remains placeholder)
- Work items integration (future: plan tasks may become trackable work items)
- Persistent plan storage (plans are session-scoped)
- Integration with Jira or external PM tools (separate feature)
- Real-time collaborative planning (future enhancement)
- Plan versioning or audit logs (future enhancement)
- User-editable/reorderable tasks in the Tasks tab (tasks are read-only)

---

## 3. AI System Requirements

### 3.1 Tool Requirements

| Tool | Source | Purpose | Integration Point |
|------|--------|---------|-------------------|
| `ask_user_questions` | RovoDev native | Clarifying questions at any point | Chat flow; surfaces via existing question card UI |
| `create-plan` | Skill | Plan generation as single markdown document | After user provides context; streams into generative card |
| `update_todo` | RovoDev native | Organize plan steps into structured checklist | Separate call after `create-plan`; populates Tasks tab |
| `invoke_subagents` | RovoDev native | Launch 1-4 parallel subagents for execution | Triggered by Build CTA; distributes tasks with dependency ordering |
| `exit_plan_mode` | RovoDev native | Signal plan-to-build transition | Internal signal; not user-facing |
| Streamdown | Library (existing) | Render streaming markdown with Mermaid | Plan tab content rendering |

### 3.2 System Prompt Guidelines

The `MAKER_MODE_CONTEXT_DESCRIPTION` should be updated to use softer language:

```
Plan mode is enabled.
When the user's request is unclear or could benefit from clarification, use the ask_user_questions tool to ask 2-4 clarifying questions.
You can ask clarifying questions at any point — before initial planning, during revision, or when the user adds new requirements.
If the request is already specific enough, you may proceed directly to generating a plan.
After gathering sufficient context, use the create-plan skill to generate a comprehensive plan as a single markdown document.
Include a Mermaid diagram in the plan showing task dependencies.
After generating the plan, call update_todo to organize tasks into a structured checklist.
Do not finish without generating a plan widget with a concrete task list.
```

### 3.3 Evaluation Strategy

**Plan Quality Metrics:**
- Plan includes all required sections: intent, scope, action items, open questions
- Action items are atomic and verb-first ("Add...", "Refactor...", "Test...")
- Scope clearly defines in/out boundaries
- Mermaid diagram is syntactically valid and shows meaningful dependencies
- Dependencies are logically ordered (prerequisites before dependents)

**Execution Quality:**
- `ask_user_questions` tool completes without errors; surfaces via question card UI
- `create-plan` generates output in < 30 seconds for typical requests
- Streamdown renders all markdown sections including Mermaid without parsing errors
- `update_todo` organizes tasks into 5-15 item checklist
- `invoke_subagents` successfully distributes tasks across N subagent ports
- Auto-retry handles transient failures within 3 attempts

**User Experience Quality:**
- Growing card animation is smooth and non-janky
- Modal opens/closes without layout shift
- Plan text is readable with proper contrast in light/dark modes
- CTAs are discoverable and clearly labeled (Build primary, Preview secondary)
- Bento box summary renders progressively without layout thrashing

---

## 4. Technical Specifications

### 4.1 Architecture Overview

```
End-to-End Plan Mode Workflow:

User enters /preview/templates/maker
    |
Plan Mode defaults to ON (plan toggle active)
    |
User types prompt + sends (composer has Plan toggle + 1x-4x dropdown)
    |
Same SSE chat stream handles all communication
    |
[Optional] AI calls ask_user_questions -> Question card UI -> User answers -> Composer unlocks
    |
AI calls create-plan -> Single markdown doc streams into growing generative card (Plan tab)
    |
AI calls update_todo -> Structured checklist populates Tasks tab
    |
User sees tabbed card: Plan | Tasks
User sees CTAs: [Build] (primary) [Preview] (secondary)
    |
(Preview) -> Full-screen modal with same Plan/Tasks tabs + Build button
    |
(Build) -> Immediate execution (no approval step)
    |
invoke_subagents called with plan + subagent count (from 1x-4x dropdown)
RovoDev distributes tasks in dependency order
Each subagent gets its own RovoDev Serve port
    |
Execution grid replaces Make tab content
Responsive grid: 1=full, 2=2col, 3=2+1, 4=2x2
Dynamic resize: only active agents shown
Each pane: full agent transcript streaming
Sidebar: AgentsProgress component shows overall progress
    |
Auto-retry failed tasks (up to 2 retries, 3 total)
Pause downstream tasks on persistent failure
    |
As agents complete -> Progressive bento box summary (masonry GenUI cards)
    |
Plan done -> New chat via sidebar to start fresh
```

### 4.2 Component Architecture

**Existing Components (Enhanced):**

1. **MakerInitialView** (`maker-initial-view.tsx`)
   - No visual changes; plan mode toggle defaults to ON via `useMakerChat`

2. **MakerComposer** (`maker-composer.tsx`)
   - Add 1x-4x subagent count toolbar dropdown (always visible, default 1x)
   - Lock composer when clarification questions are active
   - Plan toggle remains with same behavior

3. **Question Card** (existing shared component)
   - Reuse as-is; wire to RovoDev `ask_user_questions` tool output instead of `request_user_input`

4. **Generative Widget Card** (existing, enhanced)
   - Add tabbed view: Plan tab (Streamdown body) + Tasks tab (read-only checklist)
   - Growing card animation during streaming
   - Footer CTAs: primary "Build" button + secondary "Open preview"
   - Collapsed state: chat bubble with plan title; expandable to access CTAs

5. **ExecutionGridView** (`execution-grid-view.tsx`, enhanced)
   - Responsive grid layout (1/2/2+1/2x2)
   - Dynamic resize: only render panes for active agents
   - Each pane streams full agent transcript
   - Pane header shows task-derived agent name (e.g., "API Agent")
   - Vertical stack on narrow viewports

6. **AgentsProgress** (`components/blocks/agent-progress/page.tsx`)
   - Used in sidebar to show task checklist, progression, and status during execution

**New Components:**

7. **Plan Preview Modal**
   - Full-screen modal overlay
   - Mirrors inline card's Plan/Tasks tabbed layout at larger size
   - "Build" button in modal footer
   - Close button to return to chat

8. **Bento Box Summary View**
   - Masonry layout with priority-based sizing
   - Each cell is a GenUI card
   - Content varies: text, UI components, images, audio, or combinations
   - Progressive rendering as agents complete
   - Replaces execution grid when execution finishes

9. **Subagent Count Dropdown**
   - Compact toolbar dropdown in composer
   - Options: 1x, 2x, 3x, 4x
   - Default: 1x
   - Always visible, even before plan exists

### 4.3 Integration Points

**Frontend:**

| File | Change |
|------|--------|
| `app/contexts/context-maker.tsx` | Default `isPlanMode` to `true`; add `subagentCount` state; remove approval flow (`handleApprovalSubmit`); add `handleBuild` action |
| `components/templates/maker/lib/maker-mode.ts` | Update system prompt to softer clarification language |
| `components/templates/maker/components/maker-composer.tsx` | Add 1x-4x dropdown; lock composer during active question cards |
| `components/templates/maker/components/maker-chat-view.tsx` | Render tabbed plan cards; handle collapsed plan states |
| `components/templates/maker/components/execution-grid-view.tsx` | Dynamic resize; task-derived agent names; responsive grid |
| `components/templates/maker/page.tsx` | Wire bento summary view after execution completion |
| NEW: `components/templates/maker/components/plan-preview-modal.tsx` | Full-screen plan preview |
| NEW: `components/templates/maker/components/bento-summary-view.tsx` | Masonry GenUI summary |

**Backend:**

Recommended approach: **Transparent proxy** — the backend proxies RovoDev tool calls directly through the existing SSE chat stream. The frontend interprets tool-call events (`ask_user_questions`, `create-plan`, `update_todo`, `invoke_subagents`) and renders accordingly. This avoids duplicating tool-specific logic in the backend and keeps the backend as a clean pass-through to RovoDev.

| Endpoint | Role |
|----------|------|
| Existing chat SSE stream | Proxies all plan-related tool calls (ask_user_questions, create-plan, update_todo) |
| Existing run endpoints | Manage execution runs; each subagent is a separate RovoDev Serve port |
| NEW: Subagent stream endpoints | One SSE connection per subagent port for streaming agent transcripts |

**Libraries:**
- `streamdown` (existing): Render markdown with streaming support
- Mermaid plugin (existing in Streamdown setup): Render AI-authored dependency diagrams
- `ask_user_questions` tool: RovoDev native; replaces previous `request_user_input`

### 4.4 Data Flow

```
1. Clarification Phase:
   User sends prompt
   -> Backend proxies to RovoDev via SSE
   -> RovoDev calls ask_user_questions tool
   -> SSE event with question card payload -> Frontend renders question card UI
   -> Composer locked
   -> User answers -> Frontend sends answers via SSE
   -> Composer unlocked

2. Plan Generation Phase:
   RovoDev calls create-plan skill
   -> Markdown streams via SSE -> Frontend renders growing Streamdown card (Plan tab)
   -> RovoDev calls update_todo
   -> Structured task list sent via SSE -> Frontend populates Tasks tab
   -> Card footer shows Build + Preview CTAs

3. Execution Phase:
   User clicks Build
   -> Frontend sends invoke_subagents request with plan + subagent count
   -> RovoDev distributes tasks across N subagent ports (dependency-ordered)
   -> Frontend opens N SSE connections (one per subagent port)
   -> Each pane in grid receives its agent's transcript stream
   -> Failed tasks auto-retry (up to 2x); downstream tasks pause on persistent failure

4. Summary Phase:
   As each subagent completes -> RovoDev returns result payload
   -> Frontend progressively adds GenUI cards to masonry bento view
   -> Grid transitions to bento summary as agents finish
   -> Final state: masonry layout with all result cards
```

### 4.5 State Machine

```
PLAN_MODE_STATES:

  IDLE (initial)
    -> User sends message with plan mode ON -> CLARIFYING | GENERATING
    -> User sends message with plan mode OFF -> CHAT (RovoDev decides)

  CLARIFYING
    -> Question card displayed, composer locked
    -> User answers -> GENERATING | CLARIFYING (another round)
    -> User dismisses -> GENERATING (AI proceeds with available context)

  GENERATING
    -> create-plan streaming markdown -> PLAN_READY (when stream completes + update_todo returns)
    -> User cancels streaming -> PLAN_PARTIAL (partial content kept)

  PLAN_PARTIAL
    -> User sends follow-up -> CLARIFYING | GENERATING (new plan replaces partial)

  PLAN_READY
    -> User clicks Build -> EXECUTING
    -> User clicks Preview -> PREVIEWING (modal open, state unchanged)
    -> User sends follow-up -> CLARIFYING | GENERATING (old plan collapses)

  PREVIEWING
    -> User clicks Build in modal -> EXECUTING (modal closes)
    -> User closes modal -> PLAN_READY

  EXECUTING
    -> Subagents running, grid visible
    -> Auto-retry on failure (up to 3 total attempts)
    -> Downstream pause on persistent failure
    -> User cancels -> SUMMARY (show partial results)
    -> All agents complete -> SUMMARY

  SUMMARY
    -> Bento box summary view displayed
    -> User clicks "New chat" in sidebar -> IDLE (reset)
```

### 4.6 Security & Privacy

- All plan content is session-scoped; no persistent storage
- `ask_user_questions` responses are retained only in chat context; not logged separately
- Plan text is standard markdown; Streamdown sanitizes rendering
- Mermaid diagram syntax validated by the Streamdown Mermaid plugin before rendering
- Subagent execution is scoped to the user's session and RovoDev instance
- User can cancel execution at any time; partial results are surfaced, not discarded

---

## 5. UI Specifications

### 5.1 Composer Toolbar

```
┌──────────────────────────────────────────┐
│  Describe what you want to build...      │
│                                          │
│                                          │
├──────────────────────────────────────────┤
│ [Plan v] [1x v]                 [> Send] │
└──────────────────────────────────────────┘

- Plan toggle: defaults ON; toggles plan mode for next message
- 1x dropdown: options 1x, 2x, 3x, 4x; default 1x; always visible
- Send button: standard submit
- Composer locks (disabled) when question card is active
```

### 5.2 Plan Card (Tabbed)

```
┌──────────────────────────────────────────┐
│  [Plan] [Tasks]                          │  <- Tab bar
├──────────────────────────────────────────┤
│                                          │
│  (Plan tab: Streamdown markdown)         │
│  ## Intent                               │
│  Build a CRUD app for task management... │
│                                          │
│  ## Scope                                │
│  - In: API, Frontend, Auth               │
│  - Out: Mobile, Analytics                │
│                                          │
│  ## Dependencies                         │
│  ```mermaid                              │
│  graph TD                                │
│    A[API Design] --> B[API Impl]         │
│    A --> C[Frontend Shell]               │
│    B --> D[Integration Tests]            │
│    C --> D                               │
│  ```                                     │
│                                          │
│  (Tasks tab: structured checklist)       │
│  ☐ Design API schema                     │
│  ☐ Implement API endpoints               │
│  ☐ Build frontend shell                  │
│  ☐ Write integration tests               │
│                                          │
├──────────────────────────────────────────┤
│                   [Preview]  [■ Build]   │  <- Footer CTAs
└──────────────────────────────────────────┘

- Growing card: starts small, height animates as content streams
- Primary CTA: Build (filled button)
- Secondary CTA: Preview (ghost/icon button)
```

### 5.3 Collapsed Plan Card

```
┌──────────────────────────────────────────┐
│  📋 Build a CRUD app for task management │  <- Collapsed bubble
└──────────────────────────────────────────┘

- Click to expand and access full Plan/Tasks tabs + CTAs
- Appears when a newer plan replaces this one
```

### 5.4 Execution Grid

```
2 active agents:              4 active agents:
┌─────────┐┌─────────┐       ┌─────────┐┌─────────┐
│ API      ││ Frontend│       │ API      ││ Frontend│
│ Agent    ││ Agent   │       │ Agent    ││ Agent   │
│          ││         │       └─────────┘└─────────┘
│ [stream] ││ [stream]│       ┌─────────┐┌─────────┐
└─────────┘└─────────┘       │ Auth     ││ Test    │
                              │ Agent    ││ Agent   │
                              └─────────┘└─────────┘

- Dynamic resize: only active agents shown (waiting agents hidden)
- Each pane: task-derived name in header + full agent transcript streaming
- Mobile: vertical stack (full-width panes)
```

### 5.5 Bento Box Summary

```
┌────────────────────┐┌──────────┐
│                    ││          │
│  Main Result       ││ Summary  │
│  (larger card)     ││ Card     │
│                    ││          │
├──────────┐┌───────┘└──────────┤
│          ││                   │
│ Audio    ││  Visual Preview   │
│ Player   ││  (rendered UI)    │
│          ││                   │
└──────────┘└───────────────────┘

- Masonry layout: card sizes based on content priority
- Each card is a GenUI card; content varies (text, UI, images, audio, combinations)
- Progressive: cards appear as agents complete
```

---

## 6. Risks & Mitigations

### 6.1 Technical Risks

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|-----------|
| Streamdown parsing errors on complex plan markdown | Medium | Breaks plan display | Test with 20+ diverse plan formats; fallback to raw markdown |
| Mermaid syntax errors in AI-authored diagrams | Medium | Diagram won't render | Streamdown Mermaid plugin validates; provide text fallback |
| `invoke_subagents` fails to distribute tasks correctly | Medium | Tasks run out of order or not at all | Validate dependency graph before submission; fallback to sequential |
| Subagent port crashes mid-execution | Low-Medium | Lost progress for that agent | Auto-retry (3 total attempts); pause downstream; show partial results |
| Growing card animation causes layout thrashing | Low | Poor UX during streaming | Use `will-change` and layout-stable container; test on low-end devices |
| `create-plan` timeout on complex requests | Low | User sees indefinite loading | 45s timeout with "Plan taking longer than expected" message |
| Bento masonry layout inconsistent across content types | Low | Visual jank in summary | Standardize GenUI card dimensions with min/max constraints |

### 6.2 Dependency Risks

| Dependency | Risk | Mitigation |
|-----------|------|-----------|
| RovoDev `ask_user_questions` tool availability | Tool may not be available in all RovoDev versions | Graceful degradation: skip clarification, proceed to plan |
| RovoDev `invoke_subagents` tool availability | Required for parallel execution | Fallback to sequential single-agent execution (1x mode) |
| RovoDev Serve port pool capacity | May not have 4 free ports | Cap subagent count to available ports; show warning |

---

## 7. Phased Rollout

### Phase 1: Plan Generation MVP
- [ ] Plan mode defaults to ON
- [ ] System prompt updated to soft clarification language
- [ ] `ask_user_questions` (RovoDev native) wired to existing question card UI
- [ ] `create-plan` generates single markdown doc (no Mermaid yet)
- [ ] Plan renders via Streamdown in generative card (growing card animation)
- [ ] `update_todo` populates Tasks tab
- [ ] Tabbed plan card (Plan / Tasks)
- [ ] "Build" CTA wired to immediate execution (1x only initially)
- [ ] Remove existing approval flow (approve/revise/reject)
- [ ] Composer locks during active question cards

### Phase 2: Plan Polish & Preview
- [ ] Full-screen plan preview modal (same tabs, larger view, Build button)
- [ ] AI-authored Mermaid diagrams in plan markdown
- [ ] Plan revision flow: follow-up messages trigger new plan, old collapses to bubble
- [ ] Collapsed plan card with expand-to-access CTAs
- [ ] Text-only fallback for non-plannable requests
- [ ] Light/dark theme testing

### Phase 3: Parallel Execution
- [ ] 1x-4x subagent count dropdown in composer toolbar (default 1x)
- [ ] `invoke_subagents` integration with dependency-ordered task distribution
- [ ] Execution grid: responsive layout (1/2/2+1/2x2)
- [ ] Dynamic grid resize (only active agents shown)
- [ ] Full agent transcript streaming per pane
- [ ] Task-derived agent names in pane headers
- [ ] Sidebar AgentsProgress component for execution tracking
- [ ] Auto-retry (3 total attempts) with downstream task pausing
- [ ] Cancel all subagents with partial result display
- [ ] Mobile: vertical stack for execution panes

### Phase 4: Summary & Completion
- [ ] Progressive bento box summary view (masonry GenUI cards)
- [ ] GenUI cards with varying content types (text, UI, images, audio, combinations)
- [ ] Masonry layout with priority-based sizing
- [ ] Bento view replaces execution grid as agents complete
- [ ] "New chat" in sidebar resets to initial view

### Phase 5: Iteration & Hardening
- [ ] Performance optimization (streaming, grid resize, masonry layout)
- [ ] Edge case handling (empty plans, timeouts, partial states)
- [ ] Comprehensive light/dark theme testing
- [ ] Mobile/responsive testing across all views
- [ ] 3G network streaming performance testing

---

## 8. Acceptance Criteria (Detailed)

### Plan Generation
- [ ] Plan mode toggle defaults to ON on page load
- [ ] `ask_user_questions` (RovoDev native) surfaces via existing question card UI
- [ ] Composer locks while question card is active
- [ ] Clarification is a soft guideline; AI can skip if request is clear
- [ ] `create-plan` generates single markdown document with Streamdown rendering
- [ ] Plan card grows smoothly during streaming
- [ ] Cancelled streams keep partial content
- [ ] Tabbed card: Plan tab (Streamdown) + Tasks tab (read-only checklist from `update_todo`)
- [ ] Mermaid diagrams render inline in Plan tab via Streamdown plugin
- [ ] Primary "Build" CTA + secondary "Open preview" CTA in card footer
- [ ] Follow-up messages in plan mode trigger new plan workflow; old plan collapses to bubble
- [ ] Collapsed plans expand to reveal full card with CTAs
- [ ] Non-plannable requests get text-only fallback

### Plan Preview Modal
- [ ] Full-screen modal with Plan/Tasks tabs (mirroring inline card)
- [ ] Build button in modal
- [ ] Close button returns to chat

### Execution
- [ ] Build CTA triggers immediate execution (no approval step)
- [ ] 1x-4x subagent dropdown in composer toolbar (default 1x)
- [ ] `invoke_subagents` distributes tasks in dependency order
- [ ] Each subagent runs on separate RovoDev Serve port
- [ ] Execution grid replaces Make tab content
- [ ] Responsive grid: 1=full, 2=2col, 3=2+1, 4=2x2
- [ ] Dynamic resize: only active agent panes shown
- [ ] Each pane shows full agent transcript streaming
- [ ] Task-derived agent names in pane headers
- [ ] Sidebar AgentsProgress shows task checklist + progression + status
- [ ] Auto-retry: 2 retries (3 total attempts) on failure
- [ ] Downstream dependent tasks pause on persistent failure
- [ ] Cancel all: stops all subagents, shows partial results
- [ ] Mobile: panes stack vertically

### Summary
- [ ] Progressive bento box summary as agents complete
- [ ] Masonry layout with priority-based card sizing
- [ ] GenUI cards with varying content types
- [ ] Bento view replaces execution grid
- [ ] "New chat" in sidebar resets to initial composer view

### Visual & UX
- [ ] All views render correctly in light and dark themes
- [ ] Streamdown formatting matches ADS token standards
- [ ] Mermaid diagrams readable in both themes (handled by Streamdown plugin)
- [ ] Growing card animation is smooth
- [ ] Modal opens/closes without layout shift
- [ ] Masonry layout stable during progressive rendering
- [ ] Responsive behavior on narrow viewports for all views

### Testing & Validation
- [ ] Tested with 10+ diverse planning requests
- [ ] Tested plan revision flow (follow-up -> new plan -> old collapses)
- [ ] Tested cancel during streaming (partial content preserved)
- [ ] Tested parallel execution with 1x, 2x, 3x, 4x subagents
- [ ] Tested auto-retry and downstream task pausing
- [ ] Tested progressive summary generation
- [ ] Tested in light and dark themes
- [ ] Tested on mobile and desktop viewports
- [ ] No console errors or warnings in development

---

## 9. Decisions Log

Decisions made during spec interview, for reference:

| Decision | Choice | Rationale |
|----------|--------|-----------|
| `ask_user_questions` tool identity | New RovoDev native tool replacing `request_user_input` | App is now powered by RovoDev |
| Clarification enforcement | Soft guideline (AI encouraged, not forced) | Flexibility; AI may skip for clear requests |
| Clarification timing | Any point in workflow | Supports revision and iterative planning |
| Plan output format | Single markdown document with embedded Mermaid | Simpler than multi-part output |
| Plan card structure | Tabbed: Plan (Streamdown) + Tasks (checklist) | Separates narrative from actionable items |
| Task source | Separate `update_todo` call after `create-plan` | Clean separation of concerns |
| Task interactivity | Read-only display | Simplicity for MVP |
| Mermaid authorship | AI-authored in plan text | AI determines meaningful dependencies |
| Mermaid theming | Streamdown plugin handles it | Existing infrastructure |
| Streaming card behavior | Growing card (height animates) | Visual stability + progressive reveal |
| Cancel behavior | Keep partial content | User may want to reference what was generated |
| Plan revision | New message in plan mode -> new plan workflow | Stay in plan mode for follow-ups |
| Old plan treatment | Collapsed bubble, expandable for CTAs | Access to previous plans without clutter |
| Non-plannable requests | Text-only fallback | Don't force plan cards on every response |
| CTA hierarchy | Primary Build + secondary Preview | Build is the primary action |
| Plan modal | Full-screen, same tabs, Build button | Larger reading surface + action |
| Approval flow | Removed entirely; Build is direct | Simplify workflow; no approve/revise/reject |
| Build trigger | Immediate execution, no confirmation | Reduce friction |
| Subagent count UI | Toolbar dropdown (1x-4x), default 1x | Always visible, unobtrusive |
| Subagent distribution | Single `invoke_subagents` call; RovoDev distributes | Backend simplicity |
| Task ordering | Dependency-ordered | Respect prerequisites |
| Execution grid layout | Responsive (1/2/2+1/2x2) | Adapts to active agent count |
| Grid resize | Dynamic: only active agents shown | Clean UX, no idle panes |
| Pane content | Full agent transcript streaming | Maximum visibility |
| Agent naming | Task-derived (e.g., "API Agent") | Meaningful identity |
| Execution location | Same tab (Make), content swap | No disorienting navigation |
| Sidebar during execution | AgentsProgress component | Existing component reuse |
| Auto-retry | 2 retries (3 total attempts) | Balance between resilience and speed |
| Failure handling | Pause downstream dependent tasks | Prevent cascading failures |
| Cancel scope | Cancel all subagents at once | Simplicity |
| Completion view | Progressive masonry bento box | Creative, content-adaptive summary |
| Bento card content | GenUI cards, varying types | Flexible output rendering |
| Bento layout | Masonry with priority sizing | Content-aware sizing |
| Summary timing | Progressive as agents finish | Don't wait for slowest agent |
| Post-completion | Plan done; "New chat" resets | Clear lifecycle boundary |
| Backend approach | Transparent proxy (recommended) | Keep backend simple; frontend interprets events |
| Streaming protocol | Same SSE chat stream | Reuse existing infrastructure |
| Subagent streaming | Separate SSE per subagent port | Each agent has its own RovoDev Serve port |
| Mobile responsive | Vertical stack for execution and bento | Sensible narrow viewport behavior |
| Home tab | Out of scope (placeholder) | Separate feature |
| Search tab | Out of scope (placeholder) | Separate feature |
| Work items | Future integration noted | Not blocking this spec |
| Initial view | Identical to current; only plan toggle state differs | Minimal disruption |
| Plan toggle OFF behavior | RovoDev decides response behavior | Flexible; no forced plan mode |
| Toggle effect on existing plans | Only affects next message | Non-destructive toggle |

---

## 10. Open Questions (Resolved)

These questions from the original spec have been resolved through the interview:

1. **Follow-up Clarifications**: Yes, clarifying questions can appear at any point in the workflow, including after plan generation during revision.

2. **Plan Persistence**: Plans persist in chat thread history. Session-scoped (not persisted to database). User can return to old chats and see plan cards.

3. **Pre-filled Defaults**: Out of scope for this spec. The AI uses context from the conversation to inform planning.
