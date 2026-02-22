# Output Routing — Detailed Implementation Spec

Companion implementation checklist: `docs/prd-output-routing-implementation-checklist.md`

## 1. Executive Summary

- **Problem Statement**: Chat users are not consistently shown the right output experience for their query type, which causes mismatches between intent and UI (for example, text when an actionable UI is needed).
- **Proposed Solution**: Build a query-based output orchestration layer that routes each message to the best experience: Generative UI (`json-render`), Question Card clarification flow, direct media generation, or text streaming fallback.
- **Success Criteria**:
  - Experience routing accuracy is `>= 92%` across labeled query categories.
  - Correct tool-path activation (`RovoDev`, `AI Gateway`, or text-only) is `>= 95%`.
  - Clarification trigger precision for missing-context actionable tasks is `>= 90%`.
  - Generative UI render success rate is `>= 98%` when a valid UI response is expected.
  - Fallback continuity is `>= 99.5%` (users still receive output when UI generation fails).

## 2. User Experience & Functionality

- **User Personas**:
  - Primary: End user chatting with the AI agent in the VPK chat interface.

- **User Stories**:
  - As a user, I want actionable task requests to open Generative UI so I can complete work through structured controls and results.
  - As a user, I want the assistant to ask follow-up questions when context is missing so I can provide what is needed to proceed.
  - As a user, I want image and sound requests to use the media-capable model path so output quality is reliable.
  - As a user, I want standard informational questions to stream text quickly without extra UI overhead.
  - As a user, I want graceful fallback to text when Generative UI cannot be produced so the conversation never dead-ends.

- **Acceptance Criteria**:
  - When RovoDev calls tools in its response, the backend suppresses RovoDev's text from the user and triggers the two-step GenUI flow to produce a `json-render` card inline in chat.
  - When `ask_user_questions` triggers a Question Card, the standard chat composer is **fully replaced** — the user cannot type freely until they answer or skip.
  - Submitted Question Card answers are appended to conversation history and re-sent to RovoDev; if RovoDev calls tools in the retry, GenUI triggers.
  - When the user dismisses (skips) a Question Card, a backend notification is sent to RovoDev so it can decide how to respond (e.g., "I need more context" or proceed with caveats).
  - Image and sound intents are detected by a lightweight pre-classifier (regex/keyword) and bypass RovoDev entirely, routing to AI Gateway.
  - When RovoDev returns without tool calls, its text response streams to the user normally.
  - GenUI output is the **only** output for tool-backed queries — no accompanying text intro is shown when GenUI succeeds.
  - If GenUI generation fails at any point, the system instantly falls back to showing RovoDev's text response with no retry, no error indicator, and no extra delay.

- **Non-Goals**:
  - Building new core RovoDev tools in this phase.
  - Imposing a hard limit on clarification rounds.
  - Replacing the existing chat transport stack.
  - Building a separate operator dashboard in MVP.

## 3. Architecture & Routing

### Core Flow (3 Paths)

| Path              | Detection                                            | Backend                                        | Frontend                                                            |
| ----------------- | ---------------------------------------------------- | ---------------------------------------------- | ------------------------------------------------------------------- |
| Media bypass      | Lightweight pre-check (regex/keyword) before RovoDev | AI Gateway (Google model)                      | widget-loading → widget-data (existing pattern)                     |
| Tool-backed GenUI | RovoDev calls any tool                               | Two-step: RovoDev → GenUI LLM (catalog prompt) | widget-loading → widget-data with spec, rendered via JsonRenderView |
| Text streaming    | RovoDev returns without tool calls                   | RovoDev text response streamed                 | Standard text message                                               |

### Two-Step GenUI Flow Detail

1. User message → RovoDev (with tool access to Confluence, Jira, Teamwork Graph).
2. RovoDev processes query, may call tools, streams text response.
3. Backend detects tool usage in the response.
4. **If tools were called**: suppress text from user view, send RovoDev's full text response to GenUI LLM (with `catalog.prompt()` system prompt).
5. GenUI LLM generates json-render spec (RFC 6902 JSON Patch format).
6. Backend emits `widget-loading` → `widget-data` with `{ type: "genui-preview", payload: { spec } }`.
7. Frontend renders via `JsonRenderView` + `useProgressiveSpec` for progressive element reveal.
8. **If GenUI fails at any point** → instant fallback to RovoDev's text response (no retry).
9. **If no tools called** → stream RovoDev's text normally.

### Classifier Changes

- Existing `smart-generation-intent.js` LLM classifier: retain **ONLY** for media intent detection (image/audio).
- Remove genui/normal classification from classifier — tool usage determines GenUI trigger.
- Classifier prompt updated to only classify: `normal` | `audio` | `image`.

### Catalog Prompt Strategy

- Catalog prompt (~5000 tokens, 68 components) is **NEVER** sent to RovoDev.
- Only sent to GenUI LLM in step 2, when tool usage is detected.
- Zero catalog cost for text-only queries.

