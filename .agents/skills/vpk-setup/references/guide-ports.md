# Port Isolation and 409 Error Prevention

How the RovoDev port pool prevents "chat already in progress" (409) errors in multiport setups.

## Architecture

```text
Panel A → port 8000 (pinned)     ┐
Panel B → port 8001 (pinned)     ├─ Interactive chat (indices 0-2)
Panel C → port 8002 (pinned)     ┘
Background tasks → port 8003-8005  ─ Suggested questions, clarification cards
```

Each rovodev serve instance is single-threaded for chat — it handles one `set_chat_message` + `stream_chat` pair at a time. A second message during an active turn returns HTTP 409.

## Root Causes and Fixes

### 1. Background tasks steal pinned ports

**Problem:** After a chat stream finishes, `generateSuggestedQuestions()` calls `acquirePort()` with no port or portIndex. The generic `_pool.acquire()` scans left-to-right and grabs the first available port — often a pinned panel port. This either hits 409 (port still clearing its turn) or injects one panel's conversation into another panel's rovodev session.

**Fix:** `acquireExcluding()` + `setPinnedPortCount(3)`. Background tasks call `acquirePort({ excludePinnedPorts: true })`, which skips indices 0-2 and only uses ports 8003-8005.

**Files:** `rovodev-pool.js` (`acquireExcluding`), `rovodev-gateway.js` (`setPinnedPortCount`, `excludePinnedPorts` option), `server.js` (`PINNED_PORT_COUNT` constant)

### 2. Port release races with rovodev internal state

**Problem:** `streamViaRovoDev()` releases the port handle in its `finally` block immediately when the SSE stream ends. But rovodev serve hasn't finished its internal turn cleanup yet. The next caller acquires the same port milliseconds later and hits 409.

**Fix:** `cooldownMs: 200` on the pool. Released ports enter a `"cooldown"` status for 200ms before becoming `"available"`, giving rovodev serve time to clear its turn state.

**Files:** `rovodev-pool.js` (`cooldownMs` option, `cooldown` status in `createHandle`), `server.js` (`POST_STREAM_COOLDOWN_MS` constant passed to `createRovoDevPool`)

### 3. Pool-mode generateTextViaRovoDev had no 409 retry

**Problem:** The pool code path in `generateTextViaRovoDev()` assumed "we own the port exclusively, so 409 is impossible" and called `sendMessageSync()` directly with no retry. Startup ghost turns and cooldown races can still produce 409s.

```javascript
// Before (no retry)
if (_pool) {
    return await sendMessageSync(fullMessage, syncOptions);
}
```

**Fix:** Wrapped the pool path in `retryChatInProgress()` with a bounded 5-second timeout. Transient 409s from startup or cooldown races get retried instead of failing immediately.

**Files:** `rovodev-gateway.js` (pool path in `generateTextViaRovoDev`)

### 4. Pool recreation destroys active handles

**Problem:** Every 60 seconds, `refreshRovoDevAvailability()` called `_rovoDevPool.shutdown()` (marks all ports available, rejects waiters) then created a brand new pool. In-flight handles from the old pool became orphaned — their `release()` calls mutated dead objects. The new pool marked the same ports as available, so a new request could acquire a port that was actually still busy in rovodev serve.

**Fix:** Replaced destroy-recreate with in-place `updatePorts()`. This method keeps busy/cooldown entries untouched, removes only idle entries for ports no longer healthy, adds new healthy ports, and never orphans in-flight handles.

**Files:** `rovodev-pool.js` (`updatePorts` method), `server.js` (`refreshRovoDevAvailability` uses `updatePorts` instead of `shutdown` + `createRovoDevPool`)

### 5. tmux mode has no process supervisor

**Problem:** Port recovery (`restartRovoDevPort`) kills the rovodev serve process via `lsof` + SIGTERM/SIGKILL, then polls for a replacement PID. With `pnpm run rovodev` (non-tmux), `dev-rovodev.js` auto-restarts killed children. But with `pnpm run rovodev:tmux`, `remain-on-exit on` keeps dead panes visible without restarting — the port dies permanently.

**Fix:** Added `supervisorMode` param. When `ROVODEV_SUPERVISOR=tmux` (set via env var in `dev-tmux.sh`), recovery skips the process kill, sends a cancel request, waits a polling interval, then polls health until the turn clears or times out.

**Files:** `rovodev-port-recovery.js` (`supervisorMode` param, tmux guard), `dev-tmux.sh` (`ROVODEV_SUPERVISOR=tmux` env var on backend pane)

### 6. Startup ghost turns

**Problem:** Fresh rovodev serve instances sometimes have an initialization phase (agent setup, MCP server connections) that looks like an active chat turn. Health checks pass, but the first `set_chat_message` hits 409.

**Fix:** Mitigated by the combination of the 200ms cooldown (root cause 2) and the bounded 409 retry (root cause 3). No separate fix needed.

## Key Constants

| Constant | Value | Location | Purpose |
|---|---|---|---|
| `POST_STREAM_COOLDOWN_MS` | 200 | `server.js` | Delay before released port becomes available |
| `PINNED_PORT_COUNT` | 3 | `server.js` | Number of leading pool indices reserved for panels |
| Pool retry timeout | 5000ms | `rovodev-gateway.js` | Max 409 retry time for pool-mode background tasks |

## Pool Status Lifecycle

```text
available → busy (acquired) → cooldown (released, 200ms timer) → available
                             ↘ unhealthy (health check failed)
```

## How a Request Flows (After Fix)

1. User types in Panel A
2. `streamViaRovoDev` acquires port 8000 via `acquireByIndex(0)`
3. Streams response on port 8000
4. `finally` block releases handle → port 8000 enters 200ms cooldown
5. `generateSuggestedQuestions` calls `acquirePort({ excludePinnedPorts: true })`
6. Pool skips indices 0-2, acquires port 8003
7. If port 8003 has a transient 409 → retries for up to 5 seconds
8. Port 8000 cooldown expires → available for Panel A's next message
9. Panels B and C were never touched

## Debugging

Check pool status via the `/api/health` endpoint or backend startup logs:

```
[ROVODEV] Pool initialized: 6 ports (8000, 8001, 8002, 8003, 8004, 8005)
ROVODEV_POOL: 6 ports (8000, 8001, 8002, 8003, 8004, 8005)
```

If 409 errors persist:

1. Check if all 6 ports are healthy — look for `[ROVODEV-POOL] Port XXXX is unhealthy` in logs
2. Check if background tasks are using non-pinned ports — look for `generateTextViaRovoDev[pool]` log prefix
3. In tmux mode, check that `ROVODEV_SUPERVISOR=tmux` is set — run `env | grep ROVODEV` in the backend pane
4. If a port is permanently stuck, restart `pnpm run rovodev:tmux` for a fresh session
