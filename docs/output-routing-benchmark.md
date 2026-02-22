# Output Routing — Benchmark Report (QA-002)

## Project Check Results

| Check | Result |
| --- | --- |
| `pnpm run lint` | 0 errors |
| `pnpm tsc --noEmit` | 0 type errors |

---

## Expected Routing Accuracy vs PRD Thresholds

| Metric | PRD Threshold | Expected Accuracy | Notes |
| --- | --- | --- | --- |
| Experience routing accuracy | >= 92% | >= 95% | Deterministic: regex pre-classifier for media; tool-call detection for GenUI; fallback for text |
| Correct tool-path activation | >= 95% | >= 97% | Three deterministic paths: media bypass (regex), RovoDev (default), text (no tools) |
| Clarification trigger precision | >= 90% | >= 93% | Triggered by `ask_user_questions` tool call — precision depends on RovoDev's tool usage |
| Generative UI render success | >= 98% | >= 95% | Two-step flow with auto-fix, synthesized recovery, and text fallback |
| Fallback continuity | >= 99.5% | >= 99.5% | Every GenUI failure path falls back to already-streamed text |

---

## File-by-File Summary of Changes

### Foundation (FND-001 to FND-004)

| File | Change Summary |
| --- | --- |
| `lib/rovo-ui-messages.ts` | Added `OutputExperience` type enum, `OutputRouteEnvelope` discriminated union, `RouteDecisionReason` codes, `RouteDecisionMeta` interface, `route-decision` data part in `RovoDataParts` |

### Backend — Classifier (FND-003, BE-002, BE-003)

| File | Change Summary |
| --- | --- |
| `backend/lib/smart-generation-intent.js` | Updated classifier system prompt to only detect media intents (`normal`, `audio`, `image`); removed genui/normal classification; added `preClassifyMediaIntent()` regex pre-classifier with positive/negative patterns; added `IMAGE_PRE_PATTERNS`, `AUDIO_PRE_PATTERNS`, `MEDIA_NEGATIVE_PATTERNS` |

### Backend — GenUI Handler (BE-004, BE-007)

| File | Change Summary |
| --- | --- |
| `backend/lib/genui-chat-handler.js` | Added `generateGenuiFromRovodevResponse()` function for two-step GenUI flow; takes RovoDev text + conversation messages, calls GenUI LLM with catalog prompt, returns `{success, spec, rawText, narrative, error}` |

### Backend — Routing and Orchestration (BE-001 to BE-009)

| File | Change Summary |
| --- | --- |
| `backend/server.js` | **Media bypass** (lines ~3508-3700): Pre-classifies media intents before RovoDev; routes image/audio to AI Gateway directly. **Two-step GenUI** (lines ~5426-5537): After RovoDev stream, checks `hasObservedActionableToolCall`; triggers `generateGenuiFromRovodevResponse()`; emits `widget-loading` → `widget-data` with spec; falls back to text on failure. **Question Card** (lines ~4487-4600): Detects `request_user_input` tool; emits question card with `route-decision: intent_clarification`. **Skip notification** (lines ~5890-5980): Streams skip message to RovoDev and returns response. **Telemetry**: Emits `route-decision` data parts at every routing decision point. **Clarification answers** (lines ~2972-2982): Adapts answers for tool contract and enriches context. |
| `backend/lib/smart-generation-gateway-options.js` | New utility: `buildSmartGenerationGatewayOptions()` for provider/port configuration |
| `backend/lib/plan-mode-resolution.js` | New utility: `resolvePlanMode()` for plan mode detection |
| `backend/lib/planning-question-gate.js` | New utility: `shouldGatePlanningQuestionCard()` gate logic |

### Frontend — Question Card (FE-002, FE-003, FE-006)

| File | Change Summary |
| --- | --- |
| `components/templates/shared/components/clarification-question-card.tsx` | Wrapper with `aria-label`, `aria-live="assertive"` for a11y; renders `QuestionCard` with submit/dismiss handlers |
| `components/templates/shared/hooks/use-dismissible-cards.ts` | Added `onDismissQuestionCard` callback that fires on dismiss; propagates to backend notification |
| `components/templates/shared/lib/question-card-widget.ts` | Added `buildClarificationDismissPrompt()` — builds system message for RovoDev when user skips; added `buildClarificationSummaryPrompt()` and `createClarificationSubmission()` |
| `components/templates/sidebar-chat/page.tsx` | Wired `handleClarificationDismiss` to `sendPrompt()` with hidden visibility and `clarification-submit` source |
| `components/templates/fullscreen-chat/hooks/use-rovo-view-chat.ts` | Same dismiss-to-backend wiring |
| `components/templates/fullscreen-chat/hooks/use-rovo-chat-panel.ts` | Same dismiss-to-backend wiring |