## 4. Question Card (Clarification Loop)

### Composer Takeover

- When `ask_user_questions` triggers a Question Card, the standard chat composer is fully replaced.
- User cannot type freely until they answer or skip.
- Question Card renders in the composer position (not as an inline message bubble).
- After submission, composer returns to normal state.

### Answer Submission Flow

- User submits answers → frontend calls `createClarificationSubmission()` + `buildClarificationSummaryPrompt()`.
- Answers appended to conversation history as a regular user message.
- Re-sent to RovoDev (which now has context to proceed).
- If RovoDev calls tools in the retry → two-step GenUI flow triggers.
- GenUI card appears inline in chat (separate from the Question Card).

### Skip/Dismiss Behavior

- "Skip" button dismisses the Question Card.
- Dismissal triggers a backend notification to RovoDev (**NEW** — currently client-side only).
- RovoDev decides how to respond (e.g., "I need more context to continue" or proceeds with caveats).
- Implementation: `onDismiss` callback sends a system message to RovoDev via the chat endpoint.

## 5. GenUI Rendering Details

### Inline Widget Cards

- GenUI cards render inline in chat using `generative-widget-card.tsx`.
- Multiple GenUI cards coexist in the same conversation, all remain interactive.
- GenUI card replaces text entirely — no accompanying text intro when GenUI succeeds.
- RovoDev's text response is stored as the assistant message in conversation history (user never sees it, but it provides follow-up context).

### Loading UX (Two-Phase)

1. **During RovoDev processing**: existing `thinking-status` and `thinking-event` data parts show tool call lifecycle.
2. **During GenUI LLM generation**: `widget-loading` data part shows GenUI-specific loading indicator.

### Fallback

- Single path: any GenUI failure → instantly show RovoDev's text response.
- No retry, no error type distinction, no auto-fix attempts in the two-step flow.
- User sees text immediately with no extra delay or error indicator.

### Follow-Up Modifications

- User can say "change the chart to a pie chart" in a follow-up message.
- Follow-up goes through normal flow: RovoDev → tool call check → GenUI if applicable.
- Full regeneration each time (no incremental spec modification).
- RovoDev has conversation history including its own previous text responses, providing continuity.
- GenUI LLM generates a completely new spec based on the updated RovoDev text response.

## 6. Media Bypass

### Detection

- Lightweight pre-classification (regex/keyword-based) in the Express backend.
- Runs **BEFORE** sending to RovoDev — media intents skip the RovoDev round-trip entirely.

### Routing

- Image → AI Gateway (Google model path) → `widget-loading` → `widget-data` with image result.
- Audio/sound → AI Gateway (Google model path) → `widget-loading` → `widget-data` with audio result.
- Uses existing data part pattern (no new data part types).

## 7. Edge Cases

### Mixed Intent

Example: "What's the weather and show me my benefits"

- Treated as a single request → RovoDev handles everything.
- If RovoDev calls tools → GenUI covers the entire response.

### Conversation Context for Follow-Ups

- RovoDev's text response stored as assistant message (even though user saw GenUI).
- Sufficient for follow-up queries that reference previous GenUI output.

## 8. Decision Table

