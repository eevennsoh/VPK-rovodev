---
name: vpk-lesson
description: This skill should be used when the user says "log this", "add a lesson",
  "remember this mistake", "don't do that again", "that was wrong", "lesson learned",
  "save this for next time", "note this pattern", "track this correction",
  "I keep making this mistake", "add this to memory", "write this down",
  "log a correction", "I want you to remember",
  "transfer lessons", "promote lessons", "distill lessons", "move lessons to AGENTS.md",
  "move lessons into rules",
  or corrects the AI and wants the correction recorded in AGENTS-LESSONS.md.
argument-hint: "[description] | --transfer"
prerequisites: []
produces: [AGENTS-LESSONS.md]
---

# VPK Lesson

> Log corrections and patterns to `AGENTS-LESSONS.md` so mistakes aren't repeated across sessions.

## Quick Start

```
/vpk-lesson The sidebar context was in the wrong file — it lives in app/contexts/ not components/
```

```
/vpk-lesson --transfer
```

## What It Does

1. Reads the current `AGENTS-LESSONS.md` file
2. Checks for duplicate or similar existing entries
3. Appends a new entry with today's date (or updates an existing one)
4. Includes what happened, why, and a preventive rule

## Routing

If the argument is `--transfer` (or the user says "transfer lessons", "promote lessons", "distill lessons", "move lessons to AGENTS.md", or "move lessons into rules"), execute the **Transfer Workflow** below instead of the standard lesson-logging workflow.

Otherwise, proceed with the standard lesson-logging workflow in **Agent Instructions**.

## When NOT to Log

Not every correction warrants a lesson. Skip logging for:

- **Typos and one-off mistakes** — mistyped a filename, wrong line number
- **Trivial misunderstandings** — user clarified a preference that doesn't generalize
- **Context-specific errors** — mistakes that only apply to the current task and won't recur
- **Already-documented rules** — the correction is already covered in `AGENTS.md` or a `.agents/rules/` file

**Do log when:**

- The same type of mistake has happened before (or is likely to)
- The correction reveals a non-obvious project convention
- The root cause is a wrong assumption that could apply broadly

## Agent Instructions

1. **Parse the user's input** to extract:
   - **What happened** — the mistake or incorrect assumption
   - **Why** — the root cause (wrong file, wrong pattern, wrong assumption, etc.)
   - **Rule** — a concrete, actionable rule to prevent recurrence

   If the user's input is vague, ask for clarification:

   ```yaml
   header: "Clarify"
   question: "What specifically went wrong and what's the correct approach?"
   options:
     - label: "Wrong file/location"
       description: "Edited or looked in the wrong place"
     - label: "Wrong pattern/API"
       description: "Used the wrong approach or API"
     - label: "Wrong assumption"
       description: "Assumed something that wasn't true"
   ```

2. **Read the current file** at `AGENTS-LESSONS.md` in the project root using the Read tool (not bash).

3. **Check for duplicates** — scan existing entries for lessons covering the same topic or pattern. If a similar entry already exists:
   - **Update** the existing entry with any new context rather than creating a duplicate
   - Tell the user: "Updated existing lesson on [topic] with new context"

4. **Append a new entry** (if no duplicate found) using this exact format:

   ```markdown
   ### [YYYY-MM-DD] - [Brief description]
   - **What happened:** [What went wrong]
   - **Why:** [Root cause]
   - **Rule:** [How to prevent it]
   ```

   Use today's date. Keep each field to 1-2 sentences.

5. **Check if distillation is needed** — after writing the entry, count the total number of non-promoted `###` entries in the file. If there are **5 or more** unpromoted entries, add a prompt to the user:

   > "You now have X lessons logged. Consider running `/vpk-lesson --transfer` to evaluate and promote recurring patterns into permanent repo rules in `AGENTS.md` or `.agents/rules/*`."

   If there are entries with similar themes (e.g., 3+ about tokens, 2+ about file locations), call that out specifically:

   > "You have 3 lessons about token usage — running `/vpk-lesson --transfer` would consolidate these into a permanent rule."

