# Lessons

Running log of corrections and patterns learned during sessions.
Distill recurring patterns into permanent rules in CLAUDE.md or .claude/rules/.
Mark promoted entries with `[Promoted]` prefix — see vpk-lesson skill for details.

---

### 2026-02-16 - RovoDev binary resolution must prefer `acli` over stale Atlascode binaries
- **What happened:** `pnpm run rovodev` failed because `resolveRovodevBin()` picked up a stale Atlascode extension binary (v0.13.40) before checking for `acli` on PATH (v0.13.45). The outdated binary caused serve failures.
- **Why:** The resolution order checked Atlascode extension paths before `acli`, and `acli` was only checked as a last-resort fallback. The Atlascode binary is auto-installed per-workspace and not kept in sync with the user's CLI.
- **Rule:** In `scripts/dev-rovodev.js`, resolve binaries in this order: `rovodev` on PATH → `acli` on PATH → `~/.rovodev/bin` → Atlascode extension → fallback. User-managed binaries (`rovodev`, `acli`) should always take priority over auto-installed extension binaries. When using `acli`, spawn with `["rovodev", "serve", ...]` since `rovodev` is a subcommand of `acli`.

### 2026-02-17 - RovoDev Serve 409 "Chat already in progress" race condition with title generation
- **What happened:** Sending a chat message caused a 409 "Chat already in progress" error from RovoDev Serve. The sidebar title stayed in skeleton loading forever. Two "Retrying" thinking indicators appeared in the chat.
- **Why:** `createChatEntry()` fired `fetchAITitle()` (via `POST /api/chat-title`) at the same time as `sendAgentsPrompt()` (via `POST /api/chat-sdk`). Both called RovoDev Serve simultaneously, but it only allows one active chat at a time. The title fetch failed silently (returned `null`), but `isGeneratingTitle` was never cleared. Additionally, `isStreaming` from `useChat` is not `true` until the render after `sendMessage` — so an effect watching `!isStreaming` could fire prematurely before the stream even begins.
- **Rule:** Never call RovoDev Serve APIs in parallel — defer secondary calls (title generation, suggested questions) until after the primary stream completes. Use a `hasStreamedOnceRef` guard to ensure effects don't fire in the gap between `sendMessage` and `isStreaming` becoming `true`. Always clear loading states (e.g. `isGeneratingTitle`) when the deferred API call fails, to prevent permanent skeleton loading.

### 2026-02-16 - cmdk scrollIntoView scrolls entire page when rendered inline
- **What happened:** The homepage preview grid scrolled ~3456px down on every page load because the `CommandDemo` (cmdk `Command` component) was rendered directly in a grid card, and cmdk's layout effect called `scrollIntoView({block:"nearest"})` on the auto-selected first item, scrolling the document to bring the off-screen card into view.
- **Why:** cmdk always calls `scrollIntoView` on the selected item during mount via `useLayoutEffect`. When a Command component is rendered inline (not in a dialog/iframe) and is below the fold, `scrollIntoView` propagates through all ancestors — `overflow: hidden` and `overflow: clip` on intermediate containers do NOT prevent it from scrolling the document.
- **Rule:** When embedding cmdk `Command` components in non-interactive preview contexts (e.g. grid cards, thumbnails), pass `value="__preview__" onValueChange={() => {}}` to prevent auto-selection and the resulting `scrollIntoView`. Never assume `overflow: clip` or `overflow: hidden` will contain `scrollIntoView` — it always walks up to the document.

### 2026-02-17 - Preserve default VPK button typography when adding new composer actions
- **What happened:** The new `Agent team` composer action initially overrode label styling instead of inheriting the standard VPK button typography.
- **Why:** Styling focus was placed on layout/variant changes and missed the requirement to keep the default label font treatment from the existing button system.
- **Rule:** For new CTA/action buttons in existing VPK surfaces, use the shared `Button` defaults and only set the required `variant`, `size`, and icon placement. Do not add custom font classes or inline typography styles unless explicitly required by design.

### 2026-02-17 - ADS component demos must mirror ADS docs example structure
- **What happened:** Initial menu-group demos used generic feature-based names (With icons, With descriptions, Compact spacing, Disabled, Custom content) instead of matching the actual ADS documentation examples (Default, Menu structure, Button item, Link item, Custom item, Section and heading item, Density, Scrolling, Loading).
- **Why:** Demos were invented from component capabilities rather than referencing the ADS docs page structure. The ADS examples page organizes demos by concept/primitive, not by individual feature toggles.
- **Rule:** When enriching a VPK component with ADS parity, fetch or review the ADS documentation examples page for that component and mirror its example structure (titles, grouping, content patterns). Demo names and content should match ADS examples, not be invented from the component API surface.

### 2026-02-17 - Agent-team clarification gate must not depend on intent regex
- **What happened:** In agent-team mode, a planning request phrased as “help me coordinate on a team event” produced inline text questions instead of the question-card widget.
- **Why:** The backend clarification gate required `detectPlanningIntent(...)` to return true. The regex missed valid planning phrasing without explicit “plan/steps/roadmap” keywords.
- **Rule:** In agent-team mode, treat the first planning cycle as clarification-first by default: gate to question-card unless the message is a hidden follow-up source (`clarification-submit`, `plan-approval-submit`, `agent-team-plan-retry`) or a completed plan widget already exists. Intent regex should be secondary for non-agent-team flows only.

### 2026-02-17 - Post-clarification plan card fallback must handle phase-formatted plans
- **What happened:** After answering a question-card, the assistant returned a valid phase-based plan in text (e.g., “Phase 1/2/3” with numbered tasks), but no plan card rendered.
- **Why:** The fallback parser only accepted `Action items`/`Tasks` headings. Phase-formatted plans bypassed widget emission and stayed as plain text.
- **Rule:** When the latest user source is `clarification-submit`, run a permissive structured-plan parser fallback (phase/numbered tasks) if strict plan parsing fails. Keep strict parsing as default for non-clarification turns to avoid false positives.
