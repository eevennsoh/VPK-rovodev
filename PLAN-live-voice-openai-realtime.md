# Plan: Live Voice Mode with OpenAI Realtime API

## Context

The current future-chat voice mode uses a high-latency request/response pipeline:
`VAD → record audio → STT (Google/Whisper) → text → LLM → text → TTS (Google) → audio playback`

This creates noticeable delays between speaking and hearing a response. The goal is to add a **speech-to-speech live conversation mode** using `gpt-4o-realtime-preview-2025-07-29`, which processes audio in and returns audio out without intermediate text steps — enabling a natural, low-latency conversational experience.

**Reference implementation:** `/Users/esoh/Documents/Labs/conversational-ai` (Kotlin/Spring) — uses WebSocket relay through backend to OpenAI Realtime API with server-side VAD, function calling, and ambient context injection.

## Architecture Decision: WebSocket Relay via Express Backend

Using **WebSocket relay through the Express backend** (matching the conversational-ai reference) because:
- Enables server-side context injection (chat history, page context)
- Supports function calling without exposing tool definitions to the client
- Keeps API keys server-side (no ephemeral token endpoint needed)
- Matches the proven pattern from the reference implementation
- Can be upgraded to WebRTC later if latency needs improvement

```
Browser ──WS──► Express ──WS──► OpenAI Realtime (gpt-4o-realtime-preview-2025-07-29)
                  │
          context injection
          session management
          VAD event relay
```

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
- Relay audio buffers: client → input_audio_buffer.append → OpenAI
- Relay events: OpenAI → response.audio.delta / text.delta / speech events → client
- Handle session lifecycle (NOT_INITIALIZED → READY)
- Inject conversation context via conversation.item.create
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

**`backend/server.js`** — WebSocket upgrade endpoint:
```
Route: /api/realtime/audio-conversation
Protocol: WebSocket upgrade on Express server
```

Client→Server message types:
- `audio_buffer_append` — base64 PCM16 audio chunk
- `audio_buffer_commit` — finalize audio segment
- `session_update` — reconfigure VAD/model settings
- `context_inject` — inject page/chat context

Server→Client message types:
- `session_ready` — session initialized
- `audio_delta` — base64 PCM16 audio chunk from model
- `text_delta` — concurrent text transcription
- `transcription_delta` — user speech transcription
- `speech_started` — user started speaking (barge-in)
- `speech_stopped` — user stopped speaking
- `error` — error event

### Step 2: Frontend — Live Conversation Hook

**Files to create:**
- `components/projects/future-chat/hooks/use-realtime-voice.ts` (new)

**`use-realtime-voice.ts`** — React hook for realtime voice:
```
Responsibilities:
- Open WebSocket to /api/realtime/audio-conversation
- Capture microphone audio via getUserMedia + AudioWorklet
- Convert to PCM16 and send as audio_buffer_append
- Receive audio_delta events and play via AudioContext
- Handle barge-in (speech_started → stop playback immediately)
- Track state: idle | connecting | connected | speaking | listening
- Expose: connect(), disconnect(), isConnected, state
- Concurrent text transcript accumulation for display

Audio pipeline:
  Mic → AudioWorklet (resample to 24kHz PCM16) → WebSocket → Express → OpenAI
  OpenAI → Express → WebSocket → AudioWorklet (PCM16 playback) → Speakers
```

Key patterns from existing code to reuse:
- `useAudioDevices()` from `components/ui-ai/hooks/use-audio-devices.ts` — mic selection
- `useMultibandVolume()` from `components/ui-audio/bar-visualizer.tsx` — visualization
- Audio playback pattern from `useLiveVoice` (HTMLAudioElement or AudioContext)

### Step 3: Frontend — UI Integration in Future Chat Shell

**Files to modify:**
- `components/projects/future-chat/components/future-chat-shell.tsx`

Changes:
- Add a toggle button to switch between "Text Voice" and "Live Conversation" modes
- When "Live Conversation" is active:
  - Show a persistent voice orb/visualizer (reuse `BarVisualizer` or `Orb` from `ui-audio`)
  - Display concurrent text transcript in a subtle overlay
  - Show connection state (connecting, connected, listening, speaking)
  - Barge-in: when `speech_started` event received, immediately stop audio playback
- When switching back to "Text Voice", disconnect the realtime session

### Step 4: Context Injection

**Files to modify:**
- `backend/lib/openai-realtime.js`

On session creation, inject:
1. System instructions (simplified version of the chat system prompt)
2. Recent chat history summary (last N messages as text context)
3. Current page/artifact context if available

Use `conversation.item.create` with role "system" to inject context without interrupting audio, matching the conversational-ai reference pattern.

### Step 5: Environment Configuration

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
| `backend/lib/smart-audio-routing.js` | Audio intent detection |

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
2. **Audio round-trip**: Speak into mic → verify `transcription_delta` events with user speech text → verify `audio_delta` events with model response audio
3. **Barge-in**: Speak while model is responding → verify `speech_started` event fires → verify audio playback stops immediately
4. **Context**: Inject chat history → ask a follow-up question by voice → verify model references prior context
5. **Cleanup**: Disconnect WebSocket → verify OpenAI session closes cleanly, no leaked connections
6. **Visual**: Check live voice UI at `http://localhost:3000/preview/projects/future-chat` — toggle between modes, verify visualizer, state indicators
7. **Lint/Type**: `pnpm run lint` and `pnpm tsc --noEmit` pass

## Future Enhancements (Out of Scope)

- Function calling / tool integration through realtime session
- WebRTC direct transport for even lower latency
- Voice selection UI
- Multi-provider support (configurable provider factory like reference)
- Ambient context loading from current page
- Persistent conversation history across realtime sessions
