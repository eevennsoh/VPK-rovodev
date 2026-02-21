# Lessons

Running log of corrections and patterns learned during sessions.
Distill recurring patterns into permanent rules in CLAUDE.md or .claude/rules/.
Mark promoted entries with `[Promoted]` prefix — see vpk-lesson skill for details.

---

## 2026-02-21

- Correction: wave shimmer behavior should be implemented in shared `components/ui-ai/shimmer.tsx` (not bespoke logic inside `Reasoning`) so it can be reused consistently.
- Prevention rule: when enabling per-character motion in text components, do not rely on `truncate`/`overflow-hidden` containers; wave mode must preserve `overflow-visible` to avoid glyph clipping.
