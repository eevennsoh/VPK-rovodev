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

### 2026-03-04 - Clean up lib data/types when removing a feature
- **What happened:** Features (time-tracking, inventory, it-assets, asset-requests) were removed from `app/` and `components/templates/` but their supporting files in `lib/` (types, seed data), `hooks/` (storage hooks), `components/blocks/`, and `components/ui-ai/` were left behind as dead code.
- **Why:** Deletion only targeted the route and template entry points without tracing the full dependency chain downward.
- **Rule:** When removing a feature/template, trace and remove the full dependency chain: route files → template components → block components → hooks → lib types → lib seed data → ui-ai cards. Run `pnpm tsc --noEmit` after to catch any remaining broken imports.

### 2026-03-07 - Use local avatar-user assets for demo avatar swaps
- **What happened:** A demo avatar replacement initially updated only the primary `shadcn` face and introduced a new path under `public/avatar-human`, while other demo avatars still pointed at remote GitHub images.
- **Why:** The implementation did not first inspect the existing local avatar catalog or follow the user's intent to keep demo avatars sourced from `public/avatar-user`.
- **Rule:** When replacing demo avatar faces, inspect `public/avatar-user` first and convert the full demo set off remote avatar URLs in the same pass. Do not introduce a new avatar location unless the existing avatar catalog is actually insufficient.

### 2026-03-08 - Respect env.local as the source of truth for configured models
- **What happened:** The speech transcription helper hardcoded a default STT model in code even though `GOOGLE_STT_MODEL` was already defined in `.env.local`.
- **Why:** The implementation mixed runtime fallback policy into a config-driven codepath instead of treating local env as authoritative.
- **Rule:** When a model/provider is already configured in `.env.local`, do not hardcode a replacement default in code. Read the configured env value directly and fail loudly if the required env var is missing.