6. **Confirm** — tell the user what was logged (or updated).

## Examples

### From explicit invocation

```
User: /vpk-lesson I kept looking for the theme provider in components/utils but it's actually ThemeWrapper in components/utils/theme-wrapper.tsx
```

Appends:

```markdown
### 2025-02-07 - Theme provider location
- **What happened:** Searched for theme provider in wrong location
- **Why:** Assumed a generic name; the component is specifically `ThemeWrapper` in `components/utils/theme-wrapper.tsx`
- **Rule:** Search for `ThemeWrapper` by name, not by guessing file paths
```

### From a correction

```
User: /vpk-lesson Don't use bg-[var(--ds-background-neutral)], use bg-bg-neutral instead
```

Appends:

```markdown
### 2025-02-07 - Token class naming
- **What happened:** Used raw CSS variable in Tailwind arbitrary value
- **Why:** Didn't follow the shadcn-theme semantic class convention
- **Rule:** Use semantic Tailwind classes (bg-bg-neutral) instead of arbitrary values (bg-[var(--ds-...)])
```

### Duplicate detection

```
User: /vpk-lesson Again used bg-[var(--ds-surface-raised)] instead of bg-surface-raised
```

Detects existing "Token class naming" entry and updates it:

```markdown
### 2025-02-07 - Token class naming
- **What happened:** Repeatedly used raw CSS variables in Tailwind arbitrary values
- **Why:** Didn't follow the shadcn-theme semantic class convention
- **Rule:** Use semantic Tailwind classes (bg-bg-neutral, bg-surface-raised) instead of arbitrary values (bg-[var(--ds-...)]). See `.agents/rules/token-priority.md`
```

### Migration/deprecation lesson templates

Use these when refactors replace local wrappers with direct primitives and something breaks.

#### Wrapper deleted before callsites migrated

```
User: /vpk-lesson Deleted shared-ui wrappers before updating all imports, causing build breaks
```

Log pattern:

```markdown
### 2026-02-10 - Wrapper deprecation ordering
- **What happened:** Removed wrapper files before all callsites were migrated, leaving broken imports.
- **Why:** Skipped an exhaustive import inventory and residual import check.
- **Rule:** Migrate callsites first, then delete wrappers only after `rg` confirms zero remaining references.
```

#### Prop API mismatch during migration

```
User: /vpk-lesson Missed prop API changes (`text` to `children`) when swapping shared-ui Tag to components/ui Tag
```

Log pattern:

```markdown
### 2026-02-10 - API delta mapping required for component swaps
- **What happened:** Replaced component imports without fully adapting callsite props/types.
- **Why:** Did not create an explicit old->new API mapping before editing.
- **Rule:** For component migrations, create an API delta map (props, types, behavior) before touching callsites.
```

#### Noisy lint baseline hid migration status

```
User: /vpk-lesson Reported lint failure without running targeted eslint for changed files
```

Log pattern:

```markdown
### 2026-02-10 - Baseline-aware validation reporting
- **What happened:** Global lint failed from unrelated baseline issues, obscuring changed-file validation status.
- **Why:** Validation stopped at repo-wide lint output.
- **Rule:** When baseline lint is noisy, run targeted eslint on changed files and report both global and changed-file outcomes.
```

#### A11y results mixed with tooling overlays

```
User: /vpk-lesson Treated page-level overlay/tooling a11y findings as migration regressions
```

Log pattern:

```markdown
### 2026-02-10 - Scoped a11y regression classification
- **What happened:** Accessibility findings from page shell/tooling overlays were conflated with migrated component issues.
- **Why:** Live-page analysis was not scoped/classified.
- **Rule:** Scope localhost a11y scans to the changed surface and classify findings as regression vs pre-existing/tooling noise.
```