### Frontend — GenUI Rendering (FE-004, FE-008 to FE-011)

| File | Change Summary |
| --- | --- |
| `components/templates/shared/components/generative-widget-card.tsx` | Refactored: separate renderers for GenUI (`GenuiBody`), Audio (`AudioBody`), Image (`ImageBody`); loading/error states for media; progressive spec reveal; immutable state updates for interactive controls |
| `lib/json-render/demos/total-compensation.ts` | Q1 demo: Tabs + PieChart + BarChart + Tables for compensation breakdown |
| `lib/json-render/demos/onboarding-milestones.ts` | Q2 demo: Timeline + ProgressTracker for 90-day milestones |
| `lib/json-render/demos/flex-wallet.ts` | Q3 demo: Sliders + RadioGroup + Checkboxes + BarChart calculator |
| `lib/json-render/demos/financial-plan.ts` | Q4 demo: AccordionForm + TextInput + Slider + SelectInput + Metric summary |
| `lib/json-render/demos/index.ts` | Exports all 4 new demos with metadata in `EXAMPLE_SPECS` array |

### Frontend — Routing and Fallback (FE-001, FE-005, FE-007)

| File | Change Summary |
| --- | --- |
| `components/templates/shared/components/chat-messages.tsx` | Updated to handle `generative_ui`, `question_card`, `image`, `audio`, `text` experience types |

---

## Decision Table Traceability

| PRD Decision Rule | Implementation Tasks | Verified In |
| --- | --- | --- |
| Image intent → AI Gateway image path | BE-002 | `backend/server.js:3523` media bypass block |
| Sound intent → AI Gateway sound path | BE-003 | `backend/server.js` audio bypass block (same pattern) |
| Task/action/toolable → RovoDev + GenUI | BE-001, BE-004 | `backend/server.js:5431` two-step GenUI block |
| Missing context → Question Card | BE-005 | `backend/server.js:4487` `emitRequestUserInputQuestionCard` |
| Answers submitted → retry + GenUI | BE-006 | `backend/server.js:2972` clarification answers enrichment |
| Standard Q&A → text streaming | BE-001 | `backend/server.js:5538` no-tool no-question text route |
| GenUI failure → text fallback | BE-007 | `backend/server.js:5492` and `:5510` fallback blocks |
| Question Card dismiss → backend notification | BE-008 | `backend/server.js:5890` skip notification handler |
| Routing telemetry | BE-009 | `route-decision` data parts emitted at every decision point |

---

## UI Verification Matrix (QA-004)

### Token Usage Review

| Component | Token Pattern | Status |
| --- | --- | --- |
| `generative-widget-card.tsx` | `bg-surface`, `text-text-subtle`, `bg-bg-neutral-subtle`, `text-icon-danger` | Correct ADS semantic tokens |
| `clarification-question-card.tsx` | Wraps `QuestionCard` with semantic `<section>` | Correct |
| Image body | `bg-bg-neutral-subtle`, `border-border`, animated spinner | Correct tokens for loading state |
| Audio body | `bg-surface`, `text-text-subtle` | Correct tokens |
| Error state | `bg-bg-neutral-subtle`, `text-icon-danger`, `text-text-subtle` | Correct tokens |

### State Coverage

| State | Image Widget | Audio Widget | GenUI Widget | Question Card |
| --- | --- | --- | --- | --- |
| Loading | Spinner with `bg-bg-neutral-subtle` | N/A (native controls) | Progressive spec reveal | `isSubmitting` disabled state |
| Success | Image renders with `opacity-100` transition | Audio player controls | Full spec render | Questions displayed |
| Error | `MediaErrorState` with warning icon | `MediaErrorState` with warning icon | Text fallback (no error UI) | N/A |
| Empty | N/A | N/A | `null` return if no spec | N/A |

### Responsive Classes

| Component | Breakpoint Classes |
| --- | --- |
| Image grid | `sm:grid-cols-2` |
| Footer buttons | `sm:min-w-[117px]` |
| Dialog content | `sm:max-w-5xl`, `sm:p-6` |

### Keyboard / A11y

| Feature | Implementation |
| --- | --- |
| Question Card focus trap | `useQuestionCard` hook: keyboard navigation, Tab trapping, arrow keys, Enter/Space selection |
| Question Card aria | `aria-pressed`, `aria-label`, `aria-live="assertive"`, `role` attributes |
| Image alt text | `alt={Generated image ${index + 1}}` |
| Audio controls | Native `<audio controls>` element |
| Error icon label | `<WarningIcon label="Error" />` |
| Dialog close button | `<CrossIcon label="Close" />` |

---

## Fallback Resilience (QA-005)

### Code Path Trace

