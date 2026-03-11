# PRD: Unified Voice + Chat Session

## 1. Executive Summary

**Problem**: Live voice mode currently creates a separate conversation panel for GPT-Realtime, only injecting confirmed tasks into the main RovoDev chat. This creates a disjointed experience — the user mentally tracks two separate threads, messages get duplicated on delegation, and switching between voice and text input requires context switching between UI surfaces.

**Solution**: Merge all voice conversation messages into the single existing chat window. GPT-Realtime becomes a transparent routing layer when voice mode is active — the user sees one continuous thread where some responses come from GPT-Realtime (casual conversation) and others from RovoDev (task execution), but they look identical. Text input while voice mode is on routes through GPT-Realtime the same as speech does.

**Success Criteria**:
- Zero message duplication when GPT-Realtime delegates to RovoDev
- Voice and text input interchangeable mid-conversation when voice mode is active
- No visual distinction between GPT-Realtime and RovoDev messages (seamless handoff)
- Voice OFF mode behavior unchanged (text goes directly to RovoDev)
- All messages (Realtime + RovoDev) persist across page refresh

---

## 2. User Experience & Functionality

### User Personas

- **Rovo user**: Uses the future-chat surface to interact with RovoDev via text and occasionally voice for hands-free task delegation.

### User Stories

**US-1**: As a user with voice mode ON, I want my spoken conversation to appear in the main chat thread so I don't have to track a separate panel.
- **AC**: All GPT-Realtime user transcripts and assistant responses render as standard chat messages in the main message list.
- **AC**: No separate voice conversation panel exists.
- **AC**: User speech appears as a message bubble with streaming partial transcript (updating as `transcription_delta` arrives, finalized on `transcription_completed`).

**US-2**: As a user with voice mode ON, I want to type a text message and have it routed through GPT-Realtime, so I can seamlessly switch between speaking and typing without changing modes.
- **AC**: Pressing Enter/Submit while voice mode is ON sends the text to GPT-Realtime (not directly to RovoDev).
- **AC**: GPT-Realtime processes it identically to a spoken transcript — it may respond itself or delegate to RovoDev.
- **AC**: GPT-Realtime speaks its response back via audio even for typed input (full voice experience).
- **AC**: The composer remains accessible for text input while the waveform visualization is active — user can manually reach for the text field at any time.

**US-3**: As a user, when GPT-Realtime decides my request needs RovoDev, I want the delegation to happen without seeing a duplicate message.
- **AC**: The user message already displayed in chat is reused as the prompt to RovoDev — no new user bubble is inserted.
- **AC**: RovoDev's response appears as the next assistant message in the same thread.
- **AC**: The handoff is seamless — no visible transition indicator.
- **AC**: If GPT-Realtime had already started a partial response before deciding to delegate, that partial response remains visible as a separate assistant message (context preserved).

**US-4**: As a user with voice mode OFF, I want text input to go directly to RovoDev as it does today.
- **AC**: Behavior is identical to current implementation when voice is inactive.

**US-5**: As a user, I want to turn voice mode on/off mid-conversation without losing context.
- **AC**: Toggling voice mode preserves the full message history (both Realtime and RovoDev messages).
- **AC**: After toggling OFF, next text submission goes directly to RovoDev.
- **AC**: After toggling ON, next text submission routes through GPT-Realtime.
- **AC**: On toggle ON, GPT-Realtime receives a summary of recent thread messages for context about prior RovoDev interactions.

**US-6**: As a user, I want GPT-Realtime to delegate to RovoDev multiple times in a single voice session, with each delegation aware of prior results.
- **AC**: GPT-Realtime can call `delegate_to_rovo` multiple times per session.
- **AC**: After each delegation, RovoDev's result is injected back into the Realtime session as context (e.g., "RovoDev created artifact X").
- **AC**: Subsequent delegations can reference prior delegated results (e.g., "update the artifact you just created").

**US-7**: As a user, if RovoDev fails after GPT-Realtime delegates, I want to be informed through both voice and chat.
- **AC**: A standard error message appears in the chat (same as current RovoDev error states).
- **AC**: GPT-Realtime is notified of the failure and can speak an explanation or offer to retry.

