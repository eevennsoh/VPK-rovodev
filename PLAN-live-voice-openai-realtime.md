# Plan: Live Voice Mode with OpenAI Realtime API

## Context

The current future-chat voice mode uses a high-latency request/response pipeline:
`VAD -> record audio -> STT (Google/Whisper) -> text -> LLM -> text -> TTS (Google) -> audio playback`

This creates noticeable delays between speaking and hearing a response. The goal is to add a **speech-to-speech live conversation mode** using `gpt-4o-realtime-preview-2025-07-29`, which processes audio in and returns audio out without intermediate text steps — enabling a natural, low-latency conversational experience where the user can **collaborate with RovoDev** by voice: chatting, steering artifact generation, and giving real-time feedback.

**Reference implementation:** `/Users/esoh/Documents/Labs/conversational-ai` (Kotlin/Spring) — uses WebSocket relay through backend to OpenAI Realtime API with server-side VAD, function calling, and ambient context injection.

## Architecture Decisions

### 1. WebSocket Relay via Express Backend

Using **WebSocket relay through the Express backend** (matching the conversational-ai reference) because:
- Keeps API keys server-side (no ephemeral token endpoint needed)
- Enables server-side context injection and intent classification
- Matches the proven pattern from the reference implementation
- Can be upgraded to WebRTC later if latency needs improvement

```
Browser ──WS──> Express ──WS──> OpenAI Realtime (gpt-4o-realtime-preview-2025-07-29)
                  |
          context injection
          intent classification
          session management
```

### 2. Realtime as Voice Shell, RovoDev Does the Work

OpenAI Realtime handles **voice I/O only** — capturing speech, generating conversational audio responses, and transcribing. It does NOT generate artifacts, run agent loops, or perform tool calls.

When the user speaks an actionable request ("make me a dashboard"), the **client** receives the text transcription and dispatches it to RovoDev through the **existing** `useChat` / `DefaultChatTransport` pipeline — the same path text chat already uses.

```
                   ┌─────────────────────────────────┐
                   |          Client (React)          |
                   |                                  |
User speaks ──> Realtime WS ──> transcription_delta   |
                   |              |                   |
                   |    Intent Classifier (gpt-4o-mini)|
                   |     /         |         \        |
                   |  CHAT     NEW_TASK    STEER      |
                   |   |          |          |        |
                   | (voice     (send to   (abort +   |
                   |  only)     RovoDev)   re-send)   |
                   |              |          |        |
                   |         useChat / DefaultChatTransport
                   |              |          |        |
                   |           RovoDev Serve           |
                   └─────────────────────────────────┘
```

**Why client-side routing:**
- Reuses the entire existing RovoDev pipeline (useChat, transport, artifact panel, message rendering)
- Voice becomes a pure I/O layer — no RovoDev integration needed in the backend relay
- Artifacts appear in the same panel as text-mode artifacts
- Voice can continue independently while RovoDev works

### 3. Same Thread — Voice Messages Merge In

Voice-initiated RovoDev requests appear in the same chat thread as text messages. When the user switches back to text, they see the full history including voice interactions. RovoDev sees one continuous conversation.

**Thread filtering:** Only **actionable** utterances (classified as TASK or STEER) appear in the thread. CHAT utterances ("what time is it?", "tell me a joke") are ephemeral — Realtime responds vocally but nothing is added to the thread. This prevents orphan messages (user messages with no RovoDev response).

**Realtime's voice responses are ephemeral.** They are spoken aloud but NOT added to the thread. Only the user's transcript (for TASK/STEER) and RovoDev's text response/artifact appear in the thread.

```
Thread example:
  [text]  User: help me build a dashboard
  [text]  Rovo: Here's a plan...
  [voice] User: looks good, build it          <- TASK, added to thread
  [artifact] Dashboard component              <- RovoDev response
  [voice] User: add a chart to it             <- STEER, added to thread
  [artifact] Updated Dashboard with chart     <- RovoDev response
  [text]  User: can you also add tests?

Note: Realtime's chatty responses ("Sure!", "On it!", "Working on that...")
are voice-only and do NOT appear in the thread.
```

