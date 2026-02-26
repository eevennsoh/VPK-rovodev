# Output Routing — Codebase Exploration Document

> Generated for agent team reference. Covers all 18 key areas from the PRD.

---

## Table of Contents

1. [backend/server.js — Chat SDK Handler](#1-backendserverjs--chat-sdk-handler)
2. [backend/lib/smart-generation-intent.js — Classifier](#2-backendlibsmart-generation-intentjs--classifier)
3. [backend/lib/genui-chat-handler.js — GenUI LLM Call](#3-backendlibgenui-chat-handlerjs--genui-llm-call)
4. [backend/lib/genui-spec-utils.js — Spec Analysis](#4-backendlibgenui-spec-utilsjs--spec-analysis)
5. [backend/lib/genui-system-prompt.js — System Prompt](#5-backendlibgenui-system-promptjs--system-prompt)
6. [backend/lib/rovodev-gateway.js — RovoDev Streaming](#6-backendlibrovodev-gatewayjs--rovodev-streaming)
7. [backend/lib/rovodev-client.js — V3 API Client](#7-backendlibrovodev-clientjs--v3-api-client)
8. [backend/lib/question-card-extractor.js — Question Card Extraction](#8-backendlibquestion-card-extractorjs--question-card-extraction)
9. [lib/rovo-ui-messages.ts — Data Part Types](#9-librovo-ui-messagests--data-part-types)
10. [lib/plan-run-types.ts — Agent Run Types](#10-libplan-run-typests--agent-run-types)
11. [app/contexts/context-rovo-chat.tsx — Frontend Chat Context](#11-appcontextscontext-rovo-chattsx--frontend-chat-context)
12. [components/templates/shared/hooks/use-dismissible-cards.ts — Card Dismiss](#12-componentstemplatessharedhooksuse-dismissible-cardsts--card-dismiss)
13. [components/templates/shared/lib/question-card-widget.ts — Question Card Widget Lib](#13-componentstemplatessharedlibquestion-card-widgetts--question-card-widget-lib)
14. [components/blocks/question-card/ — Question Card Component](#14-componentsblocksquestion-card--question-card-component)
15. [components/blocks/generative/ — Generative Block](#15-componentsblocksgenerative--generative-block)
16. [components/templates/shared/components/generative-widget-card.tsx — GenUI Card Rendering](#16-componentstemplatessharedcomponentsgenerative-widget-cardtsx--genui-card-rendering)
17. [lib/json-render/ — JsonRenderView and Progressive Spec](#17-libjson-render--jsonrenderview-and-progressive-spec)
18. [rovo/config.js — System Prompt Builder](#18-rovoconfigjs--system-prompt-builder)

---

## 1. backend/server.js — Chat SDK Handler

**File**: `backend/server.js` (~5430 lines)

### Key Function: `POST /api/chat-sdk` (line ~2831)

This is the main chat endpoint. It orchestrates the entire response lifecycle.

#### Entry Point Flow

1. **Parse request** — Extracts `messages`, `contextDescription`, `userName`, `clarification`, `approval`, `planMode`, `planRequestId`, `creationMode`, `smartGeneration`, `hasQueuedPrompts`, `portIndex` from `req.body`.

2. **Smart generation routing** (lines ~3040-3180) — When `smartGeneration.enabled` is true:
   - Runs `classifySmartGenerationIntent()` (LLM classifier, 1500ms timeout)
   - If intent is `image`/`audio`/`genui`/`both`, enters the smart generation branch
   - For `image` intent: routes to Google AI Gateway for image generation
   - For `genui`/`both` intent: calls `generateSmartGenuiResult()`
   - For `audio`/`both` intent: calls sound synthesis

3. **Smart clarification gate** (lines ~3100-3178) — Runs a separate LLM classifier to decide if clarification questions are needed before generating. If yes, emits a question card widget and returns early.

4. **RovoDev streaming** (lines ~4630-4923) — The main RovoDev path:
   - Calls `streamViaRovoDev()` with callbacks:
     - `onTextDelta: handleStreamTextDelta` — processes text buffer for widget markers
     - `onToolCallStart: emitRequestUserInputQuestionCard` — detects `request_user_input` tool calls
     - `onThinkingStatus` — forwards thinking labels to client
     - `onThinkingEvent` — forwards tool timeline events

5. **Post-stream processing** (lines ~4926-5270):
   - Processes remaining text buffer
   - Extracts fallback question cards from assistant text if no explicit card was emitted
   - Extracts plan widgets from structured text
   - **Tool-first GenUI** (lines ~5085-5198): When `toolFirstPolicy.matched` and tools succeeded, calls `generateSmartGenuiResult()` and emits GenUI widget
   - Generates suggested questions
   - Emits `data-turn-complete`

#### Current `generateSmartGenuiResult()` (line 958)

```js
async function generateSmartGenuiResult({ roleMessages, provider, gatewayUrl, layoutContext }) {
    const systemPrompt = getGenuiSystemPrompt({ strict: true, layoutContext });
    const conversationPrompt = roleMessages.map(msg => `[${msg.role}]\n${msg.content}`).join("\n\n");
    const rawText = await generateTextViaGateway({ system: systemPrompt, prompt: conversationPrompt, ... });
    const { meta, body } = parseGenuiMetaAndBody(rawText);
    const analysis = analyzeGeneratedText(body);
    const bestSpec = pickBestSpec(analysis);
    return { rawText, meta, spec: bestSpec, narrative: stripSpecBlocks(body) };
}
```

**Returns**: `{ rawText: string, meta: object|null, spec: Spec|null, narrative: string }`

#### Widget Emission Pattern

The server uses `createUIMessageStream` + `pipeUIMessageStreamToResponse` from the `ai` package. Widget emission uses the `writer` object:

```js
// Loading state
writer.write({ type: "data-widget-loading", id: widgetId, data: { type: "genui-preview", loading: true } });

// Data payload
writer.write({ type: "data-widget-data", id: widgetId, data: { type: "genui-preview", payload: { spec, summary, source } } });

// Loading complete
writer.write({ type: "data-widget-loading", id: widgetId, data: { type: "genui-preview", loading: false } });

// Error
writer.write({ type: "data-widget-error", id: widgetId, data: { type: "genui-preview", message: "...", canRetry: true } });
```

#### Tool Call Detection

Tool calls from RovoDev are detected in two ways:

1. **`onToolCallStart` callback** in `streamViaRovoDev()` — receives `{ toolName, toolCallId, toolInput }`. Currently used ONLY for `request_user_input` detection via `isRequestUserInputTool()`.

2. **`onThinkingEvent` callback** — receives structured tool timeline events. Sets `hasObservedToolExecution = true` when any tool event is detected.

3. **Text buffer markers** — `WIDGET_LOADING:type` and `WIDGET_DATA:json` patterns in the text stream are parsed by `processTextBuffer()`.

#### Question Card Emission in chat-sdk

The `emitRequestUserInputQuestionCard()` function (line ~4199):
- Checks if `toolCall.toolName` is a `request_user_input` tool
- Calls `buildQuestionCardPayloadFromRequestUserInput(toolCall.toolInput, ...)`
- Emits `widget-loading` then `widget-data` with type `CLARIFICATION_WIDGET_TYPE` ("question-card")
- Sets `hasEmittedQuestionCard = true`

Post-stream fallback (line ~4980): If no explicit question card was emitted, `extractQuestionCardPayloadFromAssistantText()` tries to parse questions from the assistant's text response.

#### Key State Variables in chat-sdk Handler

- `hasObservedToolExecution` — Set true when any tool-call event is seen
- `hasEmittedQuestionCard` — Set true when a question card widget is emitted
- `hasEmittedPlanWidget` — Set true when a plan widget is emitted
- `hasSeenPlanWidgetSignal` — Set true when a plan-related signal is detected
- `widgetType` — Current widget type string
- `toolFirstPolicy` — Tool-first enforcement config
- `toolFirstExecutionState` — Tracks tool execution metrics for retry logic
- `smartRoutingActive` — Whether smart generation routing is enabled

#### Constants

```js
const SMART_WIDGET_TYPE_GENUI = "genui-preview";
const SMART_WIDGET_TYPE_AUDIO = "audio-preview";
const SMART_WIDGET_TYPE_IMAGE = "image-preview";
const CLARIFICATION_WIDGET_TYPE = "question-card"; // defined elsewhere
```

---

## 2. backend/lib/smart-generation-intent.js — Classifier

**File**: `backend/lib/smart-generation-intent.js` (241 lines)

### Current Categories

```js
const SMART_GENERATION_INTENTS = new Set(["normal", "genui", "audio", "image", "both"]);
```

### Classifier System Prompt

```
Classify the latest user request into exactly one intent:
- normal: regular conversation, Q&A, or discussion with no generation action
- genui: request to generate/build/create UI, interface, layout, component, etc.
- audio: request to generate voice/audio narration, TTS, etc.
- image: request to generate/create/draw an image, illustration, etc.
- both: request that explicitly needs both UI generation and audio generation

Rules:
- Prefer genui when the request can reasonably be represented as a simple dynamic UI
- Choose normal when the request requires fetching/querying real data from external services (Google Calendar, Jira, Confluence, etc.)
- Choose normal when plain text clearly serves better
```

### Key Functions

```js
classifySmartGenerationIntent({ latestUserMessage, conversationHistory, classify, timeoutMs = 800 })
// Returns: { intent, confidence, reason, rawOutput, error, timedOut }

normalizeIntent(value)  // Maps fuzzy strings to canonical intent
parseClassification(rawText)  // Extracts { intent, confidence, reason } from LLM JSON
buildClassifierPrompt({ latestUserMessage, conversationHistory })  // Builds classifier user prompt
```

### PRD Impact

The PRD says to:
- Remove `genui` and `both` from the classifier — tool usage determines GenUI trigger
- Classifier prompt updated to only classify: `normal` | `audio` | `image`
- Retain only for media intent detection (image/audio bypass)

---

## 3. backend/lib/genui-chat-handler.js — GenUI LLM Call

**File**: `backend/lib/genui-chat-handler.js` (850 lines)

### Purpose

Handles the `POST /api/genui-chat` endpoint. This is the **standalone GenUI generation endpoint** (separate from the chat-sdk inline generation).

### Key Function: `genuiChatHandler(req, res, options)`

```
Input: { messages: [{ role, content }], strictSpec?, allowWebLookup?, layoutContext?, streamResponse? }
Output: Streamed text response with embedded ```spec blocks
```

#### Flow

1. Normalizes messages, extracts last user prompt
2. Determines requirements (chart component detection)
3. Gets GenUI system prompt via `getGenuiSystemPrompt()`
4. Calls `generateAssistantText()` which routes to RovoDev or AI Gateway
5. Analyzes output with `analyzeGeneratedText()`
6. If renderable → returns; if not → retries with strict prompt
7. If still failing → tries web lookup retry
8. If still failing → tries synthesis (placeholder generation)
9. Final failure → returns guidance text

### Key Internal Function: `generateAssistantText()`

```js
async function generateAssistantText({
    systemPrompt, messages, onTextDelta, rovoDevAvailable, fallbackEnabled, aiGatewayProvider
})
```

Routes to RovoDev (`streamViaRovoDev` or `generateTextViaRovoDev`) or AI Gateway fallback.

### PRD Impact

The PRD wants to **extract** the GenUI LLM call logic from this file into a reusable handler that can be called from `server.js` in the two-step flow. The current `generateSmartGenuiResult()` in `server.js` already does something similar but with `generateTextViaGateway()` instead.

---

## 4. backend/lib/genui-spec-utils.js — Spec Analysis

**File**: `backend/lib/genui-spec-utils.js` (294 lines)

### Key Functions

```js
analyzeGeneratedText(rawText)
// Returns: {
//   rawText, patchCount, patchApplyErrors,
//   spec, validation, renderable,
//   fixedSpec, fixedValidation, fixedRenderable,
//   synthesizedSpec, synthesizedValidation, synthesizedRenderable,
//   synthesizedChildCount, missingChildKeys, fixes
// }

pickBestSpec(analysis)
// Returns: spec | fixedSpec | synthesizedSpec | null (best renderable option)

getMissingChildReferences(spec)
// Returns: Array<{ parentKey, childKey }>

sanitizeSpec(spec)
// Returns: normalized spec with clamped root padding

synthesizeMissingChildren(spec)
// Returns: { spec, validation, renderable, synthesizedChildCount, missingChildKeys }
```

### Data Flow

1. `analyzeGeneratedText(rawText)` uses `createMixedStreamParser` from `@json-render/core` to parse `\`\`\`spec` blocks and apply RFC 6902 patches
2. Validates compiled spec
3. If not renderable, tries `autoFixSpec()` and `synthesizeMissingChildren()`
4. `pickBestSpec()` returns the best renderable variant

### Dependencies

- `@json-render/core`: `applySpecPatch`, `autoFixSpec`, `createMixedStreamParser`, `validateSpec`

---

## 5. backend/lib/genui-system-prompt.js — System Prompt

**File**: `backend/lib/genui-system-prompt.js` (298 lines)

### Key Functions

```js
getGenuiSystemPrompt({ strict?, webContext?, layoutContext? })
// Returns: string (full system prompt with catalog + VPK rules + companion examples + layout context)

getGenuiSummarySystemPrompt()
// Returns: string (for plan visual summary generation)
```

### Layout Context

```js
normalizeLayoutContext(value)
// Normalizes: { surface, containerWidthPx, viewportWidthPx, widthClass }
// widthClass: "compact" | "regular" | "wide" (inferred from width or surface)
```

Layout context affects prompt: compact layouts get vertical stacking rules, wide layouts get multi-column rules.

### Prompt Structure

1. Generated catalog prompt (from `generated-catalog-prompt.json` — 68 components, Zod schemas)
2. VPK-specific rules (map generation, chart placement, spacing, 3D filtering, Atlassian context, output quality)
3. Companion examples (4 complete spec examples)
4. Layout context rules
5. Strict output requirements (for retries)
6. Web context (optional)

---

## 6. backend/lib/rovodev-gateway.js — RovoDev Streaming

**File**: `backend/lib/rovodev-gateway.js` (~1310 lines)

### Key Function: `streamViaRovoDev()`

```js
async function streamViaRovoDev({
    message,                // Full message to send
    onTextDelta,            // Text chunk callback
    onThinkingStatus,       // Thinking label/content callback
    onThinkingEvent,        // Structured tool timeline event callback
    onToolCallStart,        // Tool-call start callback (name, id, input)
    onRetry,                // 409 retry indicator
    onRetryProgress,        // 409 retry progress
    conflictPolicy,         // "cancel-and-retry" | "wait-for-turn"
    signal,                 // AbortSignal
    port,                   // Explicit port
    portIndex,              // Sticky port index
    onPortAcquired,         // Port acquisition callback
})
// Returns: Promise<void>
```

#### Tool Call Detection Inside streamViaRovoDev

The function processes SSE chunks from RovoDev. For each chunk:

- **`chunk.type === "tool_call"`**: Extracts `toolName`, `toolCallId`, `toolInput`. Calls `onToolCallStart(...)`. Emits thinking status/event for tool start.
- **`chunk.type === "tool_result"` or `"tool_error"`**: Extracts `toolName`, output. Emits thinking status/event for tool completion/error.
- **`chunk.type === "text_delta"` or `"content_block_delta"`**: Calls `onTextDelta(chunk.text)`.

#### Tool Name Resolution

```js
const resolvedToolName = chunk.toolName || toolNameByCallId.get(chunk.toolCallId) || "Tool";
```

A `Map<toolCallId, toolName>` tracks tool names across start/result events.

#### Exposed Tool Information

The `onToolCallStart` callback receives:
```js
{
    toolName: string,
    toolCallId: string | undefined,
    toolInput: unknown
}
```

**Important**: `onToolCallStart` is currently ONLY used for `request_user_input` detection. The PRD wants it used for ALL tool calls to trigger the two-step GenUI flow.

### Other Key Function: `generateTextViaRovoDev()`

```js
async function generateTextViaRovoDev({
    system, prompt, conflictPolicy, timeoutMs, ...options
})
// Returns: string (full response text)
```

Non-streaming variant. Wraps streaming internally and concatenates chunks.

---

## 7. backend/lib/rovodev-client.js — V3 API Client

**File**: `backend/lib/rovodev-client.js` (~730 lines)

### V3 API Flow

Two-step API:
1. `POST /v3/set_chat_message` — Sets the message
2. `GET /v3/stream_chat` — Streams the response (SSE)

### SSE Event Types from RovoDev

```
event: content_block_delta    → { type: "content_block_delta", delta: { text } }
event: tool_use               → { type: "tool_call", toolName, toolCallId, toolInput }
event: tool_result            → { type: "tool_result", toolCallId, output }
event: tool_error             → { type: "tool_error", toolCallId, errorText }
event: thinking_status        → { label, content, activity }
event: message_stop           → End of message
```

### Key Functions

```js
sendMessageStreaming({ message, port, signal, onChunk })
// Processes SSE events and calls onChunk for each parsed event

sendMessageSync({ message, port })
// Returns full response text

cancelChat(port?)
// POST /v3/cancel

getRovoDevPort()
// Returns port from ROVODEV_PORT env var
```

---

## 8. backend/lib/question-card-extractor.js — Question Card Extraction

**File**: `backend/lib/question-card-extractor.js` (288 lines)

### Purpose

Extracts question-card data from **plain-text** assistant responses (fallback when `request_user_input` tool is not used). This is distinct from the tool-based question card path.

### Key Functions

```js
extractQuestionCardDefinitionFromAssistantText(rawText, defaults?)
// Returns: { type: "question-card", title, description, questions: [{ id, label, description, required, kind }] } | null

resolveFallbackQuestionCardState({ isPostClarificationTurn, clarificationSubmission, previousQuestionCard, fallbackSessionId, maxRounds })
// Returns: { sessionId, round, maxRounds, canEmit: boolean }
```

### Detection Logic

1. Checks for **clarification signal pattern** (regex for "let me ask", "few questions", "clarify", etc.)
2. Collects **numbered question blocks** (`1. question text?`) or bold-header blocks
3. Parses each block into `{ label, description }` pairs
4. Requires `MIN_QUESTION_COUNT` (2) questions to trigger
5. Maximum `DEFAULT_MAX_QUESTIONS` (4)

### PRD Impact

This is the **fallback** text-based extraction. The PRD's primary path uses `request_user_input` tool calls intercepted by `emitRequestUserInputQuestionCard()` in server.js.

---

## 9. lib/rovo-ui-messages.ts — Data Part Types

**File**: `lib/rovo-ui-messages.ts` (~400 lines)

### Type Definitions

```ts
type RovoDataParts = {
    "widget-loading":    { type?: string; loading: boolean };
    "widget-data":       { type?: string; payload: unknown };
    "widget-error":      { type?: string; message: string; canRetry?: boolean };
    "suggested-questions": { questions: string[] };
    "thinking-status":   { label: string; content?: string; activity?: ThinkingStatusActivity; source?: ThinkingStatusSource };
    "thinking-event":    ThinkingEventUpdate;
    "tool-first-warning": ToolFirstWarningData;
    "agent-execution":   AgentExecutionUpdate;
    "turn-complete":     { timestamp: string };
};

type RovoUIMessage = UIMessage<RovoMessageMetadata, RovoDataParts>;
type ThinkingStatusActivity = "image" | "audio" | "ui" | "data" | "results";
type ThinkingStatusSource = "backend" | "fallback";

interface RovoMessageMetadata {
    visibility?: "visible" | "hidden";
    source?: "clarification-submit" | "plan-approval-submit" | "agent-directive" | "plan-retry";
}
```

### Key Helper Functions

```ts
getLatestDataPart<KEY>(message, type)    // Gets latest data part of a specific type
isRenderableRovoUIMessage(message)       // Checks visibility !== "hidden"
createAssistantTextMessage(id, content)  // Creates simple assistant text message
getLatestUserMessageId(messages)         // Gets ID of latest user message
```

### PRD Impact

May need new data part types or extensions for:
- Output routing metadata (which experience was selected)
- Tool-call context forwarding to GenUI

---

## 10. lib/plan-run-types.ts — Agent Run Types

**File**: `lib/plan-run-types.ts` (~300 lines)

Contains type definitions for agent team runs. Not directly involved in the output routing feature, but shares the data part system.

---

## 11. app/contexts/context-rovo-chat.tsx — Frontend Chat Context

**File**: `app/contexts/context-rovo-chat.tsx` (~900 lines)

### Purpose

Wraps `useChat` from `@ai-sdk/react` and provides Rovo-specific chat state management.

### Key Interface: `SendPromptOptions`

```ts
interface SendPromptOptions {
    contextDescription?: string;
    userName?: string;
    messageMetadata?: RovoMessageMetadata;
    clarification?: unknown;        // ClarificationSubmission
    approval?: unknown;
    planMode?: boolean;
    planModeSource?: "plan-toggle";
    planRequestId?: string;
    creationMode?: "skill" | "agent";
    smartGeneration?: {
        enabled?: boolean;
        surface?: string;
        containerWidthPx?: number;
        viewportWidthPx?: number;
        widthClass?: "compact" | "regular" | "wide";
    };
}
```

### Data Part Handling

The context processes received data parts from the backend:
- `widget-loading` / `widget-data` / `widget-error` → forwarded to message parts
- `thinking-status` / `thinking-event` → thinking visualization state
- `suggested-questions` → suggestion chips
- `turn-complete` → advances prompt queue
- `tool-first-warning` → tool relevance warnings

### Message Transport

Uses `DefaultChatTransport` from `ai` pointing to `/api/chat-sdk`. Body is built via `buildSendMessageBody()` which includes all `SendPromptOptions` fields plus `hasQueuedPrompts`.

### Key Functions

```ts
buildSendMessageBody(options, hasQueuedPrompts)  // Constructs request body
sanitizeRovoUiMessages(messages)                   // Filters invalid parts
sanitizeMessagesForTransport(messages)              // Strips data URLs for transport
estimateChatRequestBytes(messages, body)            // Size estimation for trimming
```

### PRD Impact

- Need to handle new routing behavior where tool-backed responses suppress text and show GenUI
- Question Card composer takeover behavior
- Skip/dismiss backend notification
- Clarification submission flow already works via `clarification` field in `SendPromptOptions`

---

## 12. components/templates/shared/hooks/use-dismissible-cards.ts — Card Dismiss

**File**: `components/templates/shared/hooks/use-dismissible-cards.ts` (74 lines)

### Interface

```ts
interface UseDismissibleCardsOptions {
    activeQuestionCard: ParsedQuestionCardPayload | null;
    activePlanWidget: ParsedPlanWidgetPayload | null;
}

interface UseDismissibleCardsReturn {
    shouldShowQuestionCard: boolean;
    shouldShowApprovalCard: boolean;
    hasBottomOverlayCard: boolean;
    activeQuestionCardKey: string | null;
    activePlanKey: string | null;
    dismissQuestionCard: () => void;
    dismissApprovalCard: () => void;
}
```

### Behavior

- Tracks dismissed keys via `useState`
- Question card key: `${sessionId}-${round}`
- Plan key: `${title}-${taskIds.join("|")}`
- Question card takes priority over approval card
- `shouldShowQuestionCard` = card exists AND not dismissed
- `shouldShowApprovalCard` = no question card visible AND plan exists AND not dismissed

### PRD Impact

Currently dismiss is **client-side only**. The PRD requires:
- On dismiss/skip, send a notification to the backend
- Backend forwards to RovoDev so it can decide how to respond

---

## 13. components/templates/shared/lib/question-card-widget.ts — Question Card Widget Lib

**File**: `components/templates/shared/lib/question-card-widget.ts` (~410 lines)

### Types

```ts
interface ParsedQuestionCardPayload {
    type: "question-card";
    sessionId: string;
    round: number;
    maxRounds: number;
    title: string;
    description?: string;
    requiredCount: number;
    questions: ParsedQuestionCardQuestion[];
}

interface ParsedQuestionCardQuestion {
    id: string;
    label: string;
    header?: string;
    description?: string;
    required: boolean;
    kind: QuestionKind;      // "single-select" | "multi-select" | "text"
    options: ParsedQuestionCardOption[];
    placeholder?: string;
}

interface ClarificationSubmission {
    sessionId: string;
    round: number;
    answers: ClarificationAnswers;
    completed: boolean;
}
```

### Key Functions

```ts
parseQuestionCardPayload(value: unknown): ParsedQuestionCardPayload | null
// Parses raw widget payload into typed question card

createClarificationSubmission(questionCard, answers): ClarificationSubmission
// Creates submission object from card + answers

buildClarificationSummaryPrompt(questionCard, answers): string
// Builds user message text from answers for re-submission to RovoDev

adaptAnswersForToolContract(answers, questions): Record<string, string[]>
// Maps ID-keyed answers to label-keyed arrays for tool contract

getLatestQuestionCardPayload(messages): ParsedQuestionCardPayload | null
// Scans messages for most recent question-card widget-data part

hasRequiredClarificationAnswers(questionCard, answers): boolean
// Checks all required questions are answered
```

### PRD Impact

These functions are the core of the clarification flow and will be reused as-is. The PRD adds:
- Composer takeover when a question card is active
- Skip notification to backend
- Skip/dismiss policy tracking

---

## 14. components/blocks/question-card/ — Question Card Component

**File listing**:
```
components/blocks/question-card/
  page.tsx            — Block preview/demo page
  components/
    question-card.tsx — Main QuestionCard component
```

### QuestionCard Component

The main component renders the question card UI with:
- Title and description
- Question items (single-select with options, multi-select, text input)
- Submit and skip buttons
- Answer state management

### Props

```tsx
interface QuestionCardProps {
    payload: ParsedQuestionCardPayload;
    onSubmit: (submission: ClarificationSubmission) => void;
    onDismiss?: () => void;
    disabled?: boolean;
}
```

### PRD Impact

- Component exists and works
- Needs to be integrated into the composer takeover pattern
- `onDismiss` callback needs to send backend notification (currently just dismisses locally)

---

## 15. components/blocks/generative/ — Generative Block

**File listing**:
```
components/blocks/generative/
  page.tsx            — Block preview/demo page
  components/
    generative-card.tsx
    generative-card-footer.tsx
    generative-card-header.tsx
    generative-card-content.tsx
    generative-card-body.tsx
```

### Purpose

The standalone generative card block used for the component library preview. The actual chat-integrated generative widget card is in `components/templates/shared/components/generative-widget-card.tsx`.

---

## 16. components/templates/shared/components/generative-widget-card.tsx — GenUI Card Rendering

**File**: `components/templates/shared/components/generative-widget-card.tsx` (434 lines)

### Purpose

Renders GenUI widget cards inline in chat messages. Supports three body types: genui-preview (json-render spec), audio-preview, and image-preview.

### Key Component: `GenerativeWidgetCard`

```tsx
interface GenerativeWidgetCardProps {
    widgetType: string;       // "genui-preview" | "audio-preview" | "image-preview"
    widgetData: unknown;      // Parsed widget payload
    className?: string;
    onPrimaryAction?: (payload: GenerativeWidgetPrimaryActionPayload) => Promise<void> | void;
}
```

### Rendering Flow

1. `parseGenerativeWidget(widgetType, widgetData)` → `ParsedGenerativeWidget` (typed union)
2. `resolveGenerativeWidgetMetadata(parsedWidget)` → `{ title, description, contentType, primaryActionLabel }`
3. Body rendered by `renderWidgetBody()` which dispatches to:
   - `GenuiBody` → `JsonRenderView` + `useProgressiveSpec`
   - `AudioBody` → `AudioPlayerElement`
   - `ImageBody` → `next/image` grid
4. Shell uses `GenerativeCard` compound component with header, body, content, footer
5. "Open preview" dialog with full-size rendering

### Key Sub-components

- `GenerativeWidgetCardShell` — Card layout with header (content type tile, title, description), body, footer (open preview + primary action)
- `GenuiBody` — Uses `JsonRenderView` from `lib/json-render/renderer.tsx` and `useProgressiveSpec` for progressive element reveal
- Dialog preview with scrollable content

### State Management

- `genuiState` — Tracks form state changes from interactive spec elements
- `immutableSetByPath()` — Immutable JSON path updates for state changes
- `handleGenuiStateChange` — Callback passed to `JsonRenderView.onStateChange`

---

## 17. lib/json-render/ — JsonRenderView and Progressive Spec

### renderer.tsx (lib/json-render/renderer.tsx, ~130 lines)

```tsx
function JsonRenderView({
    spec: Spec,
    skipValidation?: boolean,
    onStateChange?: (path: string, value: unknown) => void,
}): ReactNode
```

Internals:
1. `toRenderableSpec(spec)` — validates, auto-fixes, normalizes root padding
2. If renderable → renders via `<JSONUIProvider><Renderer /></JSONUIProvider>` from `@json-render/react`
3. Uses `registry` for component resolution

Key helpers:
- `hasRenderableShape(spec)` — checks root + elements exist
- `normalizeRootStackPadding(spec)` — clamps root Stack padding to 0
- `toRenderableSpec(spec)` — validates + auto-fixes → renderable or null

### use-progressive-spec.ts (lib/json-render/use-progressive-spec.ts, 133 lines)

```ts
function useProgressiveSpec(spec: Spec | null, enabled = true, intervalMs = 40): {
    progressiveSpec: Spec | null;
    isProgressing: boolean;
}
```

Behavior:
- For specs with <= 3 elements: renders immediately
- For larger specs: progressive reveal using depth-first traversal
- Batch 1: root + first child (minimally valid spec)
- Remaining elements added one per animation frame with `intervalMs` delay
- When done, returns original spec reference for memo stability

---

## 18. rovo/config.js — System Prompt Builder

**File**: `rovo/config.js` (44 lines)

### Purpose

Formats user messages for RovoDev, including the clarification protocol instruction.

### Key Function: `buildUserMessage(message, conversationHistory, contextDescription)`

Appends `REQUEST_USER_INPUT_INSTRUCTION` to every message sent to RovoDev:

```
[Clarification Protocol]
When you need to ask the user clarifying questions before proceeding,
you MUST use the `request_user_input` tool instead of writing questions as plain text.
The tool renders an interactive question card in the UI...
[End Clarification Protocol]
```

This ensures RovoDev uses the `request_user_input` tool for clarification rather than plain text questions.

---

## Cross-Cutting Data Flow Summary

### Current Flow: Normal Text Response

```
User message → context-rovo-chat.tsx (sendPrompt)
  → POST /api/chat-sdk (server.js)
    → buildUserMessage (rovo/config.js)
    → streamViaRovoDev (rovodev-gateway.js)
      → sendMessageStreaming (rovodev-client.js)
      → SSE events: text_delta → onTextDelta
    → processTextBuffer → emitTextDelta
    → writer.write({ type: "text-delta" })
  → SSE stream to frontend
  → useChat processes text parts
```

### Current Flow: Smart Generation (GenUI)

```
User message → POST /api/chat-sdk
  → classifySmartGenerationIntent (classifier LLM, 1500ms timeout)
  → If intent === "genui":
    → generateSmartGenuiResult (server.js:958)
      → getGenuiSystemPrompt (genui-system-prompt.js)
      → generateTextViaGateway (AI Gateway)
      → analyzeGeneratedText (genui-spec-utils.js)
      → pickBestSpec → spec
    → writer.write({ type: "data-widget-data", data: { type: "genui-preview", payload: { spec } } })
```

### Current Flow: Tool-First GenUI (Post-Stream)

```
User message → POST /api/chat-sdk
  → streamViaRovoDev (RovoDev processes message, calls tools)
  → onThinkingEvent → hasObservedToolExecution = true
  → Post-stream: if toolFirstPolicy.matched && hasRelevantToolSuccess:
    → generateSmartGenuiResult (with tool context appended)
    → writer.write({ type: "data-widget-data", data: { type: "genui-preview", payload: { spec } } })
```

### Current Flow: Question Card (from Tool)

```
User message → POST /api/chat-sdk
  → streamViaRovoDev → RovoDev calls request_user_input tool
  → onToolCallStart callback in streamViaRovoDev
  → emitRequestUserInputQuestionCard (server.js:4199)
    → buildQuestionCardPayloadFromRequestUserInput
    → writer.write({ type: "data-widget-data", data: { type: "question-card", payload } })
  → Frontend: getLatestQuestionCardPayload → renders QuestionCard
  → User answers → createClarificationSubmission + buildClarificationSummaryPrompt
  → Re-sends to POST /api/chat-sdk with clarification field
```

### Current Flow: Question Card (Fallback Text Extraction)

```
User message → POST /api/chat-sdk
  → streamViaRovoDev → RovoDev responds with plain text questions
  → Post-stream: if !hasEmittedQuestionCard:
    → extractQuestionCardPayloadFromAssistantText (question-card-extractor.js)
    → If questions found → writer.write widget-loading + widget-data
```

---

## PRD Implementation Mapping

### What changes per the PRD:

| Area | Current State | PRD Target |
|------|--------------|------------|
| **Classifier** | 5 intents (normal, genui, audio, image, both) | 3 intents (normal, audio, image) — genui removed |
| **GenUI trigger** | Smart generation classifier + tool-first post-stream | Tool-call detection during RovoDev stream |
| **Two-step flow** | Does not exist as described | RovoDev → detect tools → suppress text → GenUI LLM |
| **Text suppression** | Only suppresses large JSON dumps | Suppress ALL text when tools detected |
| **Question Card** | Renders inline in chat | Composer takeover (replaces chat input) |
| **Question Card skip** | Client-side only dismiss | Backend notification to RovoDev |
| **GenUI fallback** | Shows error card | Silent fallback to RovoDev text |
| **Media bypass** | LLM classifier (800ms timeout) | Regex/keyword pre-check (no LLM needed) |
| **Catalog prompt** | Sent for smart generation route | Only sent for two-step GenUI (after tool detection) |

### Key Files That Need Changes:

1. `backend/lib/smart-generation-intent.js` — Remove genui/both, add media regex
2. `backend/server.js` — New routing policy in chat-sdk handler
3. `backend/lib/genui-chat-handler.js` — Extract reusable GenUI call
4. `lib/rovo-ui-messages.ts` — Possible new types
5. `app/contexts/context-rovo-chat.tsx` — Question Card composer takeover, skip notification
6. `components/templates/shared/hooks/use-dismissible-cards.ts` — Backend dismiss notification
7. `components/templates/shared/components/generative-widget-card.tsx` — Inline GenUI rendering updates
8. `components/blocks/question-card/` — Composer integration

### Files Likely Unchanged:

- `backend/lib/genui-spec-utils.js` — Reused as-is
- `backend/lib/genui-system-prompt.js` — Reused as-is
- `backend/lib/rovodev-gateway.js` — API unchanged, just used differently
- `backend/lib/rovodev-client.js` — No changes needed
- `lib/json-render/renderer.tsx` — Reused as-is
- `lib/json-render/use-progressive-spec.ts` — Reused as-is
- `rovo/config.js` — Reused as-is
- `components/templates/shared/lib/question-card-widget.ts` — Reused as-is