**US-8**: As a user, if the voice connection drops, I want it to reconnect without losing my conversation.
- **AC**: A brief "Reconnecting voice..." indicator appears.
- **AC**: Auto-reconnect restores the session. Persisted messages remain in the chat.

### Non-Goals

- Changing the GPT-Realtime backend WebSocket architecture
- Adding visible distinction or labeling between GPT-Realtime and RovoDev messages
- Removing the legacy VAD-based voice code (code stays but UI access is removed — Realtime is the only visible voice mode)
- Supporting concurrent voice + text input to different targets simultaneously

---

## 3. Technical Specifications

### Architecture: Current vs. Proposed

**Current flow (Realtime voice ON)**:
```
User speaks → GPT-Realtime (separate context)
  ├─ Casual reply → spoken back (NOT in chat window)
  └─ delegate_to_rovo → extract prompt → submitPrompt() → new user message in chat → RovoDev
```

**Proposed flow (Realtime voice ON)**:
```
User speaks → partial transcript streams into user message bubble in chat
  └─ GPT-Realtime responds:
      ├─ Casual reply → assistant message in chat (+ spoken back via audio)
      └─ delegate_to_rovo → reuse existing user message → RovoDev response as next assistant message

User types → text appears as user message in chat → sent to GPT-Realtime
  └─ Same routing as speech (GPT-Realtime decides: reply or delegate)
  └─ GPT-Realtime speaks response back via audio even for typed input
```

**Proposed flow (Voice OFF — unchanged)**:
```
User types → user message in chat → RovoDev directly
```

### Key Design Decisions (from interview)

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Message persistence | All messages persist (extend `/api/chat`) | Consistent UX — chat history survives refresh |
| Partial response on delegation | Keep visible as separate assistant message | Preserves GPT-Realtime's conversational context |
| Barge-in during RovoDev streaming | GPT-Realtime handles via existing steering logic | No immediate interrupt — uses the artifact steer decision tree already in place |
| RovoDev context on delegation | Summary + delegated message | Avoids context bloat while giving RovoDev enough context |
| Legacy voice UI | Hide UI, keep code | Realtime is the path forward; legacy code available if needed |
| Transcript display | Stream partial transcript (transcription_delta) | Responsive UX — user sees their words appearing in real-time |
| Session lifecycle | New thread = new Realtime session | Clean boundary per conversation |
| Delegation errors | Both GPT-Realtime and chat notified | User gets error in chat + voice explanation |
| Audio for text input | GPT-Realtime speaks back | Full voice experience regardless of input modality |
| Multi-turn display | Every exchange = separate message bubble | Consistent with standard chat UX |
| Delegation scope | Multiple per session, contextual | GPT-Realtime can reference prior delegation results |
| Composer | Waveform active; text input still accessible alongside | User can speak or type at any time |
| Reconnection | Visible "Reconnecting voice..." indicator | User knows what's happening |
| Thinking/loading | Same indicator as RovoDev | No visual distinction |
| Thread context on connect | Inject summary of recent messages | GPT-Realtime knows what RovoDev has been doing |
| Artifact steering | GPT-Realtime is artifact-aware (via context injection) | Better routing decisions when artifact is open |
| Message state management | Unified wrapper hook (parallel `realtimeMessages` inside `use-future-chat`) | No AI SDK conflicts, clean separation |
| Scroll behavior | Standard auto-scroll (pause if user scrolled up) | Consistent with existing chat |

### Key Technical Changes

#### 3.1 Message Model Extension

Extend `RovoMessageMetadata` to track message provenance without exposing it visually:

```typescript
// In lib/rovo-ui-messages.ts
type RovoMessageMetadata = {
  // ...existing fields
  source?: "user" | "realtime" | "rovodev"  // internal tracking only
  realtimeMessageId?: string                 // links to Realtime session message
  delegatedFromId?: string                   // points to the user message being delegated
}
```

