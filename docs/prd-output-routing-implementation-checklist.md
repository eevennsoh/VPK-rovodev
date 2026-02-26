# Output Routing PRD: Implementation Checklist

This checklist operationalizes `docs/prd-output-routing.md` into deliverable tasks.

## Scope

- Implement deterministic output routing in chat for:
	- Generative UI via `json-render` (default for actionable/toolable tasks).
	- Question Card flow when `ask_user_questions` is required.
	- Direct AI Gateway path for image and sound generation.
	- Text streaming for standard Q&A and all UI-failure fallback cases.

## Delivery Sequence

1. Foundation and contracts
2. Backend routing and orchestration
3. Frontend experience switching
4. End-to-end validation and rollout

## Work Breakdown

| Done | ID | Track | Task | Primary Files | Definition of Done |
| --- | --- | --- | --- | --- | --- |
| [ ] | FND-001 | Shared | Define canonical output experience enum and response envelope (`generative_ui`, `question_card`, `image`, `audio`, `text`) | `lib/rovo-ui-messages.ts`, `lib/plan-run-types.ts` | Types are versioned, imported by frontend and backend, no `any` in route payload handling |
| [ ] | FND-002 | Shared | Define `json-render` payload schema contract and validation utility | `lib/` schema utility (new), `backend/lib/` validation integration | Invalid payloads are rejected before render path selection is finalized |
| [ ] | FND-003 | Shared | Add route-decision reason codes for observability (`intent_media_image`, `intent_media_audio`, `intent_task_toolable`, `intent_text_default`, `fallback_ui_failed`) | `lib/rovo-ui-messages.ts`, `backend/server.js` | Every response includes decision reason metadata for analytics/debug |
| [ ] | FND-004 | Shared | Add schema-level support for onboarding demo widgets (`tabs`, `chart`, `table`, `timeline`, `calculator-controls`, `accordion-form`) | `lib/` schema utility (new), `lib/rovo-ui-messages.ts` | Schema can validate all 4 required UI patterns and reject malformed variants |
| [ ] | BE-001 | Backend | Implement deterministic policy order from PRD decision table | `backend/server.js`, `backend/lib/rovodev-gateway.js` | Runtime uses authoritative precedence with no conflicting branches |
| [ ] | BE-002 | Backend | Route image queries to direct AI Gateway image path (bypass RovoDev orchestration for output generation) | `backend/server.js`, `app/api/generate-image/route.ts` | Image intents return image experience payload and never invoke generative UI flow |
| [ ] | BE-003 | Backend | Route sound/audio queries to direct AI Gateway sound path (bypass RovoDev orchestration for output generation) | `backend/server.js`, `app/api/sound-generation/route.ts` | Audio intents return audio experience payload and never invoke generative UI flow |
| [ ] | BE-004 | Backend | Route actionable/toolable queries to RovoDev default path | `backend/server.js`, `backend/lib/rovodev-gateway.js` | Task/action prompts enter RovoDev tool-capable flow by default |
| [ ] | BE-005 | Backend | Map `ask_user_questions` tool output to Question Card data part contract | `backend/server.js`, `lib/rovo-ui-messages.ts` | Required question metadata is emitted in structured form consumable by Question Card |
| [ ] | BE-006 | Backend | Handle answered Question Card submission and re-run original task with merged context | `backend/server.js`, `backend/lib/rovodev-client.js` | Follow-up answers re-enter same workflow and can yield generative UI output |
| [ ] | BE-007 | Backend | Implement mandatory fallback to text streaming when generative UI generation/validation/render path fails | `backend/server.js` | User always receives text output on UI failures; error reason is logged |
| [ ] | BE-008 | Backend | Implement skip-question behavior policy (`cannot_continue` or `proceed_with_assumptions`) | `backend/server.js`, `rovo/config.js` | Skip scenarios follow PRD requirement and response explicitly communicates mode used |
| [ ] | BE-009 | Backend | Emit routing telemetry (route selected, tool path, fallback cause, completion type) | `backend/server.js`, `backend/lib/plan-runs.js` | Logs/metrics can calculate routing accuracy and fallback rate |
| [ ] | FE-001 | Frontend | Implement renderer switch by experience enum (Generative UI, Question Card, Image, Audio, Text) | `app/contexts/context-rovo-chat-plan.tsx`, `components/templates/shared/` | Each experience type maps to exactly one visual flow |
| [ ] | FE-002 | Frontend | Wire Question Card to `ask_user_questions` data part payload | `components/blocks/question-card/`, `app/contexts/context-rovo-chat-plan.tsx` | Question Card renders all required fields and supports submit/skip |
| [ ] | FE-003 | Frontend | Submit Question Card answers back to backend and preserve conversation context | `app/contexts/context-rovo-chat-plan.tsx`, `app/api/chat-sdk/route.ts` | Answers trigger retry run and append to thread correctly |
| [ ] | FE-004 | Frontend | Add media-specific output presentation for image and audio responses | `components/blocks/generative/`, `components/templates/fullscreen-chat/` | Image/audio outputs render with loading, success, and failure states |
| [ ] | FE-005 | Frontend | Implement explicit UI-to-text fallback presentation with user-facing explanation | `components/templates/shared/thread-message-bubble*`, `app/contexts/context-rovo-chat-plan.tsx` | Users can distinguish fallback from native text-only route |
| [ ] | FE-006 | Frontend | Ensure keyboard and screen-reader support for Question Card submit/skip path | `components/blocks/question-card/` | Keyboard-only completion works; semantic labels and focus order are valid |
| [ ] | FE-007 | Frontend | Ensure responsive behavior for all experience types in narrow viewport | `components/templates/fullscreen-chat/`, `components/templates/sidebar-chat/` | No clipped controls or inaccessible primary actions on mobile widths |
| [ ] | FE-008 | Frontend | Implement/verify `json-render` blocks for tabs + chart/table responses | `components/blocks/generative/`, `components/templates/shared/` | Tab switch updates content correctly and chart/table render within each tab panel |
| [ ] | FE-009 | Frontend | Implement/verify `json-render` timeline block for onboarding milestones | `components/blocks/generative/` | Timeline renders ordered milestones with clear labels and detail rows |
| [ ] | FE-010 | Frontend | Implement/verify calculator controls block (sliders/radios/checkboxes + computed output) | `components/blocks/generative/` | Control changes trigger deterministic recompute of summary values |
| [ ] | FE-011 | Frontend | Implement/verify accordion-form block with mixed input fields | `components/blocks/generative/` | Accordion sections expand/collapse and capture input values used in summary |
| [ ] | QA-001 | Validation | Build labeled prompt set covering all route classes and ambiguous mixed-intent prompts | `docs/` (new eval fixture doc), optional script under `scripts/` | Prompt set includes `TASK_GenerativeUI`, `TASK_Clarification`, `MEDIA_Image`, `MEDIA_Sound`, `TEXT_Standard`, `FALLBACK_Text` |
| [ ] | QA-002 | Validation | Run route accuracy benchmark and record baseline metrics | `docs/` benchmark report | Routing accuracy and tool-path correctness are reported against PRD thresholds |
| [ ] | QA-003 | Validation | Execute required project checks | Terminal commands | `pnpm run lint` and `pnpm tsc --noEmit` pass |
| [ ] | QA-004 | Validation | Perform UI verification matrix (light/dark, state coverage, edge cases, responsive, keyboard/a11y) | Browser + ADS tools | Visual and accessibility checks are captured and attached to implementation notes |
| [ ] | QA-005 | Validation | Validate fallback resilience by forcing Generative UI failures | Backend log + UI verification notes | Failure path reliably degrades to text without breaking session |
| [ ] | QA-006 | Validation | Run onboarding benefits E2E demo pack (Q1 tabs, Q2 timeline, Q3 calculator, Q4 accordion) | Browser flow + test notes under `docs/` | All 4 prompts route to `generative_ui` and render required UI controls/components |
| [ ] | QA-007 | Validation | Run clarification branch and skip branch during onboarding pack | Browser flow + backend logs | Question Card appears when context is missing; submit and skip behaviors both match PRD |