| Condition (evaluated in order)  | Detection                      | Backend Path                                 | Frontend Experience                                           |
| ------------------------------- | ------------------------------ | -------------------------------------------- | ------------------------------------------------------------- |
| Image intent                    | Pre-classifier regex/keyword   | AI Gateway (Google model)                    | widget-loading → widget-data with image                       |
| Audio/sound intent              | Pre-classifier regex/keyword   | AI Gateway (Google model)                    | widget-loading → widget-data with audio                       |
| RovoDev calls tools             | Post-RovoDev tool detection    | Two-step: RovoDev text → GenUI LLM (catalog) | widget-loading → widget-data with spec → JsonRenderView       |
| RovoDev signals missing context | `ask_user_questions` tool call | RovoDev                                      | Question Card in composer position                            |
| Clarification answers submitted | User submits Question Card     | RovoDev (retry with answers in context)      | Normal flow (may trigger GenUI)                               |
| Clarification dismissed         | User clicks Skip               | Backend notifies RovoDev                     | RovoDev responds (needs more context / proceeds with caveats) |
| RovoDev returns without tools   | No tool calls detected         | RovoDev text streaming                       | Standard text message                                         |
| GenUI generation fails          | Any failure in step 2          | N/A (already have RovoDev text)              | Instant text fallback (show RovoDev's text)                   |

## 9. Files to Modify

| File                                                         | Change                                                                                                             |
| ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------ |
| `backend/lib/smart-generation-intent.js`                     | Update classifier to only detect media intents (remove genui/normal)                                               |
| `backend/server.js`                                          | Add two-step GenUI flow in `/api/chat-sdk` handler: detect tool calls → trigger GenUI LLM → emit widget data parts |
| `backend/server.js`                                          | Add Question Card dismiss notification endpoint/handler                                                            |
| `backend/lib/genui-chat-handler.js`                          | Extract GenUI LLM call logic into reusable function for the two-step flow                                          |
| `backend/lib/genui-system-prompt.js`                         | No changes (catalog prompt generation already exists)                                                              |
| `backend/lib/genui-spec-utils.js`                            | No changes (spec parsing/validation already exists)                                                                |
| `app/contexts/context-rovo-chat.tsx`                         | Add Question Card dismiss → backend notification flow                                                              |
| `components/templates/shared/hooks/use-dismissible-cards.ts` | Add dismiss callback that notifies backend                                                                         |
| Question Card rendering in templates                         | Move Question Card from inline message to composer position                                                        |
| `backend/lib/question-card-extractor.js`                     | No changes (extraction logic already exists)                                                                       |

## 10. Existing Functions to Reuse

| Function                                     | File                                                      | Purpose in this feature                                                        |
| -------------------------------------------- | --------------------------------------------------------- | ------------------------------------------------------------------------------ |
| `generateSmartGenuiResult()`                 | `backend/server.js:958`                                   | Adapt for step 2 GenUI LLM call (already calls AI Gateway with catalog prompt) |
| `getGenuiSystemPrompt()`                     | `backend/lib/genui-system-prompt.js`                      | Generate catalog system prompt for step 2                                      |
| `analyzeGeneratedText()`                     | `backend/lib/genui-spec-utils.js`                         | Parse and validate GenUI spec from LLM output                                  |
| `pickBestSpec()`                             | `backend/lib/genui-spec-utils.js`                         | Select best spec from analysis results                                         |
| `emitWidgetLoading()` / `emitWidgetData()`   | `backend/server.js`                                       | Emit loading and data parts for GenUI delivery                                 |
| `classifySmartGenerationIntent()`            | `backend/lib/smart-generation-intent.js`                  | Adapt for media-only classification                                            |
| `streamViaRovoDev()`                         | `backend/lib/rovodev-gateway.js`                          | Existing RovoDev streaming (unchanged)                                         |
| `createClarificationSubmission()`            | `components/templates/shared/lib/question-card-widget.ts` | Format answers for submission                                                  |
| `adaptClarificationAnswersForToolContract()` | `backend/server.js`                                       | Convert answers to RovoDev format                                              |
| `JsonRenderView`                             | `lib/json-render/renderer.tsx`                            | Render GenUI specs (unchanged)                                                 |
| `useProgressiveSpec`                         | `lib/json-render/use-progressive-spec.ts`                 | Progressive element reveal (unchanged)                                         |

## 11. E2E Demo Fixture Pack

These prompts must produce working GenUI when the system is fully operational:

| Step          | Prompt                                                                              | Expected Route                                                          | Assertion                                                                |
| ------------- | ----------------------------------------------------------------------------------- | ----------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| Q1            | "How is my total compensation and benefits package structured?"                     | RovoDev (tools) → GenUI LLM → json-render                               | Tabbed UI with distinct tab content, at least one chart + one table      |
| Q2            | "What are my key onboarding and benefits milestones in my first 90 days?"           | RovoDev (tools) → GenUI LLM → json-render                               | Timeline with ordered milestones from start to end period                |
| Q3            | "How should I allocate my Flex Wallet for the year?"                                | RovoDev (tools) → GenUI LLM → json-render                               | Sliders/radios/checkboxes render, output changes when controls change    |
| Q4            | "Help me plan my first-year finances with salary, leave, and benefits assumptions." | RovoDev (tools) → GenUI LLM → json-render                               | Accordion sections with input groups, computed plan summary              |
| Clarification | Same query but with missing key context                                             | RovoDev → ask_user_questions → Question Card (composer) → retry → GenUI | Question Card appears in composer, answers accepted, retry returns GenUI |
| Failure       | Force invalid UI payload                                                            | Text fallback                                                           | User sees RovoDev's text instantly, no error indicator                   |
| Follow-up     | "Change the chart to a pie chart" (after Q1)                                        | RovoDev (tools) → GenUI LLM → json-render                               | New GenUI card with pie chart renders inline below previous card         |

## 12. Verification

1. `pnpm run lint` — no lint errors.
2. `pnpm tsc --noEmit` — no type errors.
3. Manual testing:
   - Send a text-only query → verify text streams normally (no GenUI attempt).
   - Send an actionable query that triggers RovoDev tools → verify GenUI card renders inline.
   - Send an image generation request → verify media bypass works via AI Gateway.
   - Trigger a Question Card → verify it appears in composer position, blocks free typing.
   - Skip a Question Card → verify backend notification and RovoDev response.
   - Submit Question Card answers → verify retry produces GenUI.
   - Force a GenUI failure → verify instant text fallback.
   - Send a follow-up modification → verify new GenUI card renders.
4. Run E2E fixture pack prompts and verify assertions.