### 4. Voice Identity — Realtime Speaks AS RovoDev

Realtime uses the RovoDev persona. System prompt says "You are Rovo, an AI collaborator..." One unified persona. When RovoDev finishes generating, Realtime narrates: "Done! I built you a dashboard with three chart sections."

### 5. Parallel State Machines

The client manages two independent state machines:

**Voice FSM:**
```
idle -> connecting -> listening <-> speaking
```

**Generation FSM:**
```
idle -> classifying -> generating -> complete -> idle
                   \-> steering -> generating (abort + re-dispatch)
```

They run independently:
- `voice=listening + gen=generating` — user chatting while artifact builds
- `voice=speaking + gen=idle` — Realtime responding, no generation active
- `voice=listening + gen=steering` — user just steered, aborting current generation

### 6. Intent Classification

Every completed utterance goes through a dedicated intent classifier (extending `smart-audio-routing.js`). Uses **gpt-4o-mini** for fast (~300-500ms) classification. The latency is hidden behind the natural VAD silence gap.

Classification happens **in parallel** with Realtime's voice response — the classifier determines whether to *also* dispatch to RovoDev, it doesn't block the voice.

Three intent classes:
| Intent | Meaning | Action |
|--------|---------|--------|
| `CHAT` | Casual conversation, questions | Realtime handles vocally. Nothing added to thread. |
| `NEW_TASK` | Actionable request for RovoDev | User transcript added to thread. Dispatched to RovoDev via chat transport. |
| `STEER` | Amendment to in-flight generation | Abort current RovoDev stream. Send amendment as new turn in thread. |