## Decision Table Traceability

Use this section to confirm each PRD rule is implemented.

| PRD Decision Rule | Implementation Tasks |
| --- | --- |
| Image intent -> AI Gateway image path | BE-002, FE-004, QA-001 |
| Sound intent -> AI Gateway sound path | BE-003, FE-004, QA-001 |
| Task/action/toolable -> RovoDev + Generative UI | BE-004, FE-001, QA-001 |
| Missing context -> `ask_user_questions` + Question Card | BE-005, FE-002, FE-003, QA-001 |
| Answers submitted -> retry and return Generative UI | BE-006, FE-003, QA-001 |
| Standard Q&A -> text streaming | BE-001, FE-001, QA-001 |
| Generative UI failure -> text fallback | BE-007, FE-005, QA-005 |

## Onboarding Demo Coverage Map

| Demo Question | Required UI Pattern | Build Tasks | Validation Tasks |
| --- | --- | --- | --- |
| Q1 total rewards breakdown | Tabs + chart/table | FND-004, FE-008 | QA-006 |
| Q2 first 90 days milestones | Timeline | FND-004, FE-009 | QA-006 |
| Q3 Flex Wallet allocator | Sliders + radios + checkboxes calculator | FND-004, FE-010 | QA-006 |
| Q4 first-year financial planner | Accordion with mixed input fields | FND-004, FE-011 | QA-006 |
| Missing context variant | Question Card | BE-005, BE-006, FE-002, FE-003 | QA-007 |
| Skip clarification variant | Cannot-continue or assumptions path | BE-008, FE-002, FE-003 | QA-007 |

## Milestones

| Milestone | Target Outcome | Exit Criteria |
| --- | --- | --- |
| MVP | Deterministic routing with all four experiences and fallback | FND-001..004, BE-001..008, FE-001..011, QA-001..007 complete |
| v1.1 | Better ambiguity handling and telemetry depth | BE-009 complete and route-debug reason coverage >= 95% |
| v2.0 | Feedback-based adaptive optimization | Documented optimization loop using misroute review outcomes |

## Release Gate (Must Pass)

- [ ] Routing accuracy meets PRD threshold (`>= 92%`).
- [ ] Tool-path correctness meets PRD threshold (`>= 95%`).
- [ ] Clarification trigger precision meets PRD threshold (`>= 90%`).
- [ ] Generative UI success meets PRD threshold (`>= 98%` where expected).
- [ ] Fallback continuity meets PRD threshold (`>= 99.5%`).
- [ ] `pnpm run lint` passes.
- [ ] `pnpm tsc --noEmit` passes.

## Implementation Notes Template

Copy this template into a working note or PR description:

```md
## Output Routing Checklist Progress

- Completed IDs:
- In-progress IDs:
- Blocked IDs:

## Validation

- Route accuracy:
- Tool-path correctness:
- Clarification precision:
- Generative UI success:
- Fallback continuity:

## Observed Issues

- 

## Follow-up Actions

- 
```
