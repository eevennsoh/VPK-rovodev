# Lessons

Running log of corrections and patterns learned during sessions.
Distill recurring patterns into permanent rules in CLAUDE.md or .claude/rules/.
Mark promoted entries with `[Promoted]` prefix — see vpk-lesson skill for details.

---

### 2026-02-22 - AI_GATEWAY_ALLOWED_USE_CASES missing suggestions
- **What happened:** The startup banner logged `AI_GATEWAY_ALLOWED_USE_CASES: image, sound`, but suggested questions (suggestive pills) already routed through AI Gateway by default via `SUGGESTIONS_BACKEND_DEFAULT = "ai-gateway"`.
- **Why:** `AI_GATEWAY_ALLOWED_USE_CASES` is a purely declarative constant used only in the startup log (line ~6052), never as a functional gate. When suggestions were added as an AI Gateway use case, the constant wasn't updated to reflect it.
- **Rule:** When adding a new AI Gateway-routed feature, also update `AI_GATEWAY_ALLOWED_USE_CASES` in `backend/server.js` so the startup banner accurately reflects all routed use cases. Treat declarative/logging constants with the same diligence as functional ones — misleading logs waste debugging time.

### 2026-02-22 - 409 "Chat Already in Progress" — wait-for-turn over cancel-and-retry
- **What happened:** RovoDev Serve returns 409 when a chat turn is already in progress. The original fix reduced cancel-after thresholds and added pre-cancel, but the aggressive cancel-and-retry strategy still caused a destructive cascade — multiple panels canceling each other's turns, pre-canceling sessions that weren't stale, and eventually triggering force port recovery (SIGTERM/SIGKILL). The multiports demo was unusable even after killing all ports and restarting.
- **Why:** The cancel-and-retry strategy is fundamentally wrong for a shared-port environment. Canceling an active turn to start a new one creates races: the cancel may not propagate before the next attempt, multiple panels fight for the same port, and force recovery destroys healthy processes. The `generateTextViaRovoDev()` function already had a `"wait-for-turn"` conflict policy that patiently queues, but `streamViaRovoDev()` only supported `cancelOnConflict`/`cancelAfterMs` — it had no way to just wait.
- **Rule:** Use `conflictPolicy: "wait-for-turn"` (not cancel-and-retry) for all interactive chat streaming. Skip pre-cancel entirely in wait-for-turn mode. Let the retry loop wait with bounded backoff (250ms → 1s cap) and a 10-minute patience budget (`WAIT_FOR_TURN_TIMEOUT_MS`). Show "Queued — waiting for turn" in the reasoning indicator so the user knows the system is working. Files changed: `backend/lib/rovodev-gateway.js` (`streamViaRovoDev` gains `conflictPolicy` param), `backend/server.js`

### 2026-02-22 - Pool cooldown bypass for indexed waiters
- **What happened:** When a pinned port was released, it entered a 500ms cooldown (`POST_STREAM_COOLDOWN_MS`). During cooldown, indexed waiters (panels waiting for their dedicated port) had to wait for the full cooldown before getting the port. Meanwhile, generic/background tasks could steal the port the moment it exited cooldown.
- **Why:** The cooldown was unconditional — it didn't check if an indexed waiter was already waiting for that specific port. Cooldown exists to let RovoDev Serve clear its internal turn state, but if a panel is waiting for its dedicated port, it should get priority over the cooldown delay.
- **Fix:** In `createHandle.release()` inside `backend/lib/rovodev-pool.js`, skip cooldown and transition directly to `available` when an indexed waiter is pending for the released port. The panel gets the port immediately instead of waiting 500ms.

### 2026-02-22 - Generic waiters must not steal ports with pending indexed waiters
- **What happened:** Background tasks (suggestions, title generation, classifiers) used `acquire()` or `acquireExcluding()` to get ports. These generic acquisition paths could grab any available port, including ports that had indexed waiters (panels) waiting for them.
- **Why:** The `tryNotifyWaiter()`, `tryNotifyExcludingWaiter()`, `acquire()` fast-path, and `acquireExcluding()` fast-path did not check if an indexed waiter was pending for the port. A background task could steal a pinned port from a panel, causing the panel's next message to 409.
- **Fix:** Updated all four paths in `backend/lib/rovodev-pool.js` to skip ports that have pending indexed waiters. Generic/excluding waiters now only get ports that no indexed waiter is specifically waiting for.