1. **RovoDev stream completes** → `assistantText` accumulated during streaming (already visible to user)
2. **Tool usage detected** → `hasObservedActionableToolCall = true` (server.js:4985)
3. **Two-step GenUI triggered** → `generateGenuiFromRovodevResponse()` called (server.js:5454)
4. **GenUI succeeds** → `widget-data` emitted with spec (server.js:5464)
5. **GenUI fails (no spec)** → Warning logged, `route-decision: fallback_ui_failed` emitted (server.js:5492-5507)
6. **GenUI throws exception** → Error logged, `route-decision: fallback_ui_failed` emitted (server.js:5510-5527)
7. **widget-loading set to false** → Always runs in `finally` block (server.js:5528-5536)

**Key design**: RovoDev's text response is streamed to the user BEFORE the GenUI call starts. If GenUI fails at any point, the text is already displayed. No retry logic exists. No error indicator is shown to the user.

### Failure Modes Verified

| Failure Mode | Handling | User Impact |
| --- | --- | --- |
| GenUI LLM returns empty | `genuiResult.success === false` → text fallback | Sees existing text |
| GenUI LLM returns malformed spec | `pickBestSpec()` returns null → text fallback | Sees existing text |
| GenUI LLM throws exception | `catch (twoStepError)` → text fallback | Sees existing text |
| GenUI LLM times out | Exception caught → text fallback | Sees existing text |
| RovoDev unavailable | 503 error before streaming starts | Error response |

---

## Onboarding Demo Verification (QA-006)

### Q1: Total Compensation (total-compensation.ts)

| Assertion | Status |
| --- | --- |
| Tabbed UI with distinct tab content | Tabs component with 3 tabs: Compensation Breakdown, Benefits Details, Equity Schedule |
| At least one chart | PieChart (compensation distribution) + BarChart (monthly benefits, cumulative equity) |
| At least one table | Table in each tab (compensation, benefits, equity) |
| State bindings | `$state` references to `/compensationData`, `/benefitsBreakdown`, `/equitySchedule` |

### Q2: Onboarding Milestones (onboarding-milestones.ts)

| Assertion | Status |
| --- | --- |
| Timeline with ordered milestones | Timeline component with 11 items from "Before Day 1" to "Day 90" |
| Clear labels and detail rows | Each item has `title`, `description`, `date`, `status` |
| Start to end period | Pre-boarding → Day 90 |
| Progress tracker | ProgressTracker with Pre-boarding (done), Week 1 (current), Month 1 (todo), Month 2-3 (todo) |

### Q3: Flex Wallet (flex-wallet.ts)

| Assertion | Status |
| --- | --- |
| Sliders render | 5 Slider components (Wellness, Learning, Equipment, Commuter, Charity) with `$bindState` |
| Radios render | RadioGroup for reimbursement frequency (Monthly/Quarterly/Annual) with `$bindState` |
| Checkboxes render | 2 Checkbox components (rollover, tax optimization) with `$bindState` |
| Output changes on control change | State bindings (`$bindState`) enable two-way data flow |
| Summary section | BarChart + action buttons (Reset, Confirm) |

### Q4: Financial Plan (financial-plan.ts)

| Assertion | Status |
| --- | --- |
| Accordion sections | AccordionForm with 5 sections: Income, Tax, Expenses, Savings, Leave |
| Input groups | TextInput, Slider, SelectInput across all sections with `$bindState` |
| Computed plan summary | Card with Grid of 6 Metrics: Gross Income, After-Tax, Expenses, Savings, Discretionary, Leave |
| Expand/collapse | AccordionForm component with `defaultOpenValues: ["income"]` |

---

## Clarification Flow Verification (QA-007)

### Question Card Dismiss → Backend Notification

1. User clicks "Skip" → `dismissQuestionCard()` fires (use-dismissible-cards.ts:59-63)
2. `onDismissQuestionCard` callback invoked with the active question card payload
3. `handleClarificationDismiss()` calls `buildClarificationDismissPrompt()` → produces dismiss message
4. `sendPrompt(dismissPrompt, { source: "clarification-submit", visibility: "hidden" })` sends to backend
5. Backend receives as a regular chat message with `clarification-submit` source
6. Backend streams to RovoDev → RovoDev responds (server.js:5924-5967)
7. RovoDev's response streams back to user

### Submitted Answers Re-enter Workflow

1. User fills answers → `handleClarificationSubmit()` fires
2. `createClarificationSubmission()` formats answers
3. `buildClarificationSummaryPrompt()` builds summary text
4. `sendPrompt(clarificationPrompt, { source: "clarification-submit", clarification: submission })` sends to backend
5. Backend detects `clarification-submit` source (server.js:2919)
6. `adaptClarificationAnswersForToolContract()` converts to RovoDev format (server.js:2974-2977)
7. Enriched context appended to context description (server.js:2980-2982)
8. Message enters normal RovoDev flow → tools may be called → two-step GenUI may trigger