#### 3.2 Message State Architecture (Unified Wrapper Hook)

Extend `use-future-chat.ts` with a parallel message state:

- **`realtimeMessages`**: Separate state array for GPT-Realtime messages (user transcripts + assistant responses)
- **`allMessages`**: Computed merged array of `useChat.messages` + `realtimeMessages`, interleaved by timestamp, exposed for rendering
- **`useChat`** remains untouched for RovoDev-only interactions (voice OFF path)
- Delegation uses a **direct API call** to `/api/chat` (bypasses `useChat.append()`) to avoid creating a duplicate user message — the response streams into a new assistant entry in `realtimeMessages`

Key methods:

**`appendRealtimeMessage(role, content, options?)`**:
- Inserts a message into `realtimeMessages` without triggering a RovoDev request
- Supports streaming: can create with partial content, update via ID as deltas arrive
- Persists to backend via `POST /api/chat/messages`

**`updateRealtimeMessage(messageId, contentDelta)`**:
- Appends content to an existing streaming Realtime message (for `transcription_delta` and `text_delta`)

**`delegateToRovodev(messageId, options)`**:
- Takes an existing user message ID already in `realtimeMessages`
- Extracts the message content + conversation summary from GPT-Realtime's `delegate_to_rovo` payload
- Makes a direct `POST /api/chat` with `{ delegatedMessageId, conversationSummary, ...artifactContext }`
- Streams RovoDev's response into a new assistant message in `realtimeMessages`
- Does NOT call `useChat.append()` — avoids duplicate user message

#### 3.3 Realtime Hook Changes (`use-realtime-voice.ts`)

Current `onDelegateToRovo` callback fires with `{ prompt, intent_type, ... }` and the shell calls `submitPrompt()` which creates a new user message.

Change to:

1. **`transcription_delta`** → call `updateRealtimeMessage()` to stream partial transcript into an existing user message bubble (created on `speech_started`)
2. **`transcription_completed`** → finalize the user message text
3. **`speech_started`** → call `appendRealtimeMessage("user", "")` to create an empty user bubble immediately (filled by transcript deltas)
4. **`text_delta`** (GPT response) → call `appendRealtimeMessage("assistant", "")` on first delta, then `updateRealtimeMessage()` for subsequent deltas
5. **`function_call: delegate_to_rovo`** → call `delegateToRovodev(existingUserMessageId)` — the user message is already displayed from step 1/3
6. **`function_call` result injection** → after RovoDev completes, inject result back into Realtime session via `injectContext({ type: "thread_message" })`

New callback — **`onTextInput(text)`**:
- Called when user submits text while voice ON
- Creates user message via `appendRealtimeMessage("user", text)`
- Sends to Realtime WebSocket as `text_message_from_user`
- GPT-Realtime processes and responds (text + audio) or delegates

#### 3.4 Text Input While Voice ON

When voice mode is active and user submits text via the composer:

1. Display text as a user message in chat immediately (via `appendRealtimeMessage`)
2. Send text to GPT-Realtime WebSocket as `text_message_from_user`
3. GPT-Realtime processes it and either:
   - Responds directly (text + audio) → streamed into chat as assistant message, spoken back
   - Delegates to RovoDev → `delegateToRovodev()` with the existing message ID

Backend change needed in `openai-realtime.js`:
- Handle new `text_message_from_user` client message type
- Forward to OpenAI Realtime API as a `conversation.item.create` with modality `text`
- This triggers GPT to respond (via text/audio) or call functions as usual

#### 3.5 Shell Orchestration Changes (`future-chat-shell.tsx`)

Remove:
- Separate voice conversation panel/overlay (if any)
- The pattern of calling `submitPrompt()` from `onDelegateToRovo` (which creates duplicate messages)
- Legacy voice UI toggle (keep code, remove UI access)