Classifier input includes generation context (what's currently being generated, if anything) for accurate STEER detection.

### 7. Steering Mechanics — Abort + New Turn

When a STEER intent is detected:
1. Abort the current RovoDev stream (cancel the in-flight request)
2. Discard the partial response
3. Send the amendment as a **new user message** in the thread
4. RovoDev sees the full thread context (original request + amendment) and generates accordingly

```
Thread:
  User: "make me a dashboard"
  Rovo: [generating... ABORTED]
  User: "actually, make it a kanban board"     <- new message
  Rovo: [generates kanban board with full thread context]
```

### 8. Concurrent Task Queuing

Only one RovoDev generation at a time. If a NEW_TASK arrives while generating:
1. Current generation continues
2. New task is queued
3. When current finishes, queued task starts
4. Realtime acknowledges: "I'll get to that once this is done."

This avoids losing in-progress work and keeps steering unambiguous (always targets the current generation).

### 9. Live Context Sync

Realtime stays aware of the thread as it evolves:
- **On connect:** Inject a summary of the last N messages into Realtime's context via `session.update` instructions
- **On RovoDev completion:** Push a brief summary into Realtime via `conversation.item.create` ("Generated: Dashboard component with bar chart and dark theme")
- **On new thread messages:** Push context updates so Realtime can reference recent work

This enables coherent conversation: user says "make the chart bigger" and Realtime knows a chart was generated.

### 10. Result Narration — On Idle Only

When RovoDev finishes generating:
- **If voice is idle (listening):** Realtime proactively narrates: "Your dashboard is ready! It has three chart widgets."
- **If user is actively speaking/chatting:** Context is injected silently. Artifact appears in the panel. Realtime mentions it naturally at the next pause.

This prevents interrupting the user mid-sentence.

### 11. Mode Entry/Exit — Toggle in Composer

A mic button in the chat composer. Tap to start voice mode, tap again to end.

**Both text and voice inputs are available simultaneously.** The visualizer appears above the text composer. Users can type while voice is active (typed messages bypass the classifier and go through normal chat transport). This avoids the "I need to paste a URL but I'm in voice mode" friction.

```
Voice active:
  [████▖▖▖██▖▖███ listening...]  [⏹]
  [type a message...             ] [↑]

Text mode:
  [type a message...             ] [🎙️]
```

### 12. Echo Handling — Browser AEC + Server VAD

Dual protection:
1. **Browser AEC:** `getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } })` — removes speaker echo before audio reaches Realtime
2. **Server VAD:** `turn_detection.interrupt_response: true` — when user speaks over playback, `speech_started` event fires, client immediately stops audio playback

### 13. Error Recovery — Auto-Reconnect

On Realtime WebSocket disconnect:
1. Toast: "Reconnecting..."
2. Retry with exponential backoff: 500ms, 1000ms, 2000ms
3. On success: re-inject context, resume voice mode
4. On 3x failure: Toast "Voice disconnected. Switching to text." -> exit voice mode gracefully

RovoDev errors during voice-initiated requests: Realtime narrates "Something went wrong with that request. Want to try again?"

### 14. Persistent Session

Realtime session opens when user taps mic, stays open for the entire voice mode duration. Server VAD handles turn-taking within the persistent session. Disconnect only on explicit exit (tap stop button, say "goodbye").

## Approach: Add as New Mode

Keep the existing voice mode (`useLiveVoice`) intact and add a new **"Live Conversation"** mode alongside it. This avoids disrupting the working pipeline and lets users toggle between modes.

## Implementation Plan

### Step 1: Backend — OpenAI Realtime WebSocket Relay

**Files to create/modify:**
- `backend/lib/openai-realtime.js` (new) — OpenAI Realtime session manager
- `backend/server.js` — add WebSocket upgrade handler

**`backend/lib/openai-realtime.js`** — Core realtime session manager:
```
Responsibilities:
- Create WebSocket connection to OpenAI Realtime API
- Send session.update with config (voice, modalities, VAD settings, instructions)
- Relay audio buffers: client -> input_audio_buffer.append -> OpenAI
- Relay events: OpenAI -> response.audio.delta / text.delta / speech events -> client
- Handle session lifecycle (NOT_INITIALIZED -> READY)
- Inject conversation context via conversation.item.create
- Handle context updates pushed from client (context_inject messages)
- Clean shutdown on disconnect
```

Key config (from conversational-ai reference):
```js
{
  model: "gpt-4o-realtime-preview-2025-07-29",
  modalities: ["audio", "text"],
  voice: "alloy",
  input_audio_format: "pcm16",
  output_audio_format: "pcm16",
  temperature: 0.6,
  max_response_output_tokens: "inf",
  turn_detection: {
    type: "server_vad",
    threshold: 0.5,
    prefix_padding_ms: 300,
    silence_duration_ms: 500,
    create_response: true,
    interrupt_response: true,
  }
}
```

System prompt (RovoDev persona):
```
You are Rovo, a collaborative AI assistant. You help users build interfaces,
plan projects, and create artifacts. You speak conversationally and naturally.

When a task is dispatched for generation, acknowledge it briefly and stay
available for chat. When a generation completes, describe what was built
in a conversational way. When the user steers ("make it darker", "add a chart"),
acknowledge the change.

Keep responses concise and natural — you're in a voice conversation, not
writing an essay.
```

**`backend/server.js`** — WebSocket upgrade endpoint:
```
Route: /api/realtime/audio-conversation
Protocol: WebSocket upgrade on Express server
```

Client->Server message types:
- `audio_buffer_append` — base64 PCM16 audio chunk
- `audio_buffer_commit` — finalize audio segment
- `session_update` — reconfigure VAD/model settings
- `context_inject` — push thread context update (artifact completed, new message)

Server->Client message types:
- `session_ready` — session initialized
- `audio_delta` — base64 PCM16 audio chunk from model
- `text_delta` — concurrent text from model response (ephemeral, for display only)
- `transcription_delta` — user speech transcription (triggers intent classification on client)
- `speech_started` — user started speaking (barge-in -> stop playback)
- `speech_stopped` — user stopped speaking
- `error` — error event

### Step 2: Backend — Intent Classifier Extension

**Files to modify:**
- `backend/lib/smart-audio-routing.js` — extend with voice intent classification
- `backend/server.js` — add classification endpoint

Add a new classification function:
```js
classifyVoiceIntent({
  transcript,                    // what the user said
  isGenerating,                  // is RovoDev currently generating?
  currentGenerationContext,      // what's being generated (prompt, type)
  recentThreadSummary,           // last few messages for context
}) -> { intent: "CHAT" | "NEW_TASK" | "STEER", amendment?: string }
```

Uses gpt-4o-mini for ~300-500ms classification. Exposed as:
```
POST /api/realtime/classify-intent
```

Called from the client after each `transcription_delta` completes.

### Step 3: Frontend — Live Conversation Hook

**Files to create:**
- `components/projects/future-chat/hooks/use-realtime-voice.ts` (new)

**`use-realtime-voice.ts`** — React hook for realtime voice:

```
Exports:
  connect()           — open Realtime WS, start mic capture
  disconnect()        — close Realtime WS, stop mic
  voiceState           — "idle" | "connecting" | "listening" | "speaking"
  generationState      — "idle" | "classifying" | "generating" | "steering" | "complete"
  isConnected          — boolean
  currentTranscript    — string (live user speech transcript)
  modelTranscript      — string (current model response text, ephemeral)

Responsibilities:
  Voice FSM:
  - Open WebSocket to /api/realtime/audio-conversation
  - Capture mic via getUserMedia({ echoCancellation: true, noiseSuppression: true })
  - AudioWorklet: resample to 24kHz PCM16, send as audio_buffer_append
  - Receive audio_delta -> queue in AudioContext for playback
  - speech_started -> stop playback immediately (barge-in)
  - Track voiceState transitions

  Generation FSM:
  - On transcription_delta complete -> call /api/realtime/classify-intent
  - CHAT -> no action (Realtime handles vocally)
  - NEW_TASK -> add user message to thread (with voice badge), dispatch via chat transport
  - STEER -> abort current generation, add amendment to thread, re-dispatch
  - Queue NEW_TASK if generation is in progress
  - On RovoDev completion -> push context_inject to Realtime WS

  Context sync:
  - On connect: send initial thread context via context_inject
  - On RovoDev completion: push summary via context_inject
  - On narration: if voiceState=listening, Realtime narrates completion

Audio pipeline:
  Mic -> AudioWorklet (resample to 24kHz PCM16) -> WebSocket -> Express -> OpenAI
  OpenAI -> Express -> WebSocket -> AudioWorklet (PCM16 playback) -> Speakers
```

Key patterns from existing code to reuse:
- `useAudioDevices()` from `components/ui-ai/hooks/use-audio-devices.ts` — mic selection
- `useMultibandVolume()` from `components/ui-audio/bar-visualizer.tsx` — visualization
- Audio playback pattern from `useLiveVoice` (AudioContext-based)
- Chat transport from `useChat` / `DefaultChatTransport` — RovoDev dispatch
- Abort pattern from existing chat (abort controller on transport)

### Step 4: Frontend — UI Integration

**Files to modify:**
- `components/projects/future-chat/components/future-chat-shell.tsx`

Changes:
- Add mic toggle button to the chat composer area
- When voice mode is active:
  - Show voice visualizer above the text composer (reuse `BarVisualizer` from `ui-audio`)
  - Text composer remains available below for simultaneous text input
  - Voice-initiated user messages appear in thread with 🎙️ badge
  - Show voice connection state (connecting, listening, speaking)
  - Display ephemeral model transcript in a subtle overlay (fades after speaking)
  - Barge-in: `speech_started` -> immediately stop audio playback
  - Artifacts appear in the artifact panel as usual
- When voice mode exits, disconnect Realtime session

### Step 5: Context Injection

**Files to modify:**
- `backend/lib/openai-realtime.js`

On session creation (via `context_inject` from client), inject:
1. System instructions (RovoDev persona, see above)
2. Summary of last N messages from the chat thread
3. Current artifact context if available

As the session progresses, client pushes context updates:
- `context_inject: { type: "artifact_complete", summary: "Dashboard with 3 charts" }`
- `context_inject: { type: "thread_message", role: "user", content: "..." }`

Backend translates these into `conversation.item.create` calls to OpenAI Realtime.

### Step 6: Error Recovery

**Built into `use-realtime-voice.ts`:**

WebSocket disconnect handling:
1. Set voiceState to "connecting" (show reconnecting indicator)
2. Exponential backoff: 500ms, 1000ms, 2000ms
3. On reconnect: re-inject thread context, resume voice mode
4. On 3x failure: set voiceState to "idle", show toast "Voice disconnected", exit voice mode

RovoDev error handling:
- On RovoDev stream error during voice-initiated request: push error context to Realtime
- Realtime narrates: "Something went wrong with that request. Want to try again?"

### Step 7: Environment Configuration

**Files to modify:**
- `.env` / `.env.local`
- `backend/server.js` (env var reading)

New env vars:
```
OPENAI_REALTIME_API_KEY=<key>           # or use AI Gateway
OPENAI_REALTIME_MODEL=gpt-4o-realtime-preview-2025-07-29
OPENAI_REALTIME_WS_URL=wss://api.openai.com/v1/realtime  # or AI Gateway WebSocket URL
OPENAI_REALTIME_VOICE=alloy             # alloy, echo, shimmer, etc.
```

## Key Files Reference

### Existing files to reuse/reference:
| File | What to reuse |
|------|--------------|
| `components/projects/future-chat/hooks/use-live-voice.ts` | Barge-in pattern, state machine, mic management |
| `components/ui-audio/bar-visualizer.tsx` | `useMultibandVolume()`, visualizer UI |
| `components/ui-audio/voice-button.tsx` | Voice button states and waveform |
| `components/ui-ai/hooks/use-audio-devices.ts` | Mic device enumeration |
| `backend/lib/speech-transcription.js` | Audio format handling patterns |
| `backend/lib/smart-audio-routing.js` | Intent classification pattern (extend for voice) |
| `app/contexts/context-rovo-chat.tsx` | useChat integration, chat transport, abort |

### Conversational-AI reference files:
| File | What to learn from |
|------|-------------------|
| `.../openai/provider/OpenAiRealtimeProvider.kt` | Session init, VAD config, audio relay |
| `.../openai/provider/OpenAiRealtimeProviderFactory.kt` | WebSocket connection setup, headers |
| `.../openai/handler/OpenAiRealtimeResponseHandler.kt` | Event parsing and dispatch |
| `.../conversation/api/AudioConversationApiHandler.kt` | WebSocket lifecycle management |
| `.../conversation/api/AudioConversationMessageHandler.kt` | Client message routing |
| `.../conversation/session/AudioConversationConnection.kt` | Session cleanup |
| `.../conversation/session/RealtimeSessionMediator.kt` | Mediator pattern for bidirectional comms |
| `.../conversation/context/AmbientContextLoader.kt` | Context injection patterns |

## Verification

1. **Backend WebSocket**: Connect via `wscat` to `/api/realtime/audio-conversation`, send a `session_update`, verify `session_ready` response
2. **Audio round-trip**: Speak into mic -> verify `transcription_delta` events with user speech text -> verify `audio_delta` events with model response audio
3. **Barge-in**: Speak while model is responding -> verify `speech_started` event fires -> verify audio playback stops immediately
4. **Intent classification**: Say "make me a dashboard" -> verify classified as NEW_TASK -> verify message appears in thread -> verify RovoDev receives request
5. **Steering**: While generating, say "add a chart" -> verify classified as STEER -> verify generation aborts -> verify amendment dispatched
6. **CHAT isolation**: Say "what time is it?" -> verify classified as CHAT -> verify Realtime responds vocally -> verify nothing added to thread
7. **Context sync**: Generate an artifact -> ask about it by voice -> verify Realtime references the artifact
8. **Concurrent queue**: Request two tasks in sequence -> verify first completes before second starts
9. **Narration timing**: Generate an artifact while user is chatting -> verify Realtime waits for a pause before narrating completion
10. **Text + voice**: Type a message while voice is active -> verify it goes through normal chat transport
11. **Reconnect**: Kill backend WebSocket -> verify auto-reconnect with context re-injection
12. **Thread continuity**: Switch between text and voice modes -> verify unified thread history
13. **Cleanup**: Disconnect WebSocket -> verify OpenAI session closes cleanly, no leaked connections
14. **Visual**: Check live voice UI at `http://localhost:3000/preview/projects/future-chat` — toggle modes, verify visualizer, state indicators
15. **Lint/Type**: `pnpm run lint` and `pnpm tsc --noEmit` pass

## Decision Log

| # | Decision | Choice | Rationale |
|---|----------|--------|-----------|
| 1 | Model split | Realtime = voice shell, RovoDev = work | Keeps RovoDev intelligence centralized, Realtime is I/O |
| 2 | Handoff mechanism | Client-side routing | Reuses existing useChat/transport, no backend RovoDev integration |
| 3 | During generation | Voice stays chatty, can steer | Decoupled voice + generation, natural conversation feel |
| 4 | Steering detection | Dedicated classifier (gpt-4o-mini) | Reliable, extends existing smart-audio-routing.js, hidden behind VAD silence |
| 5 | Steering mechanics | Abort + new turn in thread | Natural conversation flow, leverages RovoDev's multi-turn context |
| 6 | Realtime context | Live sync (push updates) | Required for coherent conversation about generated artifacts |
| 7 | Voice message UX | Text with voice badge | Simple, consistent with unified thread |
| 8 | Mode entry/exit | Toggle in composer | Non-disruptive, artifacts remain visible |
| 9 | Voice identity | Speaks AS RovoDev | One persona, less confusing |
| 10 | Echo handling | Browser AEC + server VAD | Dual protection, browser AEC is free |
| 11 | State model | Parallel FSMs (voice + generation) | Required for "chatty while generating" UX |
| 12 | Session lifecycle | Persistent (open on tap, close on exit) | Lowest latency, no reconnect gaps |
| 13 | Dispatch trigger | Classify every utterance | Short commands ("build it") would be missed by selective |
| 14 | Thread content | User transcript + RovoDev response only | Keeps thread clean, Realtime responses are ephemeral audio |
| 15 | Concurrent tasks | Queue (finish current, then next) | Preserves in-progress work, avoids steering ambiguity |
| 16 | Result narration | On idle only | Don't interrupt user mid-sentence |
| 17 | Error recovery | Auto-reconnect (3x backoff) + text fallback | Graceful degradation |
| 18 | Thread filtering | Only TASK/STEER in thread | Prevents orphan CHAT messages |
| 19 | Text + voice | Both available simultaneously | Allows pasting URLs, typing specific content during voice |

## Future Enhancements (Out of Scope)

- Function calling / tool integration through realtime session (bypass classifier)
- WebRTC direct transport for even lower latency
- Voice selection UI
- Multi-provider support (configurable provider factory like reference)
- Ambient context loading from current page
- Persistent conversation history across realtime sessions
- Parallel generation (multiple concurrent RovoDev streams)
- Smart abort (diff-based amendment instead of full regeneration for small tweaks)