### 2026-02-22 - Pre-stream classifiers must not use panel's pinned port
- **What happened:** The smart intent classifier (`classifySmartGenerationIntent`), smart clarification gate, and genui generation all called `generateTextViaGateway()` with the panel's `portIndex`. This sent classification messages to the panel's dedicated RovoDev Serve instance, occupying the port and polluting the chat session. When the main `streamViaRovoDev()` followed, the port was still busy from the classifier → 409.
- **Why:** `buildSmartGenerationGatewayOptions({ portIndex })` blindly forwarded the panel's `portIndex` to all pre-stream background calls. These are not the panel's actual conversation — they're throwaway classification tasks.
- **Fix:** 
  - Added `excludePinnedPorts` option to `buildSmartGenerationGatewayOptions()` in `backend/lib/smart-generation-gateway-options.js`.
  - Updated all 3 pre-stream callers in `backend/server.js` (smart intent classifier, smart clarification classifier, genui generation) to use `excludePinnedPorts: true` instead of `portIndex`.
  - Updated `generateTextViaGateway()` and `generateTextViaRovoDev()` to accept and forward the `excludePinnedPorts` option.
  - **Rule:** Pre-stream classification/background tasks should NEVER use the panel's `portIndex`. Use `excludePinnedPorts: true` so they route to non-pinned ports (indices 3+).

### 2026-02-22 - Suggestions must use panel's own pinned port, not background pool
- **What happened:** After a panel's stream completed, `generateSuggestedQuestions` called `generateTextViaRovoDev` without any port targeting. With 3 panels completing simultaneously, all 3 suggestion tasks competed for the 3 non-pinned ports. If those were busy, suggestions fell back to pinned ports → 409.
- **Why:** Suggestion generation was treated as a generic background task instead of a continuation of the panel's chat session.
- **Fix:** Updated `generateSuggestedQuestions` in `backend/server.js` to accept `portIndex` and pass it to `generateTextViaRovoDev`. Post-stream suggestion calls now use the panel's own `portIndex`, so each panel generates suggestions on its own dedicated port after the stream releases it and cooldown finishes. No port contention.
- **Failed approach:** Initially tried an `onComplete` callback on `streamViaRovoDev` to generate suggestions before releasing the handle. This deadlocked because `generateTextViaRovoDev` inside `onComplete` tried to re-acquire the port through the pool while the handle was still held.
- **Rule:** Post-stream tasks that are logically part of the same panel's session should use the panel's `portIndex` with `wait-for-turn`. Don't try to hold the port handle open for post-stream tasks — the pool re-acquisition with `portIndex` naturally queues correctly after cooldown.

