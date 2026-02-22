# Lessons

Running log of corrections and patterns learned during sessions.
Distill recurring patterns into permanent rules in CLAUDE.md or .claude/rules/.
Mark promoted entries with `[Promoted]` prefix — see vpk-lesson skill for details.

---

## 2026-02-21

- Correction: wave shimmer behavior should be implemented in shared `components/ui-ai/shimmer.tsx` (not bespoke logic inside `Reasoning`) so it can be reused consistently.
- Prevention rule: when enabling per-character motion in text components, do not rely on `truncate`/`overflow-hidden` containers; wave mode must preserve `overflow-visible` to avoid glyph clipping.

### 2026-02-22 - Use wait-for-turn over cancel-and-retry for 409 conflicts
- **What happened:** The cancel-and-retry conflict strategy for `streamViaRovoDev()` caused destructive cascades in multiports — panels aggressively canceled each other's turns, pre-canceled sessions that weren't stale, and triggered force port recovery (SIGTERM/SIGKILL). Even after killing all ports and restarting, the demo was unusable.
- **Why:** Cancel-and-retry is wrong for shared ports. `generateTextViaRovoDev()` already had `"wait-for-turn"` but `streamViaRovoDev()` only supported `cancelOnConflict`/`cancelAfterMs` with no patient queue option.
- **Rule:** Use `conflictPolicy: "wait-for-turn"` for all interactive chat streaming. Skip pre-cancel in wait-for-turn mode. Let the retry loop wait with bounded backoff and a 10-minute patience budget. Show "Queued — waiting for turn" in the reasoning indicator.
