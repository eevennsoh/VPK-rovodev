# Lessons

Running log of corrections and patterns learned during sessions.
Distill recurring patterns into permanent rules in CLAUDE.md or .claude/rules/.
Mark promoted entries with `[Promoted]` prefix — see vpk-lesson skill for details.

---

### 2026-02-16 - cmdk scrollIntoView scrolls entire page when rendered inline
- **What happened:** The homepage preview grid scrolled ~3456px down on every page load because the `CommandDemo` (cmdk `Command` component) was rendered directly in a grid card, and cmdk's layout effect called `scrollIntoView({block:"nearest"})` on the auto-selected first item, scrolling the document to bring the off-screen card into view.
- **Why:** cmdk always calls `scrollIntoView` on the selected item during mount via `useLayoutEffect`. When a Command component is rendered inline (not in a dialog/iframe) and is below the fold, `scrollIntoView` propagates through all ancestors — `overflow: hidden` and `overflow: clip` on intermediate containers do NOT prevent it from scrolling the document.
- **Rule:** When embedding cmdk `Command` components in non-interactive preview contexts (e.g. grid cards, thumbnails), pass `value="__preview__" onValueChange={() => {}}` to prevent auto-selection and the resulting `scrollIntoView`. Never assume `overflow: clip` or `overflow: hidden` will contain `scrollIntoView` — it always walks up to the document.