### 2026-02-22 - Skip suggestions when a newer request supersedes the current one
- **What happened:** User sends "hello1", then types "hello2" while "hello1" is streaming. The backend sees `hasQueuedPrompts: false` for the "hello1" request (because "hello2" wasn't queued yet at request time). After "hello1" stream completes, suggestions are generated — wasting a port turn and causing 409 when "hello2" tries to use the same port.
- **Why:** `hasQueuedPrompts` is a request-time snapshot from the frontend. It can't predict future messages the user will type during the stream.
- **Fix:** Added `portIndexRequestTimestamps` map in `backend/server.js` that records `Date.now()` when each request starts for a given `portIndex`. Before generating suggestions, the handler checks if the stored timestamp still matches — if a newer request has arrived for the same `portIndex`, suggestions are skipped.
  ```
  Panel 0: "hello1" starts (ts=1000) → streams → done
  Panel 0: "hello2" starts (ts=2000) → updates map
  Panel 0: "hello1" finishes → map.get(0)=2000 ≠ 1000 → SKIP suggestions ✅
  Panel 0: "hello2" finishes → map.get(0)=2000 = 2000 → generate suggestions ✅
  ```
- **Rule:** For post-stream optional tasks (suggestions, question cards), always check request staleness before proceeding. Use a timestamp map keyed by `portIndex` to detect superseded requests.

### 2026-02-22 - Background fallback timeout increased to 120s
- **What happened:** `BACKGROUND_ON_PINNED_PORT_TIMEOUT_MS` was set to 15s. When all non-pinned ports were busy and a background task fell back to a pinned port, it would fail after 15s.
- **Why:** 15s was too aggressive for suggestions and other background tasks that are acceptable to arrive late. Users expect suggestions to appear eventually, not fail silently.
- **Fix:** Increased `BACKGROUND_ON_PINNED_PORT_TIMEOUT_MS` from 15s to 120s in `backend/lib/rovodev-gateway.js`. Background tasks that fall back to pinned ports now wait patiently up to 2 minutes.
- **Rule:** Background tasks should have generous timeouts — it's better to deliver suggestions late than not at all.

### 2026-02-22 - Fail-fast on 409 — eliminate retry loop for interactive chat
- **What happened:** Despite all previous fixes (wait-for-turn, cooldown bypass, excludePinnedPorts, staleness detection), the 409 conflict count kept escalating — logs showed `conflict 467` and climbing. The `retryChatInProgress` loop hammered stuck ports every 250ms–1000ms for up to 10 minutes before triggering recovery.
- **Why:** The retry loop assumes stuck turns will clear on their own. They don't. The most common root cause: when a client disconnects mid-stream (user navigates away, sends a new message), the SSE connection was aborted but **no `POST /v3/cancel` was sent to RovoDev Serve** — it continued processing the abandoned turn. The next request for that port hit 409, entered the retry loop, and hammered it for minutes.
- **Fix:**
  - **Cancel-on-abort** (root cause fix): When `signal` fires in the `streamViaRovoDev` attempt function, the abort handler now sends `POST /v3/cancel` to RovoDev Serve (fire-and-forget) before resolving. This prevents stale turns from causing future 409s.
  - **Single attempt for wait-for-turn**: Removed `retryChatInProgress` from the `streamViaRovoDev` wait-for-turn path. One attempt — if 409, fail immediately. No retry loop, no escalating conflict counts, no 10-minute windows.
  - **Fail-fast with restart**: On 409 in wait-for-turn mode: cancel the stuck turn, drain all queued `indexedWaiters` for that port index (via new `pool.drainIndexedWaiters(index)` method), mark port unhealthy, throw `ROVODEV_PORT_STUCK` error.
  - **Server.js handler**: Catches `ROVODEV_PORT_STUCK`, tells the user "This request couldn't be completed — please try again", triggers `restartRovoDevPort` immediately. Exits the tool-first retry loop.
  - **`generateTextViaRovoDev` also simplified**: Wait-for-turn pool path uses single attempt + fail-fast (same pattern). No-pool path uses single attempt inside `enqueueTextGeneration`.
  - **Dead code removed**: `emitConflictWaitStatus`, `retryOccurred`, `onRetry`/`onRetryProgress` callbacks for interactive chat — all dead since there are no retries.
  - **Cancel-and-retry preserved**: Background tasks (classifiers, GenUI) still use `retryChatInProgress` with `cancelOnConflict: true` — retries are acceptable for non-critical tasks.
- **Rule:** For interactive chat, never retry on 409 — fail fast and restart the port. The pool's `acquireByIndex` already serializes legitimate ordering; retries are a second layer that just hammers stuck ports. Use cancel-on-abort to prevent stale turns from occurring in the first place.

### 2026-02-22 - Stale abort listener sends spurious cancels + cooldown bypass causes 409
- **What happened:** Ports were becoming unhealthy even with simple questions. Two root causes discovered:
  1. **Stale abort listener**: In `streamViaRovoDev`'s `attempt` function, the `onAbort` handler registered on the signal was never cleaned up when the stream completed normally. After the stream finished, the port was released, suggestions ran, `data-turn-complete` was written, the SSE response ended, `req.on("close")` fired, `abortController.abort()` triggered the stale `onAbort`, which sent `POST /v3/cancel` to the port — interfering with whatever was currently starting on it.
  2. **Cooldown bypass for indexed waiters**: The pool's `release()` skipped the 500ms cooldown when an indexed waiter was pending. This meant the next caller got the port with 0ms delay, before RovoDev Serve had cleared its internal turn state, causing 409.
- **Fix:**
  - `backend/lib/rovodev-gateway.js`: Hoisted `onAbort` reference. Added `signal.removeEventListener("abort", onAbort)` in both `onDone` and `onError` callbacks before resolving/rejecting, preventing stale cancels after normal stream completion.
  - `backend/lib/rovodev-pool.js`: Removed the indexed-waiter fast path that skipped cooldown. All releases now enter the cooldown path when `cooldownMs > 0`. Indexed waiters still get priority via `tryNotifyIndexedWaiter()` which runs first in `makeAvailable()`, but only after the cooldown completes.
- **Rule:** Always clean up event listeners when the operation they guard completes normally. Replace blind cooldown timers with deterministic readiness probes — with fail-fast, a 409 after cooldown kills the port, so the cooldown must be reliable, not a guess.

### 2026-02-22 - Replace blind cooldown with readiness probe
- **What happened:** The 500ms `POST_STREAM_COOLDOWN_MS` was a blind guess. With fail-fast, if the cooldown isn't long enough and RovoDev Serve is still clearing its turn state, the next request gets 409 → port marked unhealthy → restart. No second chance.
- **Why:** The cooldown was designed before fail-fast. With retry loops, a short cooldown was fine — the retry would eventually succeed. With fail-fast, the first 409 is fatal, so the readiness check must be deterministic, not time-based.
- **Fix:** Added `waitForReady` option to `createRovoDevPool`. When provided, it replaces the blind `setTimeout(cooldownMs)` with an injectable async function. In `server.js`, implemented `waitForPortReady(port)`:
  1. Wait the minimum 500ms first (RovoDev always needs a brief moment after SSE close).
  2. Probe with `POST /v3/cancel` — returns 200 if idle (no-op), fails if still clearing.
  3. Retry the probe every 100ms up to 20 attempts (2s max).
  4. If all probes fail, the pool marks the port unhealthy (periodic health check recovers later).
- **Rule:** With fail-fast error handling, never rely on blind timers for inter-operation delays. Use deterministic readiness checks — probe the service until it confirms it's ready.

### 2026-02-22 - Port handle leak due to `let` block scoping in `streamViaRovoDev`
- **What happened:** Ports became permanently "busy" after the first message. The second message always failed with "RovoDev port 8000 (index 0) is busy — timed out after 30s" regardless of wait time.
- **Why:** `let portStuck = false;` was declared inside the `try` block but referenced in the `finally` block. JavaScript `let` is block-scoped — `try` and `finally` are separate blocks. The `finally` block threw `ReferenceError: portStuck is not defined`, which prevented `handle.release()` from ever executing. The first message appeared to work because text was already streamed to the client via `onTextDelta` before `finally` ran, but the port was never released. Health checks skip busy ports, so no recovery was possible. `generateTextViaRovoDev` did not have this bug — its `let portKnownStuck` was correctly declared before the `try`.
- **Fix:** Moved `let portStuck = false;` from inside the `try` block to before it in `backend/lib/rovodev-gateway.js`, matching the pattern used by `generateTextViaRovoDev`.
- **Rule:** When a variable must be shared between `try` and `finally` (or `catch`) blocks, declare it before the `try`. `let`/`const` in `try` are not visible in `finally` — only `var` (function-scoped) would accidentally work, but the correct fix is hoisting the `let` declaration.

---

## Summary of all port-related files changed

| File | Changes |
|------|---------|
| `backend/lib/rovodev-pool.js` | Removed cooldown bypass for indexed waiters (always respect cooldown); added `waitForReady` injectable readiness probe option; generic/excluding waiters respect indexed waiter priority; `drainIndexedWaiters(index)` method to reject all queued requests for a stuck port |
| `backend/lib/rovodev-gateway.js` | Abort listener cleanup in `onDone`/`onError` (prevents stale cancels); `excludePinnedPorts` + `port` params on `generateTextViaRovoDev`; `onComplete` callback on `streamViaRovoDev`; increased `BACKGROUND_ON_PINNED_PORT_TIMEOUT_MS` to 120s; **fail-fast single attempt for wait-for-turn** (removed `retryChatInProgress` from interactive chat path); cancel-on-abort in stream abort handler; `createPortStuckError` error constructor; `generateTextViaRovoDev` wait-for-turn also simplified to single attempt; **`let portStuck` hoisted from inside `try` to before `try`** (fixes handle leak that made ports permanently busy) |
| `backend/lib/smart-generation-gateway-options.js` | Added `excludePinnedPorts` option |
| `backend/server.js` | Pre-stream classifiers use `excludePinnedPorts: true`; `portIndexRequestTimestamps` map for staleness detection; suggestions use panel's `portIndex`; `generateTextViaGateway` accepts `excludePinnedPorts`; **`ROVODEV_PORT_STUCK` error handler** with user notification + immediate port restart; removed dead retry callback code (`emitConflictWaitStatus`, `retryOccurred`, `onRetry`/`onRetryProgress`) |