Add:
- Wire `appendRealtimeMessage`, `updateRealtimeMessage`, and `delegateToRovodev` into the Realtime hook callbacks
- Route composer submission through GPT-Realtime when voice mode is ON (call `onTextInput` instead of `submitPrompt`)
- Maintain a `realtimeUserMessageIdRef` that tracks the current user message ID so delegation knows which message to reuse
- On voice toggle ON: inject summary of recent thread messages into Realtime session via `injectContext({ type: "thread_context" })`
- On new thread: disconnect Realtime session, create fresh session on next voice toggle

#### 3.6 Artifact Awareness

GPT-Realtime receives artifact context via `injectContext()`:
- When an artifact opens/closes: inject `{ type: "artifact_context", documentId, title, kind }`
- When annotations are created: inject `{ type: "artifact_annotations", annotations }`
- GPT-Realtime uses this to make better routing decisions (e.g., steering instructions go to RovoDev with artifact context)
- The shell still applies the `applyVoiceSteer` vs `submitPrompt` decision based on local artifact state, but GPT-Realtime's awareness improves the delegation prompt quality

#### 3.7 Barge-In During RovoDev Streaming

When the user speaks while RovoDev is streaming (after delegation):
1. Speech goes to GPT-Realtime (user transcript appears in chat)
2. GPT-Realtime processes the speech and decides intent
3. If it's a steering instruction: uses existing `applyVoiceSteer` logic (saves checkpoint, sends steer request)
4. If it's a new request: interrupts RovoDev stream via `interruptActiveTurn()`, then either responds directly or delegates again
5. No immediate automatic interrupt — GPT-Realtime controls the timing based on intent

#### 3.8 Backend Persistence (`/api/chat` extension)

New endpoint: `POST /api/chat/messages`
- Stores Realtime messages (user transcripts + assistant responses) per thread
- Payload: `{ threadId, messages: [{ id, role, content, metadata, createdAt }] }`
- Called by `appendRealtimeMessage` on each message creation
- On page load: fetch stored Realtime messages and merge into `realtimeMessages` state

Modified endpoint: `POST /api/chat` (for delegation)
- New optional field: `delegatedMessageId` — indicates this is a delegation from an existing message
- New optional field: `conversationSummary` — GPT-Realtime's summary of the voice conversation leading to delegation
- When `delegatedMessageId` is present, the backend does not expect a new user message in the `messages` array — it uses the delegated content directly

#### 3.9 Error Handling on Delegation Failure

When RovoDev fails after delegation:
1. Standard error message appears in the chat message list (same styling as current RovoDev errors)
2. Error details injected back into GPT-Realtime session via `injectContext({ type: "delegation_error", error })`
3. GPT-Realtime can then speak an explanation to the user (e.g., "Rovo ran into an issue — want me to try again?")
4. If GPT-Realtime decides to retry, it calls `delegate_to_rovo` again with the same or modified prompt

#### 3.10 Reconnection Behavior

When the Realtime WebSocket drops:
1. Show a visible "Reconnecting voice..." indicator in the composer area
2. Auto-reconnect with exponential backoff
3. On reconnect: inject thread summary into new session (same as initial connect)
4. Persisted messages remain in chat unchanged
5. If reconnection fails after N attempts: fall back gracefully, show "Voice disconnected" — user can manually re-enable

### Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    Chat Message List                          │
│  (single unified thread — Realtime + RovoDev interleaved)    │
│                                                              │
│  [user: "hey how's it going"]          ← Realtime transcript │
│  [assistant: "doing great!"]           ← Realtime response   │
│  [user: "create a login page"]         ← Realtime transcript │
│  [assistant: "I'll have Rovo..."]      ← Realtime partial    │
│  [assistant: "Here's the login..."]    ← RovoDev response    │
│  [user: "make the button bigger"]      ← Realtime transcript │
│  [assistant: (streaming artifact)]     ← RovoDev steer       │
└────────────────────┬────────────────────────────────────────┘
                     │
         ┌───────────┴───────────┐
         │                       │
    Voice ON                Voice OFF
    (speech or text)        (text only)
         │                       │
    GPT-Realtime            Direct to
    (routing layer)         RovoDev
         │                  (unchanged)
    ┌────┴────┐
    │         │
  Reply    Delegate
  (text+   (reuse msg ID,
   audio)   summary + prompt
            → RovoDev)
         │
    ┌────┴────┐
    │         │
  Success   Failure
  (inject   (error in chat +
   result    notify Realtime)
   back)