## File Location

The lessons file lives at `AGENTS-LESSONS.md` in the project root. If it doesn't exist, create it with the template header:

```markdown
# Lessons

Running log of corrections and patterns learned during sessions.
Distill recurring patterns into permanent rules in AGENTS.md or .agents/rules/.
Mark promoted entries with `[Promoted]` prefix — see vpk-lesson skill for details.

---
```

## Distilling Lessons

When `AGENTS-LESSONS.md` accumulates 5+ unpromoted entries, the skill automatically prompts the user to run `/vpk-lesson --transfer`. This evaluates each entry for relevance and promotes valid ones into permanent rules.

**How distillation works:**

1. User runs `/vpk-lesson --transfer` (triggered by the prompt from this skill)
2. The transfer workflow reads `AGENTS-LESSONS.md` alongside existing `AGENTS.md` and `.agents/rules/`
3. Each entry is classified as `transfer`, `stale`, `duplicate`, or `skip`
4. Valid entries get condensed and promoted into the appropriate `AGENTS.md` section or rule file
5. Transferred, stale, and duplicate entries are removed from `AGENTS-LESSONS.md`

For broader instruction-file structure audits beyond lesson promotion, `/claude-md-improver` can be used as a complementary tool.

## Transfer Workflow (--transfer)

Execute this workflow when the user runs `/vpk-lesson --transfer` or asks to transfer/promote/distill lessons.

### Step 1 — Collect unpromoted entries

1. Read `AGENTS-LESSONS.md` in the project root
2. Extract all `###` entries that do **not** have a `[Promoted]` prefix
3. Parse each entry into:
   - **Date** — the `YYYY-MM-DD` from the heading
   - **Title** — the brief description after the date
   - **What happened** — the value of the `What happened` field
   - **Why** — the value of the `Why` field
   - **Rule** — the value of the `Rule` field
   - **Referenced files/patterns** — any file paths, component names, or API references mentioned
4. Also note any entries with `[Promoted]` prefix — these are legacy entries to clean up
5. If zero unpromoted entries exist (and no `[Promoted]` entries to clean up), report "No lessons to transfer" and stop

### Step 2 — Classify each entry

Read the following files to build context for classification:
- `AGENTS.md` (project root; canonical source even if `CLAUDE.md` is symlinked)
- All files in `.agents/rules/` (glob `.agents/rules/*.md`)

For each unpromoted entry, apply these checks **in order** and assign the first matching classification:

| Check | Method | Classification |
|---|---|---|
| Already in AGENTS.md or a rule file? | Compare the entry's Rule field against existing rules/gotchas in `AGENTS.md` and `.agents/rules/*.md` — look for semantic overlap, not just exact text | `duplicate` |
| Referenced files still exist? | Use Glob/Read to verify file paths mentioned in the entry | `stale` if **all** referenced files are gone |
| Referenced patterns still in codebase? | Use Grep to search for component names, API names, or pattern names mentioned in the entry | `stale` if the pattern/component no longer exists anywhere |
| Git activity since lesson date? | Run `git log --oneline --since="LESSON_DATE" -- <referenced files>` to check for major refactors | Informs staleness — if the referenced area was heavily refactored, lean toward `stale` |
| Too context-specific? | Judge whether the lesson is a one-time task-specific fix vs a recurring convention | `skip` — keep in AGENTS-LESSONS.md for now |
| Default | — | `transfer` |

### Step 3 — Map each `transfer` entry to a target section

For each entry classified as `transfer`, determine where it belongs:

| Topic type | Target location |
|---|---|
| Broad repo-wide workflow/default/style rule | Matching section in `AGENTS.md` (`### Non-negotiable Defaults`, `### Code Style`, `### UI and Token Standards`, `## Workflows`, or `## Behavioral Rules`) |
| UI component or interaction gotcha | `.agents/rules/gotchas-ui.md` |
| React state/render/CSS gotcha | `.agents/rules/gotchas-react.md` |
| Chat / RovoDev / AI SDK gotcha | `.agents/rules/gotchas-chat.md` |
| Component architecture pattern | `.agents/rules/component-architecture.md` |
| Motion/animation specific | `.agents/rules/motion-react.md` or `.agents/rules/motion-base-ui.md` |
| Token selection specific | `.agents/rules/token-priority.md` |
| Chat architecture or API surface rule | `.agents/rules/chat-architecture.md` or `.agents/rules/api-surfaces.md` |

**Condensation format:** Transform the entry's "Rule" field into a single bullet point (or short paragraph) that matches the existing style of the target section. The condensed rule should be self-contained — no references to "the lesson".

If multiple homes fit, choose the most specific rule file that auto-loads for the affected surface. Do not append newly promoted gotchas to `AGENTS.md`'s `## Gotchas` section; that section is reserved for stable repo-level notes, while new gotchas belong in the dedicated `.agents/rules/gotchas-*.md` files.

**Date tagging for gotcha rule files:** When the target is a `gotchas-*.md` file, append the original lesson date as a trailing comment: `<!-- added: YYYY-MM-DD -->`. This lets maintainers assess staleness without cluttering the readable text. Example:

```markdown
- Always `await stop()` before calling `sendMessage()` in AI SDK `useChat` flows. <!-- added: 2026-02-10 -->
```

### Step 4 — Present summary for user confirmation

Before making any edits, present a summary table grouped by classification:

```
## Transfer Summary

### To transfer (X entries)
| Entry | Target | Condensed rule | Added |
|---|---|---|---|
| [Date] - [Title] | `.agents/rules/gotchas-chat.md` | [one-line condensed rule] | YYYY-MM-DD |
| ... | ... | ... | ... |

### Stale (X entries)
| Entry | Reason |
|---|---|
| [Date] - [Title] | Referenced files no longer exist |
| ... | ... |

### Duplicate (X entries)
| Entry | Existing rule |
|---|---|
| [Date] - [Title] | Already covered in `.agents/rules/gotchas-react.md`: "[existing rule text]" |
| ... | ... |

### Skipped (X entries)
| Entry | Reason |
|---|---|
| [Date] - [Title] | Too context-specific to current task |
| ... | ... |

### Legacy [Promoted] entries to clean up (X entries)
| Entry |
|---|
| [Date] - [Title] |
| ... |
```

Ask the user to confirm or adjust classifications before proceeding. A short plain-text confirmation prompt is enough, for example:

```text
Review the transfer summary above. Reply `proceed` to apply it, or tell me which entries to reclassify.
```

### Step 5 — Execute

After user confirmation:

1. **Edit `AGENTS.md`** — for each `transfer` entry targeting a broad repo-level section, insert the condensed rule at the end of the matching section
2. **Edit `.agents/rules/*.md`** — for contextual rules and all newly promoted gotchas, append the condensed rule in the appropriate location within the file
3. **Do not add new gotchas to `AGENTS.md`** — route them to the most specific `.agents/rules/gotchas-*.md` file instead
4. **Clean `AGENTS-LESSONS.md`** — remove all entries classified as:
   - `transfer` (now in `AGENTS.md` or rule files)
   - `stale` (no longer relevant)
   - `duplicate` (already covered)
   - `[Promoted]` prefix entries (legacy — already promoted previously)
   - Keep only `skip` entries in the file
5. **Verify** — read back each modified section to confirm the edits are correct and the file structure is intact

### Step 6 — Report results

After execution, report:

```
Transfer complete:
- X rules promoted to `AGENTS.md`
- X rules promoted to `.agents/rules/*.md`
- X stale entries removed
- X duplicate entries removed
- X entries skipped (still in AGENTS-LESSONS.md)
- X legacy [Promoted] entries cleaned up
```