```

### Integration Points

| System | Current | Proposed |
|--------|---------|----------|
| `use-future-chat` | Wraps `useChat` for RovoDev only | Adds parallel `realtimeMessages` state, merged `allMessages` for rendering |
| `useChat` (AI SDK) | Only manages RovoDev messages | Unchanged — only used for voice OFF path |
| Realtime WebSocket | Returns text/audio to separate context | Returns text/audio → written into `realtimeMessages` |
| Composer submit | Always goes to RovoDev | Routes through GPT-Realtime when voice ON |
| `delegate_to_rovo` | Extracts prompt → `submitPrompt()` → new user msg | `delegateToRovodev(existingMsgId)` → direct API call, no new user msg |
| Backend `/api/chat` | Receives messages array with new user message | Also accepts `delegatedMessageId` + `conversationSummary` |
| Backend `/api/chat/messages` | N/A | New endpoint for persisting Realtime messages |
| `openai-realtime.js` | Handles audio + function calls | Also handles `text_message_from_user` → `conversation.item.create` |

---

## 4. Risks & Mitigation

| Risk | Impact | Mitigation |
|------|--------|------------|
| Message ordering race: Realtime transcript + delegation happen async | Messages could appear out of order | Use `realtimeUserMessageIdRef` to ensure delegation targets the correct user message; queue operations sequentially within the hook |
| `useChat` and `realtimeMessages` diverge on page reload | Incomplete chat history after refresh | Both are persisted independently and merged on load — `realtimeMessages` from `/api/chat/messages`, `useChat` from its existing persistence |
| GPT-Realtime text input latency | Text sent to Realtime API may have higher latency than direct RovoDev | Acceptable tradeoff — the routing intelligence is the value. Optimize with prompt engineering for faster function call decisions |
| Artifact steering during voice delegation | Complex interaction when GPT-Realtime delegates while artifact is open | GPT-Realtime is artifact-aware (context injection). Shell still applies `applyVoiceSteer` vs `submitPrompt` decision. Both systems aligned |
| Context window bloat for RovoDev | Casual voice messages inflate RovoDev's context | Only the delegated message + conversation summary are sent to RovoDev. Casual messages stay in `realtimeMessages` only |
| Rapid voice turns clutter chat | Many short messages scroll quickly | Standard auto-scroll (pause when user scrolls up). Every exchange = bubble for consistency |
| OpenAI Realtime API `conversation.item.create` text modality limitations | API may not support text input as expected | Validate against current stable API. Fall back to injecting text as system-level context if needed |
| WebSocket reconnection loses Realtime session state | GPT-Realtime loses conversation memory after reconnect | Inject thread summary on reconnect. Persisted messages remain in chat |

---

## 5. Phased Rollout

### Phase 1 — Ship All Core Capabilities
- GPT-Realtime transcripts and responses render in the main chat message list (streaming partial transcripts)
- `delegate_to_rovo` reuses existing user message (no duplication)
- Partial Realtime response preserved as context when delegation occurs
- Composer text input routes through GPT-Realtime when voice is ON (GPT speaks back)
- All messages persist via extended `/api/chat` + new `/api/chat/messages`
- Inject thread summary into Realtime session on connect
- GPT-Realtime artifact-aware via context injection
- Multiple contextual delegations per session
- Error handling: both chat error + Realtime notification on delegation failure
- Visible reconnect indicator on WebSocket drop
- Legacy voice UI hidden (code preserved)
- Remove separate voice conversation panel
- Voice OFF behavior unchanged

### Phase 2 — Polish & Edge Cases
- Barge-in refinement during active delegation (steering vs interrupt heuristics)
- Rapid voice toggle edge cases
- Reconnection context restoration optimization
- GPT-Realtime prompt engineering for faster routing decisions
- Performance profiling of merged message rendering with high message counts
